import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../../../toolkit/models/policy.js';
import { APP_ROLE, bucketPolicy, drill, isExpired } from './policy-and-presign.mjs';

const d = await drill();

test('the policy has the two statements and the emulator stored them', () => {
  assert.deepEqual(d.stored.Statement.map((s) => s.Sid), ['DenyPlainHttp', 'AppReadWriteNotes']);
});

test('the lint finds nothing wrong', () => assert.deepEqual(d.findings, []));

test('the policy model: the app role reads notes over HTTPS, but not over plain HTTP and not outside notes/', () => {
  const policy = [bucketPolicy()];
  const ask = (action, key, secure) => evaluate({ action, resource: `arn:aws:s3:::daftar-notes-prod/${key}`, context: { 'aws:SecureTransport': secure } }, policy);
  assert.equal(ask('s3:GetObject', 'notes/1.txt', 'true').decision, 'Allow');
  assert.equal(ask('s3:GetObject', 'notes/1.txt', 'false').decision, 'Deny');
  assert.equal(ask('s3:GetObject', 'exports/1.csv', 'true').decision, 'Deny');
  assert.equal(ask('s3:DeleteObject', 'notes/1.txt', 'true').decision, 'Deny');
});

test('the app role is named in the allow statement', () => {
  assert.equal(bucketPolicy().Statement[1].Principal.AWS, APP_ROLE);
});

test('a fresh presigned URL works', () => {
  assert.equal(d.freshStatus, 200);
  assert.equal(d.freshBody, 'hello from Daftar');
});

test('after its lifetime the URL is expired by its own dates', () => {
  assert.equal(d.expiredByUrl, true);
  assert.equal(isExpired(d.url, d.expiry.signedAt + 1000), false);
  assert.equal(isExpired(d.url, d.expiry.signedAt + 2500), true);
});
