// STEP 1: the guard first. This part creates and changes a bucket, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import {
  CreateBucketCommand, GetBucketEncryptionCommand, GetBucketVersioningCommand, GetPublicAccessBlockCommand,
  PutBucketEncryptionCommand, PutBucketVersioningCommand, PutPublicAccessBlockCommand,
} from '@aws-sdk/client-s3';
import { resetEmulator, s3 as makeS3 } from '../../../toolkit/aws.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 10, part 1: a locked bucket';

export const BUCKET = 'daftar-notes-prod';

// STEP 2: create the bucket and lock it (your turn). Three settings:
//   Block Public Access: all four switches on (BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, RestrictPublicBuckets)
//   default encryption: server-side encryption with AES256 (keys managed by S3)
//   versioning: Enabled (an overwritten or deleted object can be brought back)
export async function lockBucket(s3, bucket = BUCKET) {
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  // YOUR TURN start
  // HINT: PutPublicAccessBlockCommand({ Bucket, PublicAccessBlockConfiguration: { BlockPublicAcls: true, ... } })
  // HINT: PutBucketEncryptionCommand({ Bucket, ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] } })
  // HINT: PutBucketVersioningCommand({ Bucket, VersioningConfiguration: { Status: 'Enabled' } })
  // YOUR TURN end
}

// STEP 3: read the settings back from the emulator. Provided.
export async function readSettings(s3, bucket = BUCKET) {
  const block = (await s3.send(new GetPublicAccessBlockCommand({ Bucket: bucket }))).PublicAccessBlockConfiguration;
  const encryption = (await s3.send(new GetBucketEncryptionCommand({ Bucket: bucket }))).ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm;
  const versioning = (await s3.send(new GetBucketVersioningCommand({ Bucket: bucket }))).Status;
  return { block, encryption, versioning };
}

export async function run() {
  const s3 = makeS3();
  await resetEmulator();
  await lockBucket(s3);
  const s = await readSettings(s3);
  const on = (v) => (v ? 'ON' : 'OFF');
  return {
    facts: [['Bucket', BUCKET]],
    head: ['Setting', 'AWS name', 'Value', 'State'],
    rows: [
      ['No public ACLs', 'BlockPublicAcls', s.block.BlockPublicAcls, on(s.block.BlockPublicAcls)],
      ['Ignore public ACLs', 'IgnorePublicAcls', s.block.IgnorePublicAcls, on(s.block.IgnorePublicAcls)],
      ['No public policies', 'BlockPublicPolicy', s.block.BlockPublicPolicy, on(s.block.BlockPublicPolicy)],
      ['Restrict public buckets', 'RestrictPublicBuckets', s.block.RestrictPublicBuckets, on(s.block.RestrictPublicBuckets)],
      ['Default encryption', 'SSEAlgorithm', s.encryption, on(s.encryption === 'AES256')],
      ['Versioning', 'Status', s.versioning, on(s.versioning === 'Enabled')],
    ],
  };
}

main(import.meta.url, run);
