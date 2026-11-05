import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GetBucketPolicyStatusCommand, GetPublicAccessBlockCommand } from '@aws-sdk/client-s3';
import { GetAccountPasswordPolicyCommand, ListAccessKeysCommand, ListUsersCommand } from '@aws-sdk/client-iam';
import { iam as makeIam, s3 as makeS3 } from '../../../toolkit/aws.js';
import { PRIVATE_BUCKET, PUBLIC_BUCKET, ROOT_FILE, seedAccount } from './seed-account.mjs';

const iam = makeIam();
const s3 = makeS3();
await seedAccount({ iam, s3 });

const keysOf = async (UserName) => (await iam.send(new ListAccessKeysCommand({ UserName }))).AccessKeyMetadata;

test('four users exist', async () => {
  const { Users } = await iam.send(new ListUsersCommand({}));
  assert.deepEqual(Users.map((u) => u.UserName).sort(), ['aqib', 'asif', 'ci-deploy', 'old-contractor']);
});

test('asif, ci-deploy and old-contractor each have one active key', async () => {
  for (const user of ['asif', 'ci-deploy', 'old-contractor']) {
    const keys = await keysOf(user);
    assert.equal(keys.length, 1, user);
    assert.equal(keys[0].Status, 'Active', user);
  }
});

test('aqib has one key and it is switched off', async () => {
  const keys = await keysOf('aqib');
  assert.equal(keys.length, 1);
  assert.equal(keys[0].Status, 'Inactive');
});

test('there is no password policy', async () => {
  await assert.rejects(iam.send(new GetAccountPasswordPolicyCommand({})), { name: 'NoSuchEntityException' });
});

test('one bucket is public and one blocks public access', async () => {
  const status = await s3.send(new GetBucketPolicyStatusCommand({ Bucket: PUBLIC_BUCKET }));
  assert.equal(status.PolicyStatus.IsPublic, true);
  const block = await s3.send(new GetPublicAccessBlockCommand({ Bucket: PRIVATE_BUCKET }));
  assert.equal(block.PublicAccessBlockConfiguration.RestrictPublicBuckets, true);
});

test('the root user key is recorded in the file', () => {
  assert.equal(JSON.parse(fs.readFileSync(ROOT_FILE, 'utf8')).accessKeys, 1);
});
