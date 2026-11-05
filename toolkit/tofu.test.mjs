import './guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerOverride, dockerArgs, TOFU_IMAGE, CONTAINER_ENDPOINT, NETWORK } from './tofu.js';

test('the provider override pins both emulator accounts and points every service at the emulator', () => {
  const aws = providerOverride().provider.aws;
  assert.deepEqual(aws.allowed_account_ids, ['123456789012', '000000000000']);
  assert.equal(aws.access_key, 'test');
  assert.ok(Object.values(aws.endpoints).every((url) => url === CONTAINER_ENDPOINT));
});

test('the docker command uses the pinned image, fake keys and mounts only the working folder', () => {
  const args = dockerArgs('/tmp/work', ['plan']);
  assert.ok(args.includes(TOFU_IMAGE));
  assert.match(TOFU_IMAGE, /:1\.13\.2$/);
  const text = args.join(' ');
  assert.doesNotMatch(text, /\.aws/);
  assert.equal(args.filter((a) => a === '-v').length, 1);
  assert.ok(args.includes('AWS_ACCESS_KEY_ID=test'));
  assert.equal(args.at(-1), 'plan');
});

test('the container joins the compose network and reaches the emulator as moto', () => {
  assert.equal(CONTAINER_ENDPOINT, 'http://moto:5000');
  const args = dockerArgs('/tmp/work', ['plan']);
  assert.equal(args[args.indexOf('--network') + 1], NETWORK);
  assert.ok(args.includes('AWS_ENDPOINT_URL=http://moto:5000'));
});

test('the override skips credential and metadata checks but still pins the account ids', () => {
  const aws = providerOverride().provider.aws;
  assert.equal(aws.skip_credentials_validation, true);
  assert.equal(aws.skip_metadata_api_check, true);
  assert.equal(aws.s3_use_path_style, true);
  assert.equal(aws.allowed_account_ids.length, 2);
});
