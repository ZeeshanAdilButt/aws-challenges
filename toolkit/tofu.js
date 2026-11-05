// The OpenTofu wrapper. Learners do not install OpenTofu: it runs from a pinned image.
// It never reads ~/.aws, mounts only the working folder, passes only fake keys, and writes a provider
// override that pins allowed_account_ids to the two emulator accounts and every endpoint to the emulator.
// Terraform 1.17 reads the same files; only the command differs.
import './guard-offline.js';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EMULATOR_ACCOUNTS } from './guard-core.js';

export const TOFU_IMAGE = 'ghcr.io/opentofu/opentofu:1.13.2';
// The OpenTofu container joins the Compose network and reaches the emulator by its service name. Only this wrapper
// may use that name; the guard still checks the learner's own shell for localhost.
export const NETWORK = 'aws-challenges';
export const CONTAINER_ENDPOINT = 'http://moto:5000';
const SERVICES = ['ec2', 'iam', 'sts', 's3', 'sqs', 'sns', 'lambda', 'logs', 'cloudwatch', 'dynamodb', 'ecs', 'rds', 'elbv2', 'kms', 'secretsmanager', 'ssm'];

export function providerOverride(endpoint = CONTAINER_ENDPOINT) {
  return {
    provider: {
      aws: {
        region: 'us-east-1',
        access_key: 'test',
        secret_key: 'test',
        allowed_account_ids: [...EMULATOR_ACCOUNTS],
        skip_credentials_validation: true,
        skip_metadata_api_check: true,
        skip_region_validation: true,
        s3_use_path_style: true,
        endpoints: Object.fromEntries(SERVICES.map((name) => [name, endpoint])),
      },
    },
  };
}

export function dockerArgs(dir, tofuArgs) {
  const fakeEnv = {
    AWS_ACCESS_KEY_ID: 'test',
    AWS_SECRET_ACCESS_KEY: 'test',
    AWS_REGION: 'us-east-1',
    AWS_ENDPOINT_URL: CONTAINER_ENDPOINT,
    AWS_EC2_METADATA_DISABLED: 'true',
  };
  const envFlags = Object.entries(fakeEnv).flatMap(([name, value]) => ['-e', `${name}=${value}`]);
  return [
    'run', '--rm',
    '--network', NETWORK,
    '-v', `${path.resolve(dir)}:/work`, '-w', '/work',
    ...envFlags,
    TOFU_IMAGE, ...tofuArgs,
  ];
}

// Running OpenTofu asks the emulator who it is first (the full guard), then starts the container.
export async function tofu(dir, tofuArgs) {
  await import('./guard.js');
  fs.writeFileSync(path.join(dir, 'provider_override.tf.json'), JSON.stringify(providerOverride(), null, 2));
  return spawnSync('docker', dockerArgs(dir, tofuArgs), { stdio: 'inherit' });
}

// Command line:  node toolkit/tofu.js <tofu arguments>   (run it inside the folder that holds the .tf files)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await tofu(process.cwd(), process.argv.slice(2));
  process.exit(result.status ?? 1);
}
