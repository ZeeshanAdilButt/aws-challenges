import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billSpike, keyScope, natZoneLost, runbook, zoneLoss } from './break-it.mjs';

test('experiment 1: with a target of 40 percent a zone can be lost without dropping requests', () => {
  assert.equal(zoneLoss(40).dropped, 0);
});

test('experiment 1: with a target of 80 percent the same loss drops requests', () => {
  const z = zoneLoss(80);
  assert.ok(z.dropped > 0);
  assert.ok(z.dropPercent > 1);
});

test('one NAT gateway: the lost zone cuts the outside calls of the other zone', () => {
  assert.deepEqual(natZoneLost(), { before: 'ok', after: 'nat-missing' });
});

test('experiment 2: the leaked key is scoped from the dataset', () => {
  const s = keyScope().suspect;
  assert.equal(s.calls, 156);
  assert.equal(s.failed, 16);
  assert.equal(s.objectsRead, 120);
  assert.equal(s.instancesLaunched, 4);
});

test('experiment 3: three bill rows are flagged', () => {
  const b = billSpike();
  assert.deepEqual([...b.flagged].sort(), ['CloudWatch|DataProcessing-Bytes', 'ELB|LoadBalancerUsage', 'VPC|NatGateway-Bytes']);
});

test('the runbook has an entry for each experiment with a symptom, a check and a fix', () => {
  for (const name of ['zoneLost', 'leakedKey', 'billSpike']) {
    for (const part of ['symptom', 'check', 'fix']) assert.ok(typeof runbook[name]?.[part] === 'string' && runbook[name][part].length > 25, `${name} ${part}`);
  }
});

test('the leaked key runbook puts the key off before cleaning up', () => {
  const text = `${runbook.leakedKey?.fix}`.toLowerCase();
  assert.match(text, /key off|switch the key|deactivate|disable/);
});
