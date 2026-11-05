import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queueArn } from '../shared.mjs';
import { drill } from './retries.mjs';

const d = await drill();

test('the main queue has a redrive policy: 3 receives, then the dead-letter queue', () => {
  assert.equal(d.redrive.maxReceiveCount, 3);
  assert.equal(d.redrive.deadLetterTargetArn, queueArn('daftar-jobs-dlq'));
});

test('the visibility timeout is 1 second for the drill', () => assert.equal(d.visibility, '1'));

test('the poison message is received three times and then lands in the dead-letter queue', () => {
  assert.equal(d.seen.filter((s) => s.id === 'poison-1').length, 3);
  assert.equal(d.dlqMessage?.id, 'poison-1');
});

test('the good message is handled once and not sent to the dead-letter queue', () => {
  assert.equal(d.seen.filter((s) => s.id === 'good-1').length, 1);
  assert.notEqual(d.dlqMessage?.id, 'good-1');
});

test('with a visibility timeout shorter than the handler, the same message goes to two workers', () => {
  assert.equal(d.dup.bothGotIt, true);
});
