import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, drill, rulesFor, rulesToAttrs } from './drift.mjs';

const d = await drill();

test('rulesToAttrs writes one sorted line per address range', () => {
  assert.deepEqual(rulesToAttrs(rulesFor(['10.20.4.0/22', '10.20.0.0/22'])), ['tcp/5432 from 10.20.0.0/22', 'tcp/5432 from 10.20.4.0/22']);
  assert.deepEqual(rulesToAttrs([{ IpProtocol: 'tcp', FromPort: 80, ToPort: 90, IpRanges: [{ CidrIp: '0.0.0.0/0' }] }]), ['tcp/80-90 from 0.0.0.0/0']);
  assert.deepEqual(rulesToAttrs([]), []);
});

test('before anyone touches it, the plan says there is nothing to do', () => {
  assert.equal(d.before.line, 'No changes.');
});

test('after the port is opened by hand, the plan wants to change the ingress rules', () => {
  assert.equal(d.drifted.line, 'Plan: 0 to add, 1 to change, 0 to destroy.');
  assert.deepEqual(d.drifted.steps[0].changed, ['ingress']);
  assert.deepEqual(d.added, ['tcp/5432 from 0.0.0.0/0']);
});

test('a database port open to the world is reverted, and then the plan is clean', () => {
  assert.equal(d.decision, 'revert');
  assert.equal(d.after.line, 'No changes.');
});

test('decide adopts a harmless addition', () => {
  assert.equal(decide(['tcp/5432 from 10.20.12.0/24']), 'adopt');
  assert.equal(decide(['tcp/5432 from 10.20.12.0/24', 'tcp/22 from 0.0.0.0/0']), 'revert');
});

test('the code makes its own VPC and group, so OpenTofu can create them and keep them in its state', async () => {
  const fs = await import('node:fs');
  const code = fs.readFileSync(new URL('./security-group.tf', import.meta.url), 'utf8');
  assert.match(code, /resource "aws_vpc" "main"/);
  assert.match(code, /vpc_id\s*=\s*aws_vpc\.main\.id/);
  assert.doesNotMatch(code, /vpc-from-part-1/);
  assert.ok(fs.existsSync(new URL('./versions.tf', import.meta.url)), 'versions.tf names the provider');
});
