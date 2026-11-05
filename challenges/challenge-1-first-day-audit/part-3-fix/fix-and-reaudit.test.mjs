import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GetBucketPolicyCommand, GetPublicAccessBlockCommand } from '@aws-sdk/client-s3';
import { ListAccessKeysCommand } from '@aws-sdk/client-iam';
import { iam as makeIam, s3 as makeS3 } from '../../../toolkit/aws.js';
import { PUBLIC_BUCKET, ROOT_FILE, seedAccount } from '../part-1-seed/seed-account.mjs';
import { audit } from '../part-2-audit/audit.mjs';
import { fixAll } from './fix-and-reaudit.mjs';

const iam = makeIam();
const s3 = makeS3();
await seedAccount({ iam, s3 });
const before = await audit({ iam, s3 });
await fixAll(before, { iam, s3 });

test('there were six findings, and the second audit finds none', async () => {
  assert.equal(before.length, 6);
  assert.deepEqual(await audit({ iam, s3 }), []);
});

test('the public bucket blocks public access and has no policy', async () => {
  const block = await s3.send(new GetPublicAccessBlockCommand({ Bucket: PUBLIC_BUCKET }));
  assert.deepEqual(Object.values(block.PublicAccessBlockConfiguration), [true, true, true, true]);
  await assert.rejects(s3.send(new GetBucketPolicyCommand({ Bucket: PUBLIC_BUCKET })), { name: 'NoSuchBucketPolicy' });
});

test('unused keys are switched off, not deleted', async () => {
  for (const UserName of ['asif', 'ci-deploy', 'old-contractor']) {
    const { AccessKeyMetadata } = await iam.send(new ListAccessKeysCommand({ UserName }));
    assert.equal(AccessKeyMetadata.length, 1, `${UserName}: the key must still exist`);
    assert.equal(AccessKeyMetadata[0].Status, 'Inactive');
  }
});

test('the root key is gone from the record', () => {
  assert.equal(JSON.parse(fs.readFileSync(ROOT_FILE, 'utf8')).accessKeys, 0);
});

test('fixing twice does no harm', async () => {
  await fixAll(before, { iam, s3 });
  assert.deepEqual(await audit({ iam, s3 }), []);
});
