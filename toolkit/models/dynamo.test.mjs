import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hotKeys, shardedKey, tally, topShare, unitsFor } from './dynamo.js';

test('write units cover 1 KB, rounded up', () => {
  assert.equal(unitsFor(0.5, 'write'), 1);
  assert.equal(unitsFor(1, 'write'), 1);
  assert.equal(unitsFor(1.1, 'write'), 2);
  assert.equal(unitsFor(400, 'write'), 400);
});
test('strong reads cover 4 KB, rounded up', () => {
  assert.equal(unitsFor(3.5, 'read-strong'), 1);
  assert.equal(unitsFor(4, 'read-strong'), 1);
  assert.equal(unitsFor(4.1, 'read-strong'), 2);
});
test('eventual reads cost half', () => assert.equal(unitsFor(4.1, 'read-eventual'), 1));
test('transactions cost double', () => {
  assert.equal(unitsFor(9, 'read-transactional'), 6);
  assert.equal(unitsFor(2.5, 'write-transactional'), 6);
});
test('an unknown kind throws', () => assert.throws(() => unitsFor(1, 'scan')));
test('hotKeys: an even load has no hot key', () => assert.deepEqual(hotKeys({ a: 10, b: 10, c: 10, d: 10 }, 2), []));
test('hotKeys: one key far above the share', () => assert.deepEqual(hotKeys({ a: 100, b: 10, c: 10, d: 10 }, 2), ['a']));
test('hotKeys: 100 is not above 2 times the share of 50', () => assert.deepEqual(hotKeys({ a: 100, b: 90, c: 5, d: 5 }, 2), []));
test('hotKeys: factor 3 and one key at 1000', () => assert.deepEqual(hotKeys({ a: 50, b: 50, c: 50, d: 1000 }, 3), ['d']));
test('hotKeys: two keys, factor 1.5', () => assert.deepEqual(hotKeys({ a: 40, b: 10 }, 1.5), ['a']));
test('hotKeys: empty and all zero give an empty list', () => {
  assert.deepEqual(hotKeys({}, 2), []);
  assert.deepEqual(hotKeys({ a: 0, b: 0 }, 2), []);
});
test('hotKeys: busiest first', () => assert.deepEqual(hotKeys({ a: 500, b: 900, c: 1, d: 1, e: 1, f: 1 }, 2), ['b', 'a']));
test('topShare and tally', () => {
  assert.equal(topShare(tally(['a', 'a', 'a', 'b'])), 0.75);
  assert.equal(topShare({}), 0);
});
test('a sharded key adds a suffix between 0 and shards - 1', () => {
  assert.equal(shardedKey('class-7', 10, 0), 'class-7#0');
  assert.equal(shardedKey('class-7', 10, 0.999), 'class-7#9');
});
