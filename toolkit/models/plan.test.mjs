import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planDiff } from './plan.js';

const vpc = (attrs = { cidr_block: '10.20.0.0/16' }) => ({ id: 'aws_vpc.main', type: 'aws_vpc', attrs, dependsOn: [] });
const subnet = (attrs = { cidr_block: '10.20.0.0/22' }) => ({ id: 'aws_subnet.a', type: 'aws_subnet', attrs, dependsOn: ['aws_vpc.main'] });
const summary = (plan) => plan.steps.map((s) => `${s.action}:${s.id}`);

test('same desired and state: no changes', () => {
  const plan = planDiff([vpc(), subnet()], [vpc(), subnet()]);
  assert.equal(plan.line, 'No changes.');
  assert.equal(plan.counts.noop, 2);
  assert.deepEqual(plan.steps, []);
});
test('empty state: the VPC is created before its subnet, even when listed after', () => {
  const plan = planDiff([subnet(), vpc()], []);
  assert.deepEqual(summary(plan), ['create:aws_vpc.main', 'create:aws_subnet.a']);
  assert.equal(plan.line, 'Plan: 2 to add, 0 to change, 0 to destroy.');
});
test('different tags are an update', () => {
  const plan = planDiff([vpc({ cidr_block: '10.20.0.0/16', tags: { team: 'a' } })], [vpc({ cidr_block: '10.20.0.0/16', tags: { team: 'b' } })]);
  assert.deepEqual(plan.steps, [{ id: 'aws_vpc.main', action: 'update', changed: ['tags'] }]);
  assert.equal(plan.line, 'Plan: 0 to add, 1 to change, 0 to destroy.');
});
test('a changed attribute that forces replacement is a replace', () => {
  const plan = planDiff([vpc({ cidr_block: '10.30.0.0/16' })], [vpc()], { aws_vpc: ['cidr_block'] });
  assert.deepEqual(plan.steps, [{ id: 'aws_vpc.main', action: 'replace', changed: ['cidr_block'] }]);
  assert.equal(plan.line, 'Plan: 1 to add, 0 to change, 1 to destroy.');
});
test('deleting everything removes the subnet before the VPC', () => {
  const plan = planDiff([], [vpc(), subnet()]);
  assert.deepEqual(summary(plan), ['delete:aws_subnet.a', 'delete:aws_vpc.main']);
  assert.equal(plan.line, 'Plan: 0 to add, 0 to change, 2 to destroy.');
});
test('creates come before deletes', () => {
  const extra = { id: 'aws_s3_bucket.logs', type: 'aws_s3_bucket', attrs: {}, dependsOn: [] };
  const plan = planDiff([vpc()], [vpc(), extra]);
  assert.deepEqual(summary(plan), ['delete:aws_s3_bucket.logs']);
  const mixed = planDiff([vpc(), subnet()], [vpc(), extra]);
  assert.deepEqual(summary(mixed), ['create:aws_subnet.a', 'delete:aws_s3_bucket.logs']);
});
test('an attribute only in the state counts as an update', () => {
  const plan = planDiff([vpc({ cidr_block: '10.20.0.0/16' })], [vpc({ cidr_block: '10.20.0.0/16', enable_dns: true })]);
  assert.deepEqual(plan.steps, [{ id: 'aws_vpc.main', action: 'update', changed: ['enable_dns'] }]);
});
test('a cycle throws', () => {
  const a = { id: 'a', type: 't', attrs: {}, dependsOn: ['b'] };
  const b = { id: 'b', type: 't', attrs: {}, dependsOn: ['a'] };
  assert.throws(() => planDiff([a, b], []), /Cycle: a -> b -> a/);
});
test('a missing dependency throws', () => {
  assert.throws(() => planDiff([subnet()], []), /Unknown dependency: aws_subnet.a needs aws_vpc.main/);
});
test('independent resources come out in id order', () => {
  const item = (id) => ({ id, type: 't', attrs: {}, dependsOn: [] });
  assert.deepEqual(summary(planDiff([item('c'), item('a'), item('b')], [])), ['create:a', 'create:b', 'create:c']);
});
test('a replaced VPC with an unchanged subnet shows only the VPC (no cascade)', () => {
  const plan = planDiff([vpc({ cidr_block: '10.30.0.0/16' }), subnet()], [vpc(), subnet()], { aws_vpc: ['cidr_block'] });
  assert.deepEqual(summary(plan), ['replace:aws_vpc.main']);
  assert.equal(plan.counts.noop, 1);
});
test('attribute order does not matter', () => {
  const a = vpc({ cidr_block: 'x', tags: { a: 1, b: 2 } });
  const b = vpc({ tags: { b: 2, a: 1 }, cidr_block: 'x' });
  assert.equal(planDiff([a], [b]).line, 'No changes.');
});
