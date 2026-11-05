import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tfText } from '../../../toolkit/hcl.js';
import { DIR, lockDrill } from './state-in-s3.mjs';

const text = tfText(DIR);
const drill = await lockDrill();

test('the code keeps its state in S3 with a lock file, not on disk', () => {
  assert.match(text, /backend\s+"s3"\s*\{/);
  assert.match(text, /use_lockfile\s*=\s*true/);
  assert.match(text, /bucket\s*=\s*"daftar-tfstate"/);
});

test('the backend is pointed at the emulator, with fake keys and skip flags', () => {
  assert.match(text, /s3\s*=\s*"http:\/\/moto:5000"/);
  assert.match(text, /use_path_style\s*=\s*true/);
  for (const flag of ['skip_credentials_validation', 'skip_requesting_account_id', 'skip_metadata_api_check']) assert.match(text, new RegExp(`${flag}\\s*=\\s*true`));
  assert.match(text, /access_key\s*=\s*"test"/);
  assert.doesNotMatch(text, /AKIA|ASIA/);
});

test('the first person gets the lock and the lock object exists', () => {
  assert.equal(drill.first, true);
  assert.equal(drill.seen, true);
});

test('the second person is refused while the lock is held, and the lock still names the first', () => {
  assert.equal(drill.second, false);
  assert.equal(drill.holder, 'ana');
});

test('after release the lock object is gone and can be taken again', () => {
  assert.equal(drill.gone, true);
  assert.equal(drill.third, true);
});
