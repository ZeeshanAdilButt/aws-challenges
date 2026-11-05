// STEP 1: the guard first.
import '../../../toolkit/guard.js';
import fs from 'node:fs';
import { GetAccessKeyLastUsedCommand, GetAccountPasswordPolicyCommand, ListAccessKeysCommand, ListUsersCommand } from '@aws-sdk/client-iam';
import { GetBucketPolicyStatusCommand, GetPublicAccessBlockCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { iam as makeIam, s3 as makeS3 } from '../../../toolkit/aws.js';
import { main } from '../../../toolkit/part.js';
import { ROOT_FILE, seedAccount } from '../part-1-seed/seed-account.mjs';

export const title = 'Challenge 1, part 2: the audit script';

// A finding has the AWS name of the check, a plain title, the thing at fault and what to do.
export const finding = (id, name, resource, fix, extra = {}) => ({ id, name, resource, fix, ...extra });

const missing = (error) => error.name.startsWith('NoSuch');

// STEP 2: the root user's keys. Provided: it reads the small file from part 1.
export function checkRoot(rootFile = ROOT_FILE) {
  const root = JSON.parse(fs.readFileSync(rootFile, 'utf8'));
  return root.accessKeys > 0
    ? [finding('IAM.4', 'Root user has an access key', 'root', 'Delete the root access keys and use roles or IAM users instead')]
    : [];
}

// STEP 3: the password policy. Missing is a finding. So is a weak one (under 14 characters, or a missing character type).
export async function checkPasswordPolicy(iam) {
  // YOUR TURN start
  // HINT: GetAccountPasswordPolicyCommand throws NoSuchEntityException when there is no policy.
  // HINT: the policy has MinimumPasswordLength and RequireSymbols, RequireNumbers, RequireUppercaseCharacters, RequireLowercaseCharacters.
  // YOUR TURN end
}

// STEP 4: buckets that the whole internet can read. A bucket is public when its policy says so
// and the bucket does not restrict public policies.
export async function checkBuckets(s3) {
  // YOUR TURN start
  // HINT: GetBucketPolicyStatusCommand gives PolicyStatus.IsPublic (error NoSuchBucketPolicy means no policy).
  // HINT: GetPublicAccessBlockCommand gives RestrictPublicBuckets (error NoSuchPublicAccessBlockConfiguration means none).
  // YOUR TURN end
}

// STEP 5: active keys nobody uses. A key with no "last used" date has never been used.
// minAgeDays is how old the idle time must be before it counts: 0 here, because the emulator's keys are new. 45 in a real account.
export async function checkKeys(iam, { now = new Date(), minAgeDays = 0 } = {}) {
  // YOUR TURN start
  // HINT: ListUsersCommand, then ListAccessKeysCommand per user, then GetAccessKeyLastUsedCommand per active key.
  // HINT: AccessKeyLastUsed.LastUsedDate is missing when the key was never used; then count from the key's CreateDate.
  // YOUR TURN end
}

// STEP 6: run all four checks and sort the findings so the report is the same every time.
export async function audit({ iam = makeIam(), s3 = makeS3(), rootFile = ROOT_FILE, now, minAgeDays = 0 } = {}) {
  const all = [...checkRoot(rootFile), ...(await checkPasswordPolicy(iam)), ...(await checkBuckets(s3)), ...(await checkKeys(iam, { now, minAgeDays }))];
  return all.sort((a, b) => `${a.id}${a.resource}`.localeCompare(`${b.id}${b.resource}`));
}

export async function run() {
  await seedAccount();
  const findings = await audit();
  return {
    facts: [['Findings', String(findings.length)]],
    head: ['AWS check', 'Finding', 'Where', 'What to do'],
    rows: findings.map((f) => [f.id, f.name, f.resource, f.fix]),
  };
}

main(import.meta.url, run);
