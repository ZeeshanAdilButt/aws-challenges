import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diff, explain, flagged } from './find-causes.mjs';

const rows = diff();

test('exactly three rows are flagged: NAT bytes, log processing and load balancer hours', () => {
  assert.deepEqual([...flagged()].sort(), ['CloudWatch|DataProcessing-Bytes', 'ELB|LoadBalancerUsage', 'VPC|NatGateway-Bytes']);
});

test('the biggest increase is NAT data processing', () => {
  assert.equal(rows[0].key, 'VPC|NatGateway-Bytes');
});

test('each finding has the dollars, a cause and a fix', () => {
  const found = explain(rows, flagged());
  assert.equal(found.length, 3);
  for (const f of found) {
    assert.ok(f.dollars > 50, f.key);
    assert.ok(typeof f.cause === 'string' && f.cause.length > 30, `${f.key} cause`);
    assert.ok(typeof f.fix === 'string' && f.fix.length > 30, `${f.key} fix`);
  }
});

test('the causes name the real reasons', () => {
  const by = Object.fromEntries(explain(rows, flagged()).map((f) => [f.key, `${f.cause} ${f.fix}`.toLowerCase()]));
  assert.match(by['VPC|NatGateway-Bytes'], /nat/);
  assert.match(by['VPC|NatGateway-Bytes'], /endpoint/);
  assert.match(by['CloudWatch|DataProcessing-Bytes'], /debug|log level|info/);
  assert.match(by['ELB|LoadBalancerUsage'], /idle|unused|no traffic|delete/);
});

test('the dollars match the diff', () => {
  const nat = explain(rows, ['VPC|NatGateway-Bytes'])[0];
  assert.equal(nat.dollars, rows.find((r) => r.key === 'VPC|NatGateway-Bytes').delta);
});
