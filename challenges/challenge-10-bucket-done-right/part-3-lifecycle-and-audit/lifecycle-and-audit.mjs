// STEP 1: the guard first. This part sets rules on buckets and reads them back, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import {
  CreateBucketCommand, GetBucketEncryptionCommand, GetBucketLifecycleConfigurationCommand, GetBucketPolicyCommand, GetBucketVersioningCommand,
  GetPublicAccessBlockCommand, PutBucketLifecycleConfigurationCommand, PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { resetEmulator, s3 as makeS3 } from '../../../toolkit/aws.js';
import { classForAge, monthlyCost } from '../../../toolkit/models/s3cost.js';
import { main } from '../../../toolkit/part.js';
import { lockBucket } from '../part-1-locked-bucket/bucket.mjs';
import { bucketPolicy } from '../part-2-policy-and-presign/policy-and-presign.mjs';

export const title = 'Challenge 10, part 3: lifecycle rules, a cost estimate and an audit';

// STEP 2: the lifecycle rules (your turn). One rule for the whole bucket, in the format of PutBucketLifecycleConfiguration:
//   after 30 days move objects to STANDARD_IA, after 90 days to GLACIER_IR
//   delete old versions (noncurrent) 365 days after they became old
// Return the Rules list.
export function lifecycleRules() {
  // YOUR TURN start
  // HINT: { ID, Status: 'Enabled', Filter: { Prefix: '' }, Transitions: [{ Days, StorageClass }], NoncurrentVersionExpiration: { NoncurrentDays } }
  // YOUR TURN end
}

const CLASS_OF = { STANDARD_IA: 'ia', GLACIER_IR: 'glacierIr' };
export const costRules = (rules) => rules.flatMap((r) => (r.Transitions ?? []).map((t) => ({ afterDays: t.Days, class: CLASS_OF[t.StorageClass] })));

// STEP 3: how many GB end up in each class (your turn). A sample bucket holds totalGb, spread evenly over ages 0 to maxAgeDays - 1
// (the same amount for each day of age). costRules gives [{ afterDays, class }]. Return { standard, ia, glacierIr } in GB, rounded to whole GB.
export function distribution(totalGb, maxAgeDays, rules) {
  // YOUR TURN start
  // HINT: use classForAge(age, rules) for each day of age and add totalGb / maxAgeDays to that class.
  // YOUR TURN end
}

// The sample: 100 TB (100,000 GB), 10 million uploads a month, 20 million reads a month, objects up to 365 days old.
// Reads and uploads follow the data: new data is read most. Provided and stated: this is a made-up bucket.
export const SAMPLE = { gb: 100000, puts: 10e6, transitionsPerMonth: 4e6, maxAge: 365, getsStandard: 17e6, getsIa: 2e6, getsGlacierIr: 1e6, retrieveGlacierGb: 500 };

export function estimate(rules) {
  const before = monthlyCost({ gb: { standard: SAMPLE.gb }, puts: SAMPLE.puts, gets: { standard: SAMPLE.getsStandard + SAMPLE.getsIa + SAMPLE.getsGlacierIr } });
  const gb = distribution(SAMPLE.gb, SAMPLE.maxAge, costRules(rules));
  const after = monthlyCost({ gb, puts: SAMPLE.puts, transitions: SAMPLE.transitionsPerMonth, gets: { standard: SAMPLE.getsStandard, ia: SAMPLE.getsIa, glacierIr: SAMPLE.getsGlacierIr }, retrieveGb: { glacierIr: SAMPLE.retrieveGlacierGb } });
  return { before, after, gb };
}

