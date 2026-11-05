import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deliver, idempotencyKey, processOnce } from './sqs.js';

const cfg = { visibilityTimeout: 30, maxReceiveCount: 3, handlerSeconds: 5 };
const d = (msg, over = {}) => deliver(msg, { ...cfg, ...over });

test('a clean message is done at the first receive', () => assert.deepEqual(d({ id: 'a' }), { id: 'a', outcome: 'done', receives: 1, effects: 1, finishedAt: 5 }));
test('two failures then success: three receives, 65 seconds', () => assert.deepEqual(d({ id: 'b', failAttempts: 2 }), { id: 'b', outcome: 'done', receives: 3, effects: 1, finishedAt: 65 }));
test('three failures end in the dead-letter queue', () => assert.deepEqual(d({ id: 'c', failAttempts: 3 }), { id: 'c', outcome: 'dlq', receives: 3, effects: 0, finishedAt: 90 }));
test('a poison message always ends in the dead-letter queue', () => assert.deepEqual(d({ id: 'd', poison: true }), { id: 'd', outcome: 'dlq', receives: 3, effects: 0, finishedAt: 90 }));
test('a handler slower than the visibility timeout makes a duplicate', () => assert.deepEqual(d({ id: 'e' }, { handlerSeconds: 40 }), { id: 'e', outcome: 'done', receives: 2, effects: 2, finishedAt: 40 }));
test('a very slow handler is received until the limit', () => assert.deepEqual(d({ id: 'f' }, { handlerSeconds: 100 }), { id: 'f', outcome: 'done', receives: 3, effects: 3, finishedAt: 100 }));
test('one receive allowed and one failure: dlq at 30', () => assert.deepEqual(d({ id: 'g', failAttempts: 1 }, { maxReceiveCount: 1 }), { id: 'g', outcome: 'dlq', receives: 1, effects: 0, finishedAt: 30 }));
test('processOnce runs the work once for the same id', () => {
  const store = new Set();
  let count = 0;
  assert.equal(processOnce(store, 'x', () => count++), true);
  assert.equal(processOnce(store, 'x', () => count++), false);
  assert.equal(count, 1);
});
test('processOnce claims the id before the work, and releases it if the work throws', () => {
  const store = new Set();
  let seenDuring = null;
  processOnce(store, 'y', () => { seenDuring = store.has('y'); });
  assert.equal(seenDuring, true);
  assert.throws(() => processOnce(store, 'z', () => { throw new Error('boom'); }), /boom/);
  assert.equal(store.has('z'), false);
  assert.equal(processOnce(store, 'z', () => {}), true);
});
test('the key changes when the file changes', () => {
  assert.equal(idempotencyKey('b', 'a.txt', '"abc"'), 'b/a.txt#abc');
  assert.notEqual(idempotencyKey('b', 'a.txt', '"abc"'), idempotencyKey('b', 'a.txt', '"abd"'));
});
