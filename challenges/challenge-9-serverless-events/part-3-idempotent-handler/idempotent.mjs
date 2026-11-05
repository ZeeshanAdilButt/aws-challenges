// STEP 1: the guard first. This part uploads files and reads queue messages on the emulator, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { resetEmulator, s3 as makeS3, sqs as makeSqs } from '../../../toolkit/aws.js';
import { idempotencyKey, processOnce } from '../../../toolkit/models/sqs.js';
import { main } from '../../../toolkit/part.js';
import { connectBucketToQueue, createQueue, deleteMessage, receiveEvent, recordsOf, upload } from '../shared.mjs';

export const title = 'Challenge 9, part 3: an idempotent handler';

// Idempotent means: doing it twice has the same result as doing it once. A queue delivers a message at least once,
// so a message can come twice (part 2 showed how). A handler that sends an email or adds a charge would do it twice.

// STEP 2: the idempotent handler (your turn). `store` is a Set of keys already done. `effects` is a list where the handler
// writes what it really did (think: "sent a welcome email"). Return a function handle(record) that:
//   makes the key with idempotencyKey(record.bucket, record.key, record.etag)
//   does the work once for that key, using processOnce(store, key, work)
//   the work pushes `thumbnail of <key>` to effects
// handle returns true when it did the work and false when the record was a duplicate.
export function makeHandler(store, effects) {
  // YOUR TURN start
  // HINT: processOnce(store, id, fn) runs fn only the first time it sees id, and returns true or false.
  // YOUR TURN end
}

// STEP 3: upload one file, then deliver its event twice (as a queue may), then upload a changed file. Provided.
export async function drill() {
  const s3 = makeS3();
  const sqs = makeSqs();
  await resetEmulator();
  const url = await createQueue(sqs, 'daftar-upload-events');
  await connectBucketToQueue(s3, 'daftar-upload-events');
  await upload(s3, 'photos/cat.jpg', 'version one');
  const message = await receiveEvent(sqs, url);
  const record = recordsOf(message)[0];
  await deleteMessage(sqs, url, message);
  const store = new Set();
  const effects = [];
  const handle = makeHandler(store, effects);
  const results = [handle(record), handle(record), handle(record)]; // the same event three times
  const afterDuplicates = [...effects];
  await upload(s3, 'photos/cat.jpg', 'version two, changed');
  const changed = recordsOf(await receiveEvent(sqs, url))[0];
  results.push(handle(changed));
  return { record, changed, results, afterDuplicates, effects, keys: [...store] };
}

export async function run() {
  const d = await drill();
  return {
    facts: [
      ['Key', `bucket/object key#ETag, for example ${idempotencyKey(d.record.bucket, d.record.key, d.record.etag)}`],
      ['Same event delivered 3 times', `work done ${d.afterDuplicates.length} time (results ${d.results.slice(0, 3).join(', ')})`],
      ['Same name, changed file', `new ETag, so the work is done again: ${d.results[3]}`],
      ['Things done in the end', d.effects.join('; ')],
    ],
    head: ['Delivery', 'Key', 'Did the work?'],
    rows: [
      ['1 (first)', d.keys[0], d.results[0]],
      ['2 (duplicate)', d.keys[0], d.results[1]],
      ['3 (duplicate)', d.keys[0], d.results[2]],
      ['4 (file changed)', d.keys[1], d.results[3]],
    ],
  };
}

main(import.meta.url, run);
