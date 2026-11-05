import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESIRED, MUST_SERVE, OPTIONS, choose, describeOption } from './plan.mjs';

const described = OPTIONS.map((o) => describeOption(o));
const at = (min, max) => described.find((o) => o.min === min && o.max === max);

test('100 and 100 is stuck: no room to start and nothing may stop', () => {
  assert.equal(at(100, 100).stuck, true);
});

test('100 and 200 finishes in one round and never serves fewer than 6', () => {
  assert.equal(at(100, 200).rounds, 1);
  assert.equal(at(100, 200).lowestServing, 6);
  assert.equal(at(100, 200).mostRunning, 12);
});

test('100 and 150 needs two rounds of three', () => {
  assert.equal(at(100, 150).rounds, 2);
  assert.equal(at(100, 150).mostRunning, 9);
});

test('50 and 100 serves only 3 tasks at the lowest moment', () => {
  assert.equal(at(50, 100).lowestServing, 3);
});

test('0 and 100 stops everything first: nothing serves', () => {
  assert.equal(at(0, 100).lowestServing, 0);
});

test('choose keeps all six tasks and takes the fewest rounds', () => {
  assert.deepEqual(choose(described, MUST_SERVE), at(100, 200));
});

test('choose with a lower bar allows a cheaper option with fewer extra tasks', () => {
  const pick = choose(described, 3);
  assert.ok(pick.lowestServing >= 3);
  assert.ok(pick.rounds <= at(50, 100).rounds);
});

test('choose returns null when nothing is safe', () => {
  assert.equal(choose([at(100, 100), at(0, 100)], 6), null);
});

test('the service runs six tasks', () => assert.equal(DESIRED, 6));