// STEP 4: the audit. Provided. Each finding uses the AWS name of the setting.
async function safely(promise) {
  try {
    return await promise;
  } catch (error) {
    return { missing: error.name };
  }
}
export async function audit(s3, bucket) {
  const findings = [];
  const block = await safely(s3.send(new GetPublicAccessBlockCommand({ Bucket: bucket })));
  const cfg = block.PublicAccessBlockConfiguration;
  if (!cfg || !(cfg.BlockPublicAcls && cfg.IgnorePublicAcls && cfg.BlockPublicPolicy && cfg.RestrictPublicBuckets)) findings.push({ name: 'Block Public Access', detail: 'not all four switches are on' });
  const enc = await safely(s3.send(new GetBucketEncryptionCommand({ Bucket: bucket })));
  if (enc.missing) findings.push({ name: 'Default encryption', detail: 'no default encryption rule' });
  const ver = await safely(s3.send(new GetBucketVersioningCommand({ Bucket: bucket })));
  if (ver.Status !== 'Enabled') findings.push({ name: 'Versioning', detail: 'not enabled' });
  const life = await safely(s3.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket })));
  if (life.missing || !life.Rules?.length) findings.push({ name: 'Lifecycle configuration', detail: 'no rules' });
  const pol = await safely(s3.send(new GetBucketPolicyCommand({ Bucket: bucket })));
  if (pol.missing || !/securetransport/i.test(pol.Policy ?? '')) findings.push({ name: 'Bucket policy: TLS only', detail: 'no statement refuses plain HTTP' });
  return findings;
}

export async function drill() {
  const s3 = makeS3();
  await resetEmulator();
  await s3.send(new CreateBucketCommand({ Bucket: 'daftar-old' })); // made without any care
  const oldFindings = await audit(s3, 'daftar-old');
  await lockBucket(s3, 'daftar-notes-prod');
  await s3.send(new PutBucketPolicyCommand({ Bucket: 'daftar-notes-prod', Policy: JSON.stringify(bucketPolicy('daftar-notes-prod')) }));
  const beforeLifecycle = await audit(s3, 'daftar-notes-prod');
  await s3.send(new PutBucketLifecycleConfigurationCommand({ Bucket: 'daftar-notes-prod', LifecycleConfiguration: { Rules: lifecycleRules() } }));
  const stored = (await s3.send(new GetBucketLifecycleConfigurationCommand({ Bucket: 'daftar-notes-prod' }))).Rules;
  const afterLifecycle = await audit(s3, 'daftar-notes-prod');
  return { oldFindings, beforeLifecycle, afterLifecycle, stored };
}

export async function run() {
  const d = await drill();
  const e = estimate(lifecycleRules());
  const saved = Math.round((e.before.total - e.after.total) * 100) / 100;
  return {
    facts: [
      ['Audit of the careless bucket', `${d.oldFindings.length} findings: ${d.oldFindings.map((f) => f.name).join(', ')}`],
      ['Audit of the locked bucket before the lifecycle rules', `${d.beforeLifecycle.length} finding: ${d.beforeLifecycle.map((f) => f.name).join(', ') || 'none'}`],
      ['Audit after the lifecycle rules', `${d.afterLifecycle.length} findings`],
      ['Sample', `100 TB, ${SAMPLE.puts / 1e6} million uploads a month, objects up to ${SAMPLE.maxAge} days old; made up for the exercise`],
      ['Where the data ends up (GB)', `Standard ${e.gb.standard}, Standard-IA ${e.gb.ia}, Glacier Instant Retrieval ${e.gb.glacierIr}`],
      ['Monthly saving from the rules', `${saved.toFixed(2)} dollars`],
    ],
    head: ['', 'Storage', 'Requests', 'Retrieval', 'Total (dollars a month)'],
    rows: [
      ['All in Standard', e.before.storage, e.before.requests, e.before.retrieval, e.before.total],
      ['With the lifecycle rules', e.after.storage, e.after.requests, e.after.retrieval, e.after.total],
    ],
    chart: { title: 'Monthly cost of the 100 TB sample in dollars', unit: 'dollars', format: (v) => v.toFixed(0), bars: [{ label: 'all in Standard', value: e.before.total }, { label: 'with lifecycle rules', value: e.after.total }] },
  };
}

main(import.meta.url, run);
