import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { s3 as makeS3, resetEmulator } from '../../../toolkit/aws.js';
import { BUCKET, upload } from '../shared.mjs';
import { CreateBucketCommand } from '@aws-sdk/client-s3';
import { QUEUE, handler, pipeline } from './upload.mjs';

const r = await pipeline();

test('the bucket is wired to the queue for new objects', () => {
  assert.equal(r.configured.length, 1);
  assert.ok(r.configured[0].Events.some((e) => e.startsWith('s3:ObjectCreated')));
  assert.match(r.configured[0].QueueArn, new RegExp(QUEUE));
});

test('one upload puts exactly one message on the queue, and it names the object', () => {
  assert.ok(r.message, 'no message arrived');
  assert.equal(r.records.length, 1);
  assert.equal(r.records[0].bucket, BUCKET);
  assert.equal(r.records[0].key, 'notes/week-1.txt');
});

test('the handler returns the size and the words of the note', () => {
  assert.deepEqual(r.outputs, [{ key: 'notes/week-1.txt', bytes: 50, words: 9 }]);
});

test('the handler counts words in an empty file as 0', async () => {
  const s3 = makeS3();
  await resetEmulator();
  await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  await upload(s3, 'empty.txt', '');
  assert.deepEqual(await handler({ bucket: BUCKET, key: 'empty.txt' }, s3), { key: 'empty.txt', bytes: 0, words: 0 });
});

test('after the message is deleted the queue is empty', () => assert.equal(r.queueEmptyAfter, true));
