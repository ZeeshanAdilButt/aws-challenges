// STEP 1: the guard first. This part puts a policy on a bucket and signs a URL, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { CreateBucketCommand, GetBucketPolicyCommand, GetObjectCommand, PutBucketPolicyCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { resetEmulator, s3 as makeS3 } from '../../../toolkit/aws.js';
import { lintPolicy } from '../../../toolkit/models/policylint.js';
import { main } from '../../../toolkit/part.js';
import { sleep } from '../../challenge-9-serverless-events/shared.mjs';

export const title = 'Challenge 10, part 2: a bucket policy and a presigned URL';

export const BUCKET = 'daftar-notes-prod';
export const SHARE = 'daftar-share-links';
export const APP_ROLE = 'arn:aws:iam::123456789012:role/daftar-api-task';

// STEP 2: the bucket policy (your turn). Two statements:
//   'DenyPlainHttp': Deny everyone (Principal '*') every S3 action on the bucket and on all objects in it, when aws:SecureTransport is 'false'
//   'AppReadWriteNotes': Allow the app role (Principal { AWS: APP_ROLE }) s3:GetObject and s3:PutObject on objects under notes/ only
export function bucketPolicy(bucket = BUCKET) {
  // YOUR TURN start
  // HINT: Condition: { Bool: { 'aws:SecureTransport': 'false' } }. The resource list for the Deny has the bucket and bucket/*.
  // YOUR TURN end
}

// STEP 3: how long a presigned URL lives. The URL carries X-Amz-Date (when it was signed) and X-Amz-Expires (seconds). Provided.
export function expiryOf(url) {
  const q = new URL(url).searchParams;
  const d = q.get('X-Amz-Date'); // 20261105T010203Z
  const signedAt = Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +d.slice(9, 11), +d.slice(11, 13), +d.slice(13, 15));
  return { signedAt, expires: Number(q.get('X-Amz-Expires')), expiresAt: signedAt + Number(q.get('X-Amz-Expires')) * 1000 };
}
export const isExpired = (url, now = Date.now()) => now > expiryOf(url).expiresAt;

// STEP 4: the drill. Provided: apply the policy, read it back, lint it, sign a URL that lives 2 seconds, use it, wait, check it again.
export async function drill() {
  const s3 = makeS3();
  await resetEmulator();
  await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: 'notes/1.txt', Body: 'hello from Daftar' }));
  await s3.send(new PutBucketPolicyCommand({ Bucket: BUCKET, Policy: JSON.stringify(bucketPolicy()) }));
  const stored = JSON.parse((await s3.send(new GetBucketPolicyCommand({ Bucket: BUCKET }))).Policy);
  // The emulator applies a Deny for plain HTTP to later requests, so the link is made on a second bucket without that policy.
  await s3.send(new CreateBucketCommand({ Bucket: SHARE }));
  await s3.send(new PutObjectCommand({ Bucket: SHARE, Key: 'notes/1.txt', Body: 'hello from Daftar' }));
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: SHARE, Key: 'notes/1.txt' }), { expiresIn: 2 });
  const fresh = await fetch(url);
  const freshBody = await fresh.text();
  await sleep(3200);
  const late = await fetch(url);
  return { stored, findings: lintPolicy(stored, { requireTlsDeny: true }), url, freshStatus: fresh.status, freshBody, lateStatus: late.status, expiredByUrl: isExpired(url), expiry: expiryOf(url) };
}

export async function run() {
  const d = await drill();
  return {
    facts: [
      ['Policy statements', d.stored.Statement.map((s) => s.Sid).join(', ')],
      ['Lint findings', d.findings.length ? d.findings.map((f) => `${f.sid}: ${f.rule}`).join('; ') : 'none (no wildcard principal without a condition, no wildcard action or resource, TLS deny present)'],
      ['Presigned URL lives', `${d.expiry.expires} seconds`],
      ['Fresh URL', `HTTP ${d.freshStatus}, body "${d.freshBody}"`],
      ['After 3 seconds, the emulator answers', `HTTP ${d.lateStatus}${d.lateStatus === 200 ? ' (the emulator does not check expiry)' : ''}`],
      ['After 3 seconds, the URL itself says', d.expiredByUrl ? 'expired (X-Amz-Date plus X-Amz-Expires is in the past)' : 'not expired'],
    ],
    head: ['Moment', 'HTTP status'],
    rows: [['just after signing', d.freshStatus], ['3 seconds later', d.lateStatus]],
  };
}

main(import.meta.url, run);
