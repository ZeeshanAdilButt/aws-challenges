// The safety rules, as pure functions. No network, no side effects, so they are easy to test.
// toolkit/guard.js uses these, then asks the emulator who it is.

export const EMULATOR_ACCOUNTS = ['123456789012', '000000000000'];
export const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
export const DEFAULT_ENDPOINT = 'http://localhost:5000';

// The variables the course sets for you (see toolkit/env.sh and toolkit/env.ps1).
export const REQUIRED = [
  { name: 'AWS_ENDPOINT_URL', expected: DEFAULT_ENDPOINT, why: 'every SDK call goes to the emulator' },
  { name: 'AWS_ACCESS_KEY_ID', expected: 'test', why: 'a fake key, never a real one' },
  { name: 'AWS_SECRET_ACCESS_KEY', expected: 'test', why: 'a fake secret, never a real one' },
  { name: 'AWS_REGION', expected: 'us-east-1', why: 'the emulator needs one region' },
  { name: 'AWS_EC2_METADATA_DISABLED', expected: 'true', why: 'no calls to a real instance metadata service' },
];

export function isLocalEndpoint(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  return LOCAL_HOSTS.includes(url.hostname);
}

// Returns a list of problems. An empty list means the environment is safe.
// Each problem has a short code, so tests and learners can see which rule fired.
export function checkEnvironment(env = process.env) {
  const problems = [];
  const add = (code, message) => problems.push({ code, message });

  if (!env.AWS_ENDPOINT_URL) {
    add('endpoint-missing', 'AWS_ENDPOINT_URL is not set. Without it the SDK talks to real AWS.');
  } else if (!isLocalEndpoint(env.AWS_ENDPOINT_URL)) {
    add('endpoint-remote', `AWS_ENDPOINT_URL (${env.AWS_ENDPOINT_URL}) is not localhost, 127.0.0.1 or [::1].`);
  }

  for (const name of Object.keys(env)) {
    if (name.startsWith('AWS_ENDPOINT_URL_') && !isLocalEndpoint(env[name])) {
      add('service-endpoint-remote', `${name} (${env[name]}) does not point at this computer.`);
    }
  }

  if (env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS) {
    add('ignore-endpoints', 'AWS_IGNORE_CONFIGURED_ENDPOINT_URLS is set, so the SDK would ignore the emulator address.');
  }

  const key = env.AWS_ACCESS_KEY_ID ?? '';
  const secret = env.AWS_SECRET_ACCESS_KEY ?? '';
  if (key.startsWith('AKIA') || key.startsWith('ASIA')) {
    add('real-key-prefix', 'AWS_ACCESS_KEY_ID looks like a real AWS key (starts with AKIA or ASIA).');
  } else if (key !== 'test') {
    add('key-not-test', 'AWS_ACCESS_KEY_ID must be exactly "test".');
  }
  if (secret !== 'test') {
    add('secret-not-test', 'AWS_SECRET_ACCESS_KEY must be exactly "test".');
  }
  if (env.AWS_SESSION_TOKEN) {
    add('session-token', 'AWS_SESSION_TOKEN is set. Temporary real credentials are not allowed here.');
  }
  if (env.AWS_PROFILE) {
    add('profile-set', `AWS_PROFILE is set (${env.AWS_PROFILE}). A profile can hold real credentials.`);
  }
  return problems;
}

export function isEmulatorAccount(accountId) {
  return EMULATOR_ACCOUNTS.includes(accountId);
}

// The one plain line printed when everything is fine.
export function safeLine(endpoint, accountId) {
  return `Safe: talking to the emulator at ${endpoint}, account ${accountId}.`;
}

// Used by the OpenTofu wrapper and tests: the provider settings that keep OpenTofu on the emulator.
export function providerSettings(endpoint = DEFAULT_ENDPOINT) {
  return {
    allowed_account_ids: [...EMULATOR_ACCOUNTS],
    access_key: 'test',
    secret_key: 'test',
    region: 'us-east-1',
    skip_credentials_validation: true,
    skip_metadata_api_check: true,
    skip_requesting_account_id: false,
    s3_use_path_style: true,
    endpoint,
  };
}
