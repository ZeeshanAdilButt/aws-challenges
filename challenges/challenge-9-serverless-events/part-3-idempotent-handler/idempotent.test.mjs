import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drill, makeHandler } from './idempotent.mjs';

const d = await drill();

test('the first delivery does the work', () => assert.equal(d.results[0], true));

test('a duplicate does nothing: three deliveries, one thumbnail', () => {
  assert.deepEqual(d.results.slice(0, 3), [true, false, false]);
  assert.deepEqual(d.afterDuplicates, ['thumbnail of photos/cat.jpg']);
});

test('a changed file has a new ETag, so it is new work', () => {
  assert.notEqual(d.record.etag, d.changed.etag);
  assert.equal(d.results[3], true);
  assert.equal(d.effects.length, 2);
});

test('the keys are the object key plus the ETag', () => {
  assert.equal(d.keys.length, 2);
  assert.ok(d.keys[0].startsWith('daftar-uploads/photos/cat.jpg#'));
});

test('makeHandler keeps its own memory in the store it is given', () => {
  const store = new Set();
  const effects = [];
  const handle = makeHandler(store, effects);
  const record = { bucket: 'b', key: 'k', etag: '"e"' };
  assert.equal(handle(record), true);
  assert.equal(handle(record), false);
  assert.equal(store.size, 1);
  assert.equal(effects.length, 1);
});
