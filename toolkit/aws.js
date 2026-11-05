// SDK clients that can only talk to the emulator. Importing this file runs the guard first.
import './guard.js';
import { S3Client } from '@aws-sdk/client-s3';
import { IAMClient } from '@aws-sdk/client-iam';
import { EC2Client } from '@aws-sdk/client-ec2';
import { STSClient } from '@aws-sdk/client-sts';
import { ECSClient } from '@aws-sdk/client-ecs';
import { SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export const endpoint = process.env.AWS_ENDPOINT_URL;
export const region = process.env.AWS_REGION ?? 'us-east-1';

function config(extra = {}) {
  return { endpoint, region, credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, ...extra };
}

export const s3 = () => new S3Client(config({ forcePathStyle: true }));
export const iam = () => new IAMClient(config());
export const ec2 = () => new EC2Client(config());
export const sts = () => new STSClient(config());
export const ecs = () => new ECSClient(config());
export const sqs = () => new SQSClient(config());
export const dynamodb = () => new DynamoDBClient(config());

// moto keeps everything in memory. This empties it, so a challenge starts from a clean account.
// Only ever sent to the endpoint the guard has already approved.
export async function resetEmulator() {
  const response = await fetch(`${endpoint}/moto-api/reset`, { method: 'POST' });
  if (!response.ok) throw new Error(`Could not reset the emulator (HTTP ${response.status}).`);
}
