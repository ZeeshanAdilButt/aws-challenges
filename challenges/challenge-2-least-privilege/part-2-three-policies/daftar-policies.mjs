// STEP 1: this part never calls AWS. It writes policies and tests them with the evaluator from part 1.
import '../../../toolkit/guard-offline.js';
import { evaluate } from '../../../toolkit/models/policy.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 2, part 2: three least-privilege policies for Daftar jobs';

const BUCKET = 'arn:aws:s3:::daftar-notes-prod';
const QUEUE = 'arn:aws:sqs:us-east-1:123456789012:daftar-jobs';
const doc = (...Statement) => ({ Version: '2012-10-17', Statement });

// STEP 2: the API. It reads and writes notes under notes/, and sends a job to the queue. Nothing else.
export const apiPolicy = doc(
  // YOUR TURN start
  // HINT: two Allow statements. Action is a list of exact actions, Resource is a specific ARN (a prefix ending in /* is fine).
  // YOUR TURN end
);

// STEP 3: the worker. It takes jobs from the queue, reads notes, and writes finished exports under exports/.
export const workerPolicy = doc(
  // YOUR TURN start
  // HINT: queue actions: ReceiveMessage, DeleteMessage, ChangeMessageVisibility, GetQueueAttributes.
  // YOUR TURN end
);

// STEP 4: the weekly report job. Read only, notes only, only from inside the VPC (10.20.0.0/16), and only in us-east-1.
export const reportPolicy = doc(
  // YOUR TURN start
  // HINT: ListBucket needs the bucket ARN and a StringLike condition on s3:prefix; GetObject needs the object ARNs.
  // HINT: both need an IpAddress condition on aws:SourceIp. Add a Deny with StringNotEquals on aws:RequestedRegion.
  // YOUR TURN end
);

export const policies = { api: apiPolicy, worker: workerPolicy, report: reportPolicy };

const inside = { 'aws:SourceIp': '10.20.4.9', 'aws:RequestedRegion': 'us-east-1' };
const req = (action, resource, context = inside) => ({ action, resource, context });
const note = `${BUCKET}/notes/7`;
const exportFile = `${BUCKET}/exports/7.csv`;

// What each policy must allow, and what it must refuse.
export const expectations = {
  api: {
    allow: [req('s3:GetObject', note), req('s3:PutObject', note), req('sqs:SendMessage', QUEUE)],
    deny: [
      req('s3:DeleteObject', note),
      req('s3:GetObject', exportFile),
      req('s3:PutObject', exportFile),
      req('sqs:ReceiveMessage', QUEUE),
      req('sqs:SendMessage', 'arn:aws:sqs:us-east-1:123456789012:daftar-billing'),
      req('s3:GetObject', 'arn:aws:s3:::daftar-notes-staging/notes/7'),
      req('iam:PassRole', 'arn:aws:iam::123456789012:role/admin'),
    ],
  },
  worker: {
    allow: [req('sqs:ReceiveMessage', QUEUE), req('sqs:DeleteMessage', QUEUE), req('s3:GetObject', note), req('s3:PutObject', exportFile)],
    deny: [req('sqs:SendMessage', QUEUE), req('sqs:PurgeQueue', QUEUE), req('s3:PutObject', note), req('s3:GetObject', exportFile), req('s3:DeleteObject', exportFile)],
  },
  report: {
    allow: [req('s3:ListBucket', BUCKET, { ...inside, 's3:prefix': 'notes/' }), req('s3:GetObject', note)],
    deny: [
      req('s3:GetObject', note, { 'aws:SourceIp': '203.0.113.9', 'aws:RequestedRegion': 'us-east-1' }),
      req('s3:PutObject', note),
      req('s3:GetObject', note, { 'aws:SourceIp': '10.20.4.9', 'aws:RequestedRegion': 'eu-west-1' }),
      req('s3:ListBucket', BUCKET, { ...inside, 's3:prefix': 'exports/' }),
    ],
  },
};

// STEP 5: check one policy against its expectations, and look for lazy wildcards in the Allow statements.
export function check(name) {
  const policy = policies[name];
  const { allow, deny } = expectations[name];
  const decide = (request) => evaluate(request, [policy]).decision;
  const lazy = [];
  for (const s of policy.Statement.filter((x) => x.Effect === 'Allow')) {
    for (const action of [s.Action].flat()) if (action === '*' || action.endsWith(':*')) lazy.push(`action ${action}`);
    for (const resource of [s.Resource].flat()) if (resource === '*') lazy.push('resource *');
  }
  return {
    name,
    allowed: allow.filter((r) => decide(r) === 'Allow').length,
    allowTotal: allow.length,
    denied: deny.filter((r) => decide(r) === 'Deny').length,
    denyTotal: deny.length,
    lazy,
    statements: policy.Statement.length,
  };
}

export async function run() {
  const rows = Object.keys(policies).map((name) => {
    const c = check(name);
    return [name, c.statements, `${c.allowed} of ${c.allowTotal}`, `${c.denied} of ${c.denyTotal}`, c.lazy.join(', ') || 'none'];
  });
  return {
    facts: [['Policies', String(rows.length)]],
    head: ['Policy', 'Statements', 'Requests allowed as wanted', 'Requests refused as wanted', 'Lazy wildcards'],
    rows,
  };
}

main(import.meta.url, run);
