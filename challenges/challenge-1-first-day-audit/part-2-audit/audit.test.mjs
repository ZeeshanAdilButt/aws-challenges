import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateAccountPasswordPolicyCommand } from '@aws-sdk/client-iam';
import { iam as makeIam, s3 as makeS3 } from '../../../toolkit/aws.js';
import { seedAccount } from '../part-1-seed/seed-account.mjs';
import { audit } from './audit.mjs';

const iam = makeIam();
const s3 = makeS3();
await seedAccount({ iam, s3 });

const summary = (findings) => findings.map((f) => `${f.id} ${f.resource}`);

test('finds the six planted problems and nothing else', async () => {
  const findings = await audit({ iam, s3 });
  assert.deepEqual(summary(findings), [
    'IAM.22 asif (key 1 of 1)',
    'IAM.22 ci-deploy (key 1 of 1)',
    'IAM.22 old-contractor (key 1 of 1)',
    'IAM.4 root',
    'IAM.7 account',
    'S3.2 daftar-public-assets',
  ]);
});

test('leaves the private bucket and the switched-off key alone', async () => {
  const text = JSON.stringify(await audit({ iam, s3 }));
  assert.ok(!text.includes('daftar-notes-private'));
  assert.ok(!text.includes('aqib'));
});

test('every finding says what to do', async () => {
  for (const f of await audit({ iam, s3 })) assert.ok(f.fix && f.fix.length > 10, f.id);
});

test('a key only counts after it has been idle long enough', async () => {
  const findings = await audit({ iam, s3, minAgeDays: 45 });
  assert.equal(findings.filter((f) => f.id === 'IAM.22').length, 0);
  const later = new Date(Date.now() + 60 * 86_400_000);
  assert.equal((await audit({ iam, s3, minAgeDays: 45, now: later })).filter((f) => f.id === 'IAM.22').length, 3);
});

test('a weak password policy is still a finding, a strong one is not', async () => {
  const policy = { MinimumPasswordLength: 8, RequireSymbols: true, RequireNumbers: true, RequireUppercaseCharacters: true, RequireLowercaseCharacters: true };
  await iam.send(new UpdateAccountPasswordPolicyCommand(policy));
  const weak = (await audit({ iam, s3 })).find((f) => f.id === 'IAM.7');
  assert.match(weak.name, /under 14 characters/);
  await iam.send(new UpdateAccountPasswordPolicyCommand({ ...policy, MinimumPasswordLength: 14 }));
  assert.equal((await audit({ iam, s3 })).filter((f) => f.id === 'IAM.7').length, 0);
});
