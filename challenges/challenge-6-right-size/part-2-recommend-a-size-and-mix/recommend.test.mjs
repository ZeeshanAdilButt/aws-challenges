import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse, burstableUnsafe, purchaseMix } from './recommend.mjs';

const rows = analyse();
const by = (name) => rows.find((r) => r.name === name);

test('the three services get a recommendation that fits', () => {
  for (const r of rows) assert.notEqual(r.rec.name, null, r.name);
  assert.equal(by('api').rec.name, 'm7g.large');
  assert.equal(by('admin').rec.name, 'c7g.large');
});

test('every recommendation costs less than today', () => {
  for (const r of rows) assert.ok(r.resized < r.before, r.name);
});

test('purchaseMix: the floor is committed for the whole month', () => {
  assert.deepEqual(purchaseMix([2, 2, 3, 3], false), { commit: 1460, spot: 0, onDemand: 365 });
});

test('purchaseMix: spot only when the work can be retried', () => {
  assert.deepEqual(purchaseMix([1, 1, 3, 3], true), { commit: 730, spot: 730, onDemand: 0 });
  assert.equal(purchaseMix([1, 1, 3, 3], true).onDemand, 0);
});

test('purchaseMix: a flat service has nothing above the floor', () => {
  assert.deepEqual(purchaseMix([1, 1, 1], false), { commit: 730, spot: 0, onDemand: 0 });
});

test('only the worker uses Spot', () => {
  assert.ok(by('worker').mix.spot > 0);
  assert.equal(by('api').mix.spot, 0);
  assert.equal(by('admin').mix.spot, 0);
});

test('the best case is below the list price', () => {
  for (const r of rows) assert.ok(r.best <= r.resized);
});

test('burstable is unsafe for the worker (hot hours) and safe for the admin tool', () => {
  assert.equal(by('worker').burstable?.unsafe, true);
  assert.equal(by('admin').burstable?.unsafe, false);
});

test('burstableUnsafe looks at hours above 60 percent', () => {
  assert.equal(burstableUnsafe({ hoursAbove60: 0 }), false);
  assert.equal(burstableUnsafe({ hoursAbove60: 1 }), true);
});
