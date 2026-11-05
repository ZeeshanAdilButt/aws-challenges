// STEP 1: the guard first. This part creates a bucket and a queue, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { resetEmulator, s3 as makeS3, sqs as makeSqs } from '../../../toolkit/aws.js';
import { main } from '../../../toolkit/part.js';
import { BUCKET, connectBucketToQueue, createQueue, deleteMessage, readObject, receiveEvent, recordsOf, upload } from '../shared.mjs';

export const title = 'Challenge 9, part 1: from upload to handler';

export const QUEUE = 'daftar-upload-events';

// STEP 2: the handler (your turn). In AWS this would be a Lambda function. The emulator does not run function code here,
// so the handler is a plain function that runs on your computer. It receives one record { bucket, key, etag, size }
// and the S3 client. Read the object and return { key, bytes, words }: bytes is the length of the text, words the number
// of words (split on spaces and new lines; an empty text has 0 words).
export async function handler(record, s3) {
  // YOUR TURN start
  // HINT: readObject(s3, record.bucket, record.key) gives the text. text.split(/\s+/).filter(Boolean) are the words.
  // YOUR TURN end
}

// STEP 3: the pipeline: upload a note, find the event on the queue, run the handler, delete the message. Provided.
export async function pipeline() {
  const s3 = makeS3();
  const sqs = makeSqs();
  await resetEmulator();
  const queueUrl = await createQueue(sqs, QUEUE);
  const configured = await connectBucketToQueue(s3, QUEUE);
  const etag = await upload(s3, 'notes/week-1.txt', 'Daftar keeps notes for class one. Notes are small.');
  const message = await receiveEvent(sqs, queueUrl);
  const records = message ? recordsOf(message) : [];
  const outputs = [];
  for (const record of records) outputs.push(await handler(record, s3));
  if (message) await deleteMessage(sqs, queueUrl, message);
  const left = await receiveEvent(sqs, queueUrl);
  return { configured, etag, message, records, outputs, queueEmptyAfter: left === null };
}

export async function run() {
  const r = await pipeline();
  const out = r.outputs[0];
  return {
    facts: [
      ['Bucket and queue', `${BUCKET} sends ObjectCreated events to ${QUEUE}`],
      ['Notification configured', r.configured?.length ? `${r.configured[0].Events.join(', ')}` : 'none'],
      ['Messages received after one upload', r.message ? '1' : '0'],
      ['Handler ran locally', 'yes (the emulator does not run function code here)'],
    ],
    head: ['Step', 'Result'],
    rows: [
      ['Event record', r.records[0] ? `${r.records[0].bucket}/${r.records[0].key}` : 'none'],
      ['Handler output', out ? `${out.bytes} bytes, ${out.words} words` : 'none'],
      ['Queue empty after delete', r.queueEmptyAfter ? 'yes' : 'no'],
    ],
  };
}

main(import.meta.url, run);
