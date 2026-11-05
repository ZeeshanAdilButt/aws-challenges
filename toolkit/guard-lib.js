// The guard functions. Import guard.js (not this file) in scripts and tests.
// A guard stops the program before any AWS call if there is any chance of touching a real account.
//
// Order of checks (see README, "Safety"):
//   1. environment variables (guard-core.js)         2. empty config files inside this repository
//   3. STS GetCallerIdentity must answer 123456789012 (moto) or 000000000000 (LocalStack)
//   4. print one plain line.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkEnvironment, isEmulatorAccount, safeLine } from './guard-core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const emptyDir = path.join(root, '.aws-empty');

export function refuse(problems) {
  console.error('\nSTOPPED by the safety guard. Nothing was sent to AWS.');
  for (const p of problems) console.error(`  - [${p.code}] ${p.message}`);
  console.error('Fix: run "source toolkit/env.sh" (macOS, Linux) or ". toolkit/env.ps1" (Windows), or start with "npm run".\n');
  process.exit(2);
}

// Step 1 and 2: environment only. No network. Safe to call in any test.
export function guardEnvironment(env = process.env) {
  // Real config and credentials files are never read: point both at empty files in this repository.
  env.AWS_CONFIG_FILE = path.join(emptyDir, 'config');
  env.AWS_SHARED_CREDENTIALS_FILE = path.join(emptyDir, 'credentials');
  env.AWS_EC2_METADATA_DISABLED = 'true';
  const problems = checkEnvironment(env);
  if (problems.length) refuse(problems);
  return env.AWS_ENDPOINT_URL;
}

// Step 3 and 4: ask the emulator who it is.
export async function guardAccount(endpoint) {
  const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
  const sts = new STSClient({
    endpoint,
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  let account;
  try {
    ({ Account: account } = await sts.send(new GetCallerIdentityCommand({})));
  } catch (error) {
    refuse([{ code: 'emulator-unreachable', message: `Could not reach the emulator at ${endpoint} (${error.message}). Run "npm run moto:up".` }]);
  }
  if (!isEmulatorAccount(account)) {
    refuse([{ code: 'wrong-account', message: `The endpoint answered with account ${account}. Only 123456789012 and 000000000000 are allowed.` }]);
  }
  console.log(safeLine(endpoint, account));
  return account;
}

export async function runGuard() {
  const endpoint = guardEnvironment();
  return guardAccount(endpoint);
}
