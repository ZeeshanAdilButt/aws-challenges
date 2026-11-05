import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badDeploy, breakerThreshold, plan } from './rollout.js';

test('4 tasks, 100 and 200: one round of 4 and 4', () => {
  assert.deepEqual(plan({ desired: 4, minHealthyPercent: 100, maxPercent: 200 }), { rounds: [{ start: 4, stop: 4 }], done: true, minH: 4, maxT: 8 });
});
test('4 tasks, 100 and 100: stuck, nothing can move', () => {
  const r = plan({ desired: 4, minHealthyPercent: 100, maxPercent: 100 });
  assert.equal(r.stuck, true);
  assert.equal(r.done, false);
  assert.deepEqual(r.rounds, []);
});
test('4 tasks, 50 and 100: stop two, then swap two at a time', () => {
  assert.deepEqual(plan({ desired: 4, minHealthyPercent: 50, maxPercent: 100 }).rounds, [{ start: 0, stop: 2 }, { start: 2, stop: 2 }, { start: 2, stop: 0 }]);
});
test('10 tasks, 100 and 150: two rounds of five', () => {
  assert.deepEqual(plan({ desired: 10, minHealthyPercent: 100, maxPercent: 150 }).rounds, [{ start: 5, stop: 5 }, { start: 5, stop: 5 }]);
});
test('10 tasks, 50 and 200: one round', () => {
  const r = plan({ desired: 10, minHealthyPercent: 50, maxPercent: 200 });
  assert.deepEqual(r.rounds, [{ start: 10, stop: 10 }]);
  assert.equal(r.minH, 5);
  assert.equal(r.maxT, 20);
});
test('3 tasks, 66 and 133: the minimum rounds up and the maximum rounds down', () => {
  const r = plan({ desired: 3, minHealthyPercent: 66, maxPercent: 133 });
  assert.equal(r.minH, 2);
  assert.equal(r.maxT, 3);
  assert.deepEqual(r.rounds, [{ start: 0, stop: 1 }, { start: 1, stop: 1 }, { start: 1, stop: 1 }, { start: 1, stop: 0 }]);
});
test('1 task, 100 and 200: start one, stop one', () => {
  assert.deepEqual(plan({ desired: 1, minHealthyPercent: 100, maxPercent: 200 }).rounds, [{ start: 1, stop: 1 }]);
});
test('2 tasks, 0 and 100: everything stops first, an outage window', () => {
  assert.deepEqual(plan({ desired: 2, minHealthyPercent: 0, maxPercent: 100 }).rounds, [{ start: 0, stop: 2 }, { start: 2, stop: 0 }]);
});

test('breaker threshold: half of desired, rounded up, between 3 and 200', () => {
  assert.equal(breakerThreshold(25), 13);
  assert.equal(breakerThreshold(1), 3);
  assert.equal(breakerThreshold(400), 200);
});
test('a healthy rollout completes and never drops below full capacity with 100 and 200', () => {
  const r = badDeploy({ desired: 6, minHealthyPercent: 100, maxPercent: 200, failingStarts: 0 });
  assert.equal(r.state, 'COMPLETED');
  assert.equal(r.minCapacityPercent, 100);
});
test('a bad image with room to spare trips the breaker and keeps full capacity', () => {
  const r = badDeploy({ desired: 6, minHealthyPercent: 100, maxPercent: 200 });
  assert.equal(r.state, 'ROLLED_BACK');
  assert.equal(r.failures, 3);
  assert.equal(r.minCapacityPercent, 100);
  assert.equal(r.secondsBelowFull, 0);
});
test('a bad image with 50 and 100 costs capacity before the breaker trips', () => {
  const r = badDeploy({ desired: 6, minHealthyPercent: 50, maxPercent: 100 });
  assert.equal(r.state, 'ROLLED_BACK');
  assert.equal(r.minCapacityPercent, 50);
  assert.ok(r.secondsBelowFull > 0);
});
test('with 50 and 100 and no breaker the service stays at half capacity', () => {
  const r = badDeploy({ desired: 6, minHealthyPercent: 50, maxPercent: 100, breaker: false });
  assert.equal(r.state, 'STUCK');
  assert.equal(r.ongoing, true);
});
test('without the breaker a bad deploy with no room never finishes', () => {
  const r = badDeploy({ desired: 6, minHealthyPercent: 100, maxPercent: 100, breaker: false });
  assert.equal(r.state, 'STUCK');
});
