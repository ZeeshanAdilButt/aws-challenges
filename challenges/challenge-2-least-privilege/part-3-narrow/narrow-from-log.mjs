// STEP 1: this part never calls AWS. It reads a log file and builds a policy.
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { evaluate } from '../../../toolkit/models/policy.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 2, part 3: narrow a wide policy from an access log';

export const LOG_FILE = new URL('../../../datasets/daftar-api-access-log.jsonl', import.meta.url);

// STEP 2: read the log. One JSON object per line.
export function loadLog(file = LOG_FILE) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

// The policy Daftar started with: every action of five services, on every resource.
export const widePolicy = {
  Version: '2012-10-17',
  Statement: [{ Sid: 'Everything', Effect: 'Allow', Action: ['s3:*', 'sqs:*', 'dynamodb:*', 'secretsmanager:*', 'logs:*'], Resource: '*' }],
};

// STEP 3: turn a log into a policy that allows exactly what happened (your turn).
// Rule of thumb: one statement per set of resources. When 3 or more resources share a folder
// (the part of the ARN before the last "/" or ":"), write the folder once with a /* or :* ending.
export function narrow(events) {
  // YOUR TURN start
  // HINT: group the events by action, keeping the distinct resources of each action.
  // HINT: collapse(resources) -> if 3 or more share a folder, use folder + '*'; otherwise list them.
  // HINT: actions that end up with the same resource list can share one statement. Sort for a stable result.
  // YOUR TURN end
}

// Requests the API never made. A good policy refuses them; the wide one allows most of them.
const ACCT = '123456789012';
export const probes = [
  { action: 's3:DeleteObject', resource: 'arn:aws:s3:::daftar-notes-prod/notes/1' },
  { action: 's3:DeleteBucket', resource: 'arn:aws:s3:::daftar-notes-prod' },
  { action: 's3:PutBucketPolicy', resource: 'arn:aws:s3:::daftar-notes-prod' },
  { action: 's3:GetObject', resource: 'arn:aws:s3:::daftar-notes-prod/exports/report.csv' },
  { action: 's3:GetObject', resource: 'arn:aws:s3:::daftar-billing/invoices/1.pdf' },
  { action: 'sqs:PurgeQueue', resource: `arn:aws:sqs:us-east-1:${ACCT}:daftar-jobs` },
  { action: 'sqs:ReceiveMessage', resource: `arn:aws:sqs:us-east-1:${ACCT}:daftar-jobs` },
  { action: 'sqs:SendMessage', resource: `arn:aws:sqs:us-east-1:${ACCT}:daftar-billing` },
  { action: 'dynamodb:DeleteTable', resource: `arn:aws:dynamodb:us-east-1:${ACCT}:table/daftar-sessions` },
  { action: 'dynamodb:Scan', resource: `arn:aws:dynamodb:us-east-1:${ACCT}:table/daftar-sessions` },
  { action: 'dynamodb:PutItem', resource: `arn:aws:dynamodb:us-east-1:${ACCT}:table/daftar-users` },
  { action: 'secretsmanager:GetSecretValue', resource: `arn:aws:secretsmanager:us-east-1:${ACCT}:secret:daftar/stripe-XyZ123` },
  { action: 'secretsmanager:DeleteSecret', resource: `arn:aws:secretsmanager:us-east-1:${ACCT}:secret:daftar/db-AbCdEf` },
  { action: 'logs:DeleteLogGroup', resource: `arn:aws:logs:us-east-1:${ACCT}:log-group:/daftar/api` },
  { action: 'iam:CreateUser', resource: `arn:aws:iam::${ACCT}:user/intruder` },
  { action: 'ec2:RunInstances', resource: `arn:aws:ec2:us-east-1:${ACCT}:instance/*` },
];

const allowed = (policy, request) => evaluate({ ...request, context: request.context ?? {} }, [policy]).decision === 'Allow';

// How a policy does on the whole log and on the probes.
export function measure(policy, events = loadLog()) {
  return {
    logAllowed: events.filter((e) => allowed(policy, e)).length,
    logTotal: events.length,
    probesAllowed: probes.filter((p) => allowed(policy, p)).length,
    probesTotal: probes.length,
  };
}

export async function run() {
  const events = loadLog();
  const narrowed = narrow(events);
  const wide = measure(widePolicy, events);
  const tight = measure(narrowed, events);
  const actionsIn = (policy) => new Set(policy.Statement.flatMap((s) => [s.Action].flat())).size;
  return {
    facts: [
      ['Log events read', String(events.length)],
      ['Distinct actions in the log', String(new Set(events.map((e) => e.action)).size)],
    ],
    head: ['Policy', 'Statements', 'Actions listed', 'Logged calls still allowed', 'Unlogged probes allowed'],
    rows: [
      ['wide (starting point)', widePolicy.Statement.length, `${actionsIn(widePolicy)} wildcards`, `${wide.logAllowed} of ${wide.logTotal}`, `${wide.probesAllowed} of ${wide.probesTotal}`],
      ['narrowed from the log', narrowed.Statement.length, actionsIn(narrowed), `${tight.logAllowed} of ${tight.logTotal}`, `${tight.probesAllowed} of ${tight.probesTotal}`],
    ],
    chart: {
      title: 'Unlogged risky requests each policy allows (16 tried)',
      unit: 'requests',
      bars: [
        { label: 'wide policy', value: wide.probesAllowed },
        { label: 'narrowed policy', value: tight.probesAllowed },
      ],
    },
  };
}

main(import.meta.url, run);
