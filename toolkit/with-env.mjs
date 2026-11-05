// Runs "node <args>" with the safe environment already set, so "npm test" just works.
// It sets the fake values, removes anything that could carry real credentials, and leaves
// AWS_ENDPOINT_URL_* variables alone on purpose: if one points elsewhere, the guard refuses.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
Object.assign(env, {
  AWS_ENDPOINT_URL: 'http://localhost:5000',
  AWS_ACCESS_KEY_ID: 'test',
  AWS_SECRET_ACCESS_KEY: 'test',
  AWS_REGION: 'us-east-1',
  AWS_EC2_METADATA_DISABLED: 'true',
  AWS_CONFIG_FILE: path.join(root, '.aws-empty', 'config'),
  AWS_SHARED_CREDENTIALS_FILE: path.join(root, '.aws-empty', 'credentials'),
});
for (const name of ['AWS_PROFILE', 'AWS_SESSION_TOKEN', 'AWS_DEFAULT_PROFILE', 'AWS_IGNORE_CONFIGURED_ENDPOINT_URLS']) delete env[name];

// The script path is read from where you typed the command, so it works from the repository root
// (npm scripts) and from inside a part folder (node ../../../toolkit/with-env.mjs drift.mjs). The script still runs from the root.
const args = process.argv.slice(2);
if (args[0] && !args[0].startsWith('-')) args[0] = path.resolve(process.cwd(), args[0]);
const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
process.exit(result.status ?? 1);
