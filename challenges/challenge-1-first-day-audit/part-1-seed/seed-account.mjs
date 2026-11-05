// STEP 1: the guard first. Seeding means creating users and buckets, so it must never reach a real account.
import '../../../toolkit/guard.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CreateAccessKeyCommand, CreateUserCommand, UpdateAccessKeyCommand } from '@aws-sdk/client-iam';
import { CreateBucketCommand, PutBucketPolicyCommand, PutPublicAccessBlockCommand } from '@aws-sdk/client-s3';
import { iam as makeIam, resetEmulator, s3 as makeS3 } from '../../../toolkit/aws.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 1, part 1: seed a fake account with bad settings';

// The emulator cannot hold two facts a real account has (the root user's keys), so they live in a small file.
export const ROOT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.work', 'root-account.json');
export const PUBLIC_BUCKET = 'daftar-public-assets';
export const PRIVATE_BUCKET = 'daftar-notes-private';
export const USERS = ['asif', 'aqib', 'ci-deploy', 'old-contractor'];

export function publicReadPolicy(bucket) {
  return {
    Version: '2012-10-17',
    Statement: [{ Sid: 'Everyone', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${bucket}/*` }],
  };
}

export async function seedAccount({ iam = makeIam(), s3 = makeS3(), rootFile = ROOT_FILE } = {}) {
  await resetEmulator();

  // STEP 2: the root user has an access key. The emulator cannot store this, so it goes in a file.
  fs.mkdirSync(path.dirname(rootFile), { recursive: true });
  fs.writeFileSync(rootFile, JSON.stringify({ accessKeys: 1 }, null, 2));

  // STEP 3: four IAM users. No password policy is set, which is the second bad setting.
  for (const UserName of USERS) await iam.send(new CreateUserCommand({ UserName }));

  // STEP 4: access keys that nobody ever used. aqib's key is switched off already, so it is not a problem.
  // YOUR TURN start
  // HINT: CreateAccessKeyCommand({ UserName }) for asif, ci-deploy and old-contractor, and for aqib too.
  // HINT: then UpdateAccessKeyCommand({ UserName: 'aqib', AccessKeyId, Status: 'Inactive' }) for aqib's key.
  // YOUR TURN end

  // STEP 5: two buckets. The private one blocks public access. The public one allows everyone to read.
  await s3.send(new CreateBucketCommand({ Bucket: PRIVATE_BUCKET }));
  await s3.send(new PutPublicAccessBlockCommand({
    Bucket: PRIVATE_BUCKET,
    PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true },
  }));
  await s3.send(new CreateBucketCommand({ Bucket: PUBLIC_BUCKET }));
  // YOUR TURN start
  // HINT: PutBucketPolicyCommand({ Bucket: PUBLIC_BUCKET, Policy: JSON.stringify(publicReadPolicy(PUBLIC_BUCKET)) })
  // YOUR TURN end
}

export async function run() {
  await seedAccount();
  return {
    facts: [['Bad settings planted', '4 kinds, 6 findings']],
    head: ['What was created', 'Bad setting', 'Why it is bad'],
    rows: [
      ['Root user', 'has an access key', 'Root can do everything and cannot be limited. A leaked root key is the worst key.'],
      ['Account', 'no password policy', 'People may choose short, weak passwords.'],
      [PUBLIC_BUCKET, 'bucket policy allows everyone to read', 'Anyone on the internet can download the files.'],
      ['asif, ci-deploy, old-contractor', 'one active key each, never used', 'A key nobody uses is a risk nobody watches.'],
      ['aqib', 'one key, switched off', 'Not a problem. The audit must leave it alone.'],
      [PRIVATE_BUCKET, 'blocks public access', 'Not a problem. The audit must leave it alone.'],
    ],
  };
}

main(import.meta.url, run);
