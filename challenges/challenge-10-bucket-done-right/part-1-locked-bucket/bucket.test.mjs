import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetEmulator, s3 as makeS3 } from '../../../toolkit/aws.js';
import { BUCKET, lockBucket, readSettings } from './bucket.mjs';

const s3 = makeS3();
await resetEmulator();
await lockBucket(s3);
const settings = await readSettings(s3);

test('all four Block Public Access switches are on', () => {
  assert.deepEqual(settings.block, { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true });
});

test('default encryption is AES256', () => assert.equal(settings.encryption, 'AES256'));

test('versioning is enabled', () => assert.equal(settings.versioning, 'Enabled'));

test('the bucket has the expected name', () => assert.equal(BUCKET, 'daftar-notes-prod'));
