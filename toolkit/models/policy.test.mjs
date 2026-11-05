import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, wildcardMatch, conditionMatches, statementMatches } from './policy.js';

const allow = (Action, Resource, extra = {}) => ({ Effect: 'Allow', Action, Resource, ...extra });
const deny = (Action, Resource, extra = {}) => ({ Effect: 'Deny', Action, Resource, ...extra });
const doc = (...Statement) => ({ Version: '2012-10-17', Statement });
const req = (action, resource, context = {}) => ({ action, resource, context });

test('wildcards: * and ? and case rules', () => {
  assert.equal(wildcardMatch('s3:Get*', 's3:GetObject', true), true);
  assert.equal(wildcardMatch('s3:get*', 's3:GetObject', true), true);
  assert.equal(wildcardMatch('arn:aws:s3:::daftar/notes/*', 'arn:aws:s3:::daftar/notes/a/b.txt'), true);
  assert.equal(wildcardMatch('arn:aws:s3:::daftar/notes/*', 'arn:aws:s3:::daftar/exports/a'), false);
  assert.equal(wildcardMatch('file?.txt', 'file1.txt'), true);
  assert.equal(wildcardMatch('file?.txt', 'file12.txt'), false);
  assert.equal(wildcardMatch('a.b', 'axb'), false); // a dot is only a dot
});

test('an empty request is denied by default', () => {
  const result = evaluate(req('s3:GetObject', 'arn:aws:s3:::b/k'), []);
  assert.equal(result.decision, 'Deny');
  assert.equal(result.reason, 'no-allow');
});

test('a matching allow gives Allow and says which statement', () => {
  const policies = [doc(allow('s3:GetObject', 'arn:aws:s3:::b/*', { Sid: 'Read' }))];
  const result = evaluate(req('s3:GetObject', 'arn:aws:s3:::b/k'), policies);
  assert.deepEqual(result, { decision: 'Allow', reason: 'allowed', matched: { policy: 0, statement: 0, sid: 'Read' } });
});

test('explicit deny beats allow, wherever it sits', () => {
  const policies = [doc(allow('s3:*', '*')), doc(deny('s3:DeleteObject', 'arn:aws:s3:::b/*', { Sid: 'NoDelete' }))];
  const result = evaluate(req('s3:DeleteObject', 'arn:aws:s3:::b/k'), policies);
  assert.equal(result.decision, 'Deny');
  assert.equal(result.reason, 'explicit-deny');
  assert.equal(result.matched.policy, 1);
  assert.equal(evaluate(req('s3:GetObject', 'arn:aws:s3:::b/k'), policies).decision, 'Allow');
});

test('Action and Resource may be a string or a list', () => {
  const policies = [doc(allow(['sqs:SendMessage', 'sqs:GetQueueUrl'], ['arn:aws:sqs:us-east-1:123456789012:jobs']))];
  assert.equal(evaluate(req('sqs:GetQueueUrl', 'arn:aws:sqs:us-east-1:123456789012:jobs'), policies).decision, 'Allow');
  assert.equal(evaluate(req('sqs:PurgeQueue', 'arn:aws:sqs:us-east-1:123456789012:jobs'), policies).decision, 'Deny');
});

test('NotAction allows everything except the listed actions', () => {
  const statement = { Effect: 'Allow', NotAction: 'iam:*', Resource: '*' };
  assert.equal(statementMatches(statement, req('s3:GetObject', 'x')), true);
  assert.equal(statementMatches(statement, req('iam:CreateUser', 'x')), false);
});

test('conditions: StringEquals, StringLike, and several values are OR', () => {
  assert.equal(conditionMatches({ StringEquals: { 'aws:RequestedRegion': ['us-east-1', 'eu-west-1'] } }, { 'aws:RequestedRegion': 'eu-west-1' }), true);
  assert.equal(conditionMatches({ StringEquals: { 'aws:RequestedRegion': 'us-east-1' } }, { 'aws:RequestedRegion': 'ap-south-1' }), false);
  assert.equal(conditionMatches({ StringLike: { 's3:prefix': 'notes/*' } }, { 's3:prefix': 'notes/2026/a' }), true);
});

test('conditions: a missing key fails a positive operator and passes a negated one', () => {
  assert.equal(conditionMatches({ StringEquals: { 'aws:PrincipalTag/team': 'api' } }, {}), false);
  assert.equal(conditionMatches({ StringNotEquals: { 'aws:PrincipalTag/team': 'api' } }, {}), true);
});

test('conditions: Bool and IP ranges', () => {
  assert.equal(conditionMatches({ Bool: { 'aws:MultiFactorAuthPresent': 'true' } }, { 'aws:MultiFactorAuthPresent': 'true' }), true);
  assert.equal(conditionMatches({ Bool: { 'aws:MultiFactorAuthPresent': 'true' } }, { 'aws:MultiFactorAuthPresent': 'false' }), false);
  assert.equal(conditionMatches({ IpAddress: { 'aws:SourceIp': '10.20.0.0/16' } }, { 'aws:SourceIp': '10.20.4.9' }), true);
  assert.equal(conditionMatches({ IpAddress: { 'aws:SourceIp': '10.20.0.0/16' } }, { 'aws:SourceIp': '203.0.113.9' }), false);
  assert.equal(conditionMatches({ NotIpAddress: { 'aws:SourceIp': '10.20.0.0/16' } }, { 'aws:SourceIp': '203.0.113.9' }), true);
});

test('an unknown operator is an error, not a silent pass', () => {
  assert.throws(() => conditionMatches({ DateGreaterThan: { 'aws:CurrentTime': '2026-01-01' } }, { 'aws:CurrentTime': '2026-02-01' }));
});

test('a deny with a condition only applies when the condition holds', () => {
  const policies = [doc(allow('s3:*', '*'), deny('s3:*', '*', { Condition: { Bool: { 'aws:SecureTransport': 'false' } } }))];
  assert.equal(evaluate(req('s3:GetObject', 'arn:aws:s3:::b/k', { 'aws:SecureTransport': 'false' }), policies).decision, 'Deny');
  assert.equal(evaluate(req('s3:GetObject', 'arn:aws:s3:::b/k', { 'aws:SecureTransport': 'true' }), policies).decision, 'Allow');
});

test('a boundary limits what an allow can do', () => {
  const policies = [doc(allow('*', '*'))];
  const boundary = doc(allow(['s3:*', 'sqs:*'], '*'));
  assert.equal(evaluate(req('s3:GetObject', 'arn:aws:s3:::b/k'), policies, boundary).decision, 'Allow');
  const outside = evaluate(req('iam:CreateUser', '*'), policies, boundary);
  assert.equal(outside.decision, 'Deny');
  assert.equal(outside.reason, 'outside-boundary');
});

test('a boundary alone grants nothing', () => {
  const boundary = doc(allow('s3:*', '*'));
  assert.equal(evaluate(req('s3:GetObject', 'arn:aws:s3:::b/k'), [], boundary).reason, 'no-allow');
});

test('an explicit deny inside the boundary also wins', () => {
  const policies = [doc(allow('*', '*'))];
  const boundary = doc(allow('*', '*'), deny('iam:*', '*'));
  const result = evaluate(req('iam:CreateUser', '*'), policies, boundary);
  assert.equal(result.reason, 'explicit-deny');
  assert.equal(result.matched.policy, 'boundary');
});
