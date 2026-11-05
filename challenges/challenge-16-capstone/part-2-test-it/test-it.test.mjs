import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../../../toolkit/models/policy.js';
import { networkFromCode } from '../shared.mjs';
import { pathProbes, policyProbes, runPaths, runPolicies } from './test-it.mjs';

const network = networkFromCode();

test('the network read from the code passes every path probe', () => {
  const results = runPaths(network);
  assert.ok(results.length >= 8, 'write at least eight path probes');
  for (const r of results) assert.equal(r.got, r.expect, `${r.from} to ${r.to}:${r.port}`);
});

test('the path probes cover open and closed paths', () => {
  assert.ok(pathProbes.filter((p) => p.expect === 'ok').length >= 4);
  assert.ok(pathProbes.filter((p) => p.expect !== 'ok').length >= 4);
});

test('the key paths are tested: the internet cannot reach the app or the database, the database cannot go out', () => {
  const find = (from, to) => pathProbes.find((p) => p.from.startsWith(from) && p.to.startsWith(to));
  assert.equal(find('internet', 'alb')?.expect, 'ok');
  assert.ok(find('internet', 'app') && find('internet', 'app').expect !== 'ok');
  assert.ok(find('internet', 'db') && find('internet', 'db').expect !== 'ok');
  assert.ok(find('db', 'internet') && find('db', 'internet').expect !== 'ok');
});

test('a hole in the code is caught: the database group opened to the internet', () => {
  const broken = structuredClone(network);
  broken.securityGroups['sg-db'].ingress.push({ protocol: 'tcp', from: 5432, to: 5432, peer: '0.0.0.0/0' });
  broken.instances.db.publicIp = '54.0.2.99';
  const [r] = runPaths(broken, [{ from: 'internet:198.51.100.7', to: 'db', port: 5432, expect: 'no-public-ip' }]);
  assert.equal(r.match, false, 'the internet now reaches the database, so the probe must notice');
});

test('every policy probe gets the expected answer', () => {
  const results = runPolicies();
  assert.ok(results.length >= 12, 'write at least twelve policy probes');
  for (const r of results) assert.equal(r.got, r.expect, `${r.policy} ${r.action} ${r.resource}`);
});

test('the policy probes include allowed and refused requests, plain HTTP and a wrong folder', () => {
  assert.ok(policyProbes.filter((p) => p.expect === 'Allow').length >= 5);
  assert.ok(policyProbes.filter((p) => p.expect === 'Deny').length >= 7);
  assert.ok(policyProbes.some((p) => p.context?.['aws:SecureTransport'] === 'false'));
  assert.ok(policyProbes.some((p) => /exports\//.test(p.resource) || p.context?.['s3:prefix'] === 'exports/'));
});

test('a wide policy fails the refusal probes', () => {
  const wide = { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:*', 'sqs:*', 'iam:*'], Resource: '*' }] };
  const refused = policyProbes.filter((p) => p.expect === 'Deny' && p.context?.['aws:SecureTransport'] === 'true');
  const allowedByWide = refused.filter((p) => evaluate({ action: p.action, resource: p.resource, context: p.context ?? {} }, [wide]).decision === 'Allow');
  assert.ok(allowedByWide.length >= 4, 'the probes should catch a wide policy');
});
