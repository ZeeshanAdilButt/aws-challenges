// STEP 1: the guard first. This part creates a bucket on the emulator, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutBucketVersioningCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'node:url';
import { parseResources, tfText } from '../../../toolkit/hcl.js';
import { resetEmulator, s3 as makeS3 } from '../../../toolkit/aws.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 14, part 2: state in S3';

export const DIR = fileURLToPath(new URL('.', import.meta.url));
export const BUCKET = 'daftar-tfstate';
export const STATE_KEY = 'network/terraform.tfstate';
export const LOCK_KEY = `${STATE_KEY}.tflock`;

// STEP 2: create the state bucket with versioning on (so an old state can be brought back). Provided.
export async function createStateBucket(s3) {
  await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  await s3.send(new PutBucketVersioningCommand({ Bucket: BUCKET, VersioningConfiguration: { Status: 'Enabled' } }));
}

// STEP 3: take the lock the way use_lockfile does (your turn).
// Write the lock object with a conditional write: PutObject with IfNoneMatch: '*' means "only if no object with this key exists".
// Return true when you got the lock, false when someone else holds it (the service answers 412 PreconditionFailed).
export async function takeLock(s3, who) {
  // YOUR TURN start
  // HINT: catch the error and look at error.$metadata.httpStatusCode (412) or error.name ('PreconditionFailed').
  // YOUR TURN end
}

// STEP 4: let the lock go. Provided.
export const releaseLock = (s3) => s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: LOCK_KEY }));

export const lockExists = async (s3) => (await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: LOCK_KEY }))).KeyCount > 0;
export const readLock = async (s3) => (await (await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: LOCK_KEY }))).Body.transformToString());

export async function lockDrill() {
  const s3 = makeS3();
  await resetEmulator();
  await createStateBucket(s3);
  const first = await takeLock(s3, 'ana');
  const seen = await lockExists(s3);
  const second = await takeLock(s3, 'bilal');
  const holder = JSON.parse(await readLock(s3)).Who;
  await releaseLock(s3);
  const gone = !(await lockExists(s3));
  const third = await takeLock(s3, 'bilal');
  await releaseLock(s3);
  return { first, seen, second, holder, gone, third };
}

export async function run() {
  const text = tfText(DIR);
  const backend = /backend\s+"s3"/.test(text) && /use_lockfile\s*=\s*true/.test(text);
  const drill = await lockDrill();
  const yn = (v) => (v ? 'yes' : 'no');
  return {
    facts: [
      ['Backend in the code', backend ? 'S3 with use_lockfile = true, bucket daftar-tfstate' : 'missing'],
      ['Resources in this folder', parseResources(text).map((r) => r.id).join(', ')],
      ['Real two-apply lock error', 'Error: Error acquiring the state lock (S3 PutObject, StatusCode: 412, PreconditionFailed)'],
    ],
    head: ['Step', 'What happened', 'Result'],
    rows: [
      ['1', 'Ana takes the lock (conditional write)', yn(drill.first)],
      ['2', 'The .tflock object exists', yn(drill.seen)],
      ['3', 'Bilal tries while Ana holds it: he gets the lock', yn(drill.second)],
      ['4', 'The lock still names', drill.holder],
      ['5', 'After release the object is gone', yn(drill.gone)],
      ['6', 'Bilal tries again: he gets the lock', yn(drill.third)],
    ],
  };
}

main(import.meta.url, run);
