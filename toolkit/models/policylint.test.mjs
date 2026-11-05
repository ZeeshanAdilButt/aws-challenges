import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintPolicy } from './policylint.js';

const st = (extra) => ({ Version: '2012-10-17', Statement: [{ Sid: 'S', Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::b/*', ...extra }] });

test('a narrow policy for one role is clean', () => assert.deepEqual(lintPolicy(st({ Principal: { AWS: 'arn:aws:iam::123456789012:role/app' } })), []));
test('everyone with no condition is flagged', () => assert.deepEqual(lintPolicy(st({ Principal: '*' })).map((f) => f.rule), ['wildcard-principal']));
test('everyone with a condition is not flagged for the principal', () => assert.deepEqual(lintPolicy(st({ Principal: '*', Condition: { IpAddress: { 'aws:SourceIp': '203.0.113.0/24' } } })), []));
test('a service wildcard action is flagged', () => assert.ok(lintPolicy(st({ Principal: { AWS: 'x' }, Action: 's3:*' })).some((f) => f.rule === 'wildcard-action')));
test('a star resource is flagged', () => assert.ok(lintPolicy(st({ Principal: { AWS: 'x' }, Resource: '*' })).some((f) => f.rule === 'wildcard-resource')));
test('a deny statement is never flagged', () => assert.deepEqual(lintPolicy(st({ Effect: 'Deny', Principal: '*', Action: 's3:*', Resource: '*' })), []));
test('the TLS rule can be required', () => {
  assert.equal(lintPolicy(st({ Principal: { AWS: 'x' } }), { requireTlsDeny: true }).at(-1).rule, 'no-tls-deny');
  const tls = { Version: '2012-10-17', Statement: [{ Sid: 'T', Effect: 'Deny', Principal: '*', Action: 's3:*', Resource: '*', Condition: { Bool: { 'aws:SecureTransport': 'false' } } }] };
  assert.deepEqual(lintPolicy(tls, { requireTlsDeny: true }), []);
});
