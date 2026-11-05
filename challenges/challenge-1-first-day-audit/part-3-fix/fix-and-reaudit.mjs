// STEP 1: the guard first.
import '../../../toolkit/guard.js';
import fs from 'node:fs';
import { UpdateAccessKeyCommand, UpdateAccountPasswordPolicyCommand } from '@aws-sdk/client-iam';
import { DeleteBucketPolicyCommand, PutPublicAccessBlockCommand } from '@aws-sdk/client-s3';
import { iam as makeIam, s3 as makeS3 } from '../../../toolkit/aws.js';
import { main } from '../../../toolkit/part.js';
import { ROOT_FILE, seedAccount } from '../part-1-seed/seed-account.mjs';
import { audit } from '../part-2-audit/audit.mjs';

export const title = 'Challenge 1, part 3: fix and audit again';

// STEP 2: root keys. Provided. In a real account you sign in as root once and delete the key in the console.
export function fixRoot(rootFile = ROOT_FILE) {
  fs.writeFileSync(rootFile, JSON.stringify({ accessKeys: 0 }, null, 2));
}

// STEP 3: a strong password policy: 14 characters, all four types, passwords expire in 90 days, last 24 cannot be reused.
export async function fixPasswordPolicy(iam) {
  // YOUR TURN start
  // HINT: UpdateAccountPasswordPolicyCommand({ MinimumPasswordLength, RequireSymbols, RequireNumbers,
  // HINT:   RequireUppercaseCharacters, RequireLowercaseCharacters, MaxPasswordAge, PasswordReusePrevention })
  // YOUR TURN end
}

// STEP 4: close the public bucket. Turn on all four Block Public Access settings and remove the public policy.
export async function fixBucket(s3, bucket) {
  // YOUR TURN start
  // HINT: PutPublicAccessBlockCommand with BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, RestrictPublicBuckets all true.
  // HINT: DeleteBucketPolicyCommand({ Bucket })
  // YOUR TURN end
}

// STEP 5: switch an unused key off. Switching off can be undone; deleting cannot, so it comes later.
export async function fixKey(iam, finding) {
  // YOUR TURN start
  // HINT: UpdateAccessKeyCommand({ UserName, AccessKeyId, Status: 'Inactive' }). The finding carries user and keyId.
  // YOUR TURN end
}

// STEP 6: fix each finding by its check name.
export async function fixAll(findings, { iam = makeIam(), s3 = makeS3(), rootFile = ROOT_FILE } = {}) {
  for (const f of findings) {
    if (f.id === 'IAM.4') fixRoot(rootFile);
    else if (f.id === 'IAM.7') await fixPasswordPolicy(iam);
    else if (f.id === 'S3.2') await fixBucket(s3, f.resource);
    else if (f.id === 'IAM.22') await fixKey(iam, f);
  }
}

export async function run() {
  await seedAccount();
  const before = await audit();
  await fixAll(before);
  const after = await audit();
  return {
    facts: [['Findings before', String(before.length)], ['Findings after', String(after.length)]],
    head: ['AWS check', 'Where', 'Before', 'After'],
    rows: before.map((f) => [f.id, f.resource, 'finding', after.some((a) => a.id === f.id && a.resource === f.resource) ? 'STILL OPEN' : 'fixed']),
    chart: {
      title: 'Findings in the fake account',
      unit: 'findings',
      bars: [{ label: 'before the fixes', value: before.length }, { label: 'after the fixes', value: after.length }],
    },
  };
}

main(import.meta.url, run);
