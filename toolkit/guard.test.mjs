import './guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkEnvironment, isLocalEndpoint, isEmulatorAccount, safeLine, REQUIRED } from './guard-core.js';

const good = {
  AWS_ENDPOINT_URL: 'http://localhost:5000',
  AWS_ACCESS_KEY_ID: 'test',
  AWS_SECRET_ACCESS_KEY: 'test',
  AWS_REGION: 'us-east-1',
};
const codes = (env) => checkEnvironment(env).map((p) => p.code);

test('a safe environment has no problems', () => {
  assert.deepEqual(checkEnvironment(good), []);
});

test('the three local hosts are accepted', () => {
  for (const url of ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://[::1]:5000']) {
    assert.equal(isLocalEndpoint(url), true, url);
  }
});

test('tricky hosts are refused', () => {
  for (const url of ['http://localhost.evil.com:5000', 'http://evil.com', 'http://localhost@evil.com', 'https://sts.amazonaws.com', 'localhost:5000', 'file:///etc/passwd', '']) {
    assert.equal(isLocalEndpoint(url), false, url);
  }
});

test('refuses when no endpoint is set', () => {
  assert.deepEqual(codes({ ...good, AWS_ENDPOINT_URL: undefined }), ['endpoint-missing']);
});

test('refuses a remote endpoint', () => {
  assert.deepEqual(codes({ ...good, AWS_ENDPOINT_URL: 'https://s3.us-east-1.amazonaws.com' }), ['endpoint-remote']);
});

test('refuses a per-service endpoint that points elsewhere, accepts a local one', () => {
  assert.deepEqual(codes({ ...good, AWS_ENDPOINT_URL_S3: 'https://s3.amazonaws.com' }), ['service-endpoint-remote']);
  assert.deepEqual(codes({ ...good, AWS_ENDPOINT_URL_S3: 'http://localhost:5000' }), []);
});

test('refuses when the SDK is told to ignore configured endpoints', () => {
  assert.deepEqual(codes({ ...good, AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true' }), ['ignore-endpoints']);
});

test('refuses a real-looking key', () => {
  assert.deepEqual(codes({ ...good, AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE' }), ['real-key-prefix']);
  assert.deepEqual(codes({ ...good, AWS_ACCESS_KEY_ID: 'ASIAIOSFODNN7EXAMPLE' }), ['real-key-prefix']);
});

test('refuses any key or secret that is not exactly test', () => {
  assert.deepEqual(codes({ ...good, AWS_ACCESS_KEY_ID: 'other' }), ['key-not-test']);
  assert.deepEqual(codes({ ...good, AWS_SECRET_ACCESS_KEY: 'x' }), ['secret-not-test']);
  assert.deepEqual(codes({ ...good, AWS_ACCESS_KEY_ID: undefined }), ['key-not-test']);
});

test('refuses a session token and a profile', () => {
  assert.deepEqual(codes({ ...good, AWS_SESSION_TOKEN: 'abc' }), ['session-token']);
  assert.deepEqual(codes({ ...good, AWS_PROFILE: 'work' }), ['profile-set']);
});

test('reports every problem at once', () => {
  const found = codes({ AWS_PROFILE: 'work', AWS_ACCESS_KEY_ID: 'AKIA1', AWS_ENDPOINT_URL: 'https://example.com' });
  assert.deepEqual(found.sort(), ['endpoint-remote', 'profile-set', 'real-key-prefix', 'secret-not-test']);
});

test('only the two emulator accounts are accepted', () => {
  assert.equal(isEmulatorAccount('123456789012'), true);
  assert.equal(isEmulatorAccount('000000000000'), true);
  assert.equal(isEmulatorAccount('210987654321'), false);
  assert.equal(safeLine('http://localhost:5000', '123456789012'), 'Safe: talking to the emulator at http://localhost:5000, account 123456789012.');
});

test('the required list matches the env scripts', () => {
  assert.deepEqual(REQUIRED.map((r) => r.name), ['AWS_ENDPOINT_URL', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_EC2_METADATA_DISABLED']);
});

// The real guard, started as its own program with an unsafe environment. It must stop before any network call.
const guardFile = fileURLToPath(new URL('./guard.js', import.meta.url));
function runGuardWith(overrides) {
  const env = { ...process.env, ...overrides };
  for (const [k, v] of Object.entries(overrides)) if (v === undefined) delete env[k];
  return spawnSync(process.execPath, [guardFile], { env, encoding: 'utf8', timeout: 20000 });
}

test('the guard program exits with code 2 for a remote endpoint', () => {
  const result = runGuardWith({ AWS_ENDPOINT_URL: 'https://sts.amazonaws.com' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /STOPPED by the safety guard/);
  assert.doesNotMatch(result.stdout, /Safe:/);
});

test('the guard program exits with code 2 for a profile and for a real-looking key', () => {
  assert.equal(runGuardWith({ AWS_PROFILE: 'work' }).status, 2);
  assert.equal(runGuardWith({ AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE' }).status, 2);
});
