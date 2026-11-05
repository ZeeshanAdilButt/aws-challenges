import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hotKeys } from '../../../toolkit/models/dynamo.js';
import { HOT } from '../shared.mjs';
import { SHARDS, drill, shardKeyFor } from './key-fix.mjs';

const d = await drill();

test('shardKeyFor splits a hot key and leaves others alone', () => {
  assert.equal(shardKeyFor({ pk: 'class-7' }, ['class-7'], () => 0), 'class-7#0');
  assert.equal(shardKeyFor({ pk: 'class-7' }, ['class-7'], () => 0.99), `class-7#${SHARDS - 1}`);
  assert.equal(shardKeyFor({ pk: 'class-100' }, ['class-7'], () => 0.5), 'class-100');
});

test('before the fix class-7 is hot; after the fix no key is', () => {
  assert.deepEqual(d.hot, [HOT]);
  assert.deepEqual(hotKeys(d.after, 2), []);
});

test('the top key falls below 2 times the even share', () => {
  const even = 3000 / Object.keys(d.after).length;
  assert.ok(Math.max(...Object.values(d.after)) < 2 * even, 'top key still too busy');
});

test('no write was lost: the same 3,000 writes, now over more keys', () => {
  assert.equal(Object.values(d.after).reduce((a, b) => a + b, 0), 3000);
  assert.ok(Object.keys(d.after).length > Object.keys(d.before).length);
});

test('reading all shards of class-7 gives back every item', () => assert.equal(d.logicalCount, d.expectedLogical));
