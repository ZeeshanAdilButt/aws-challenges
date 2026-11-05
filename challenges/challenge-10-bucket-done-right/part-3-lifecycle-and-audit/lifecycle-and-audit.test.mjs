import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classForAge } from '../../../toolkit/models/s3cost.js';
import { costRules, distribution, drill, estimate, lifecycleRules } from './lifecycle-and-audit.mjs';

const d = await drill();

test('the lifecycle rule moves to Standard-IA at 30 days and Glacier IR at 90, and expires old versions', () => {
  const rule = lifecycleRules()[0];
  assert.equal(rule.Status, 'Enabled');
  assert.deepEqual(rule.Transitions.map((t) => [t.Days, t.StorageClass]), [[30, 'STANDARD_IA'], [90, 'GLACIER_IR']]);
  assert.equal(rule.NoncurrentVersionExpiration.NoncurrentDays, 365);
});

test('the emulator stored the rule', () => {
  assert.equal(d.stored.length, 1);
  assert.equal(d.stored[0].Transitions.length, 2);
});

test('distribution: 365 days of data split by age', () => {
  const gb = distribution(36500, 365, costRules(lifecycleRules()));
  assert.deepEqual(gb, { standard: 3000, ia: 6000, glacierIr: 27500 });
});

test('distribution follows classForAge on a tiny example', () => {
  const rules = [{ afterDays: 1, class: 'ia' }];
  assert.equal(classForAge(0, rules), 'standard');
  assert.deepEqual(distribution(100, 4, rules), { standard: 25, ia: 75, glacierIr: 0 });
});

test('the estimate for the 100 TB sample: all Standard is 2,300 dollars of storage, the rules cost much less', () => {
  const e = estimate(lifecycleRules());
  assert.equal(e.before.storage, 2300);
  assert.ok(e.after.total < e.before.total * 0.5, `after ${e.after.total} before ${e.before.total}`);
});

test('the audit finds all five problems in a careless bucket', () => {
  assert.deepEqual(d.oldFindings.map((f) => f.name).sort(), ['Block Public Access', 'Bucket policy: TLS only', 'Default encryption', 'Lifecycle configuration', 'Versioning']);
});

test('the audit of the locked bucket finds only the missing lifecycle rules, and then nothing', () => {
  assert.deepEqual(d.beforeLifecycle.map((f) => f.name), ['Lifecycle configuration']);
  assert.deepEqual(d.afterLifecycle, []);
});
