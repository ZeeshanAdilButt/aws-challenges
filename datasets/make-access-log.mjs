// Generates datasets/daftar-api-access-log.jsonl: what the Daftar API role really did for 14 days.
// Seeded, so the file is the same on every run:  node datasets/make-access-log.mjs
// One JSON object per line: { time, principal, action, resource, context }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng } from '../toolkit/random.js';

export const SEED = 2026;
export const EVENTS = 600;
const ACCOUNT = '123456789012';
const BUCKET = 'daftar-notes-prod';

export function generate() {
  const random = rng(SEED);
  const start = Date.parse('2026-10-12T00:00:00Z');
  const span = 14 * 86_400_000;
  const noteArn = () => `arn:aws:s3:::${BUCKET}/notes/${random.int(1, 40)}`;
  // weight, action, resource builder
  const table = [
    [50, 's3:GetObject', noteArn],
    [20, 's3:PutObject', noteArn],
    [5, 's3:ListBucket', () => `arn:aws:s3:::${BUCKET}`],
    [10, 'sqs:SendMessage', () => `arn:aws:sqs:us-east-1:${ACCOUNT}:daftar-jobs`],
    [8, 'dynamodb:GetItem', () => `arn:aws:dynamodb:us-east-1:${ACCOUNT}:table/daftar-sessions`],
    [4, 'dynamodb:PutItem', () => `arn:aws:dynamodb:us-east-1:${ACCOUNT}:table/daftar-sessions`],
    [1, 'secretsmanager:GetSecretValue', () => `arn:aws:secretsmanager:us-east-1:${ACCOUNT}:secret:daftar/db-AbCdEf`],
    [2, 'logs:PutLogEvents', () => `arn:aws:logs:us-east-1:${ACCOUNT}:log-group:/daftar/api:log-stream:api-${random.int(1, 3)}`],
  ];
  const total = table.reduce((sum, row) => sum + row[0], 0);
  const events = [];
  for (let i = 0; i < EVENTS; i++) {
    let pick = random.next() * total;
    const row = table.find((r) => (pick -= r[0]) < 0) ?? table[0];
    events.push({
      time: new Date(start + Math.floor(random.next() * span)).toISOString(),
      principal: 'daftar-api',
      action: row[1],
      resource: row[2](),
      context: { 'aws:SourceIp': `10.20.${random.int(0, 3)}.${random.int(10, 250)}`, 'aws:SecureTransport': 'true' },
    });
  }
  return events.sort((a, b) => a.time.localeCompare(b.time));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'daftar-api-access-log.jsonl');
  fs.writeFileSync(file, generate().map((e) => JSON.stringify(e)).join('\n') + '\n');
  console.log(`wrote ${file}`);
}
