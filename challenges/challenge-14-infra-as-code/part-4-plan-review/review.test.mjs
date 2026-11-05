import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlan, review } from './review.mjs';

const items = parsePlan();
const found = review(items);

test('the plan has six changes', () => {
  assert.equal(items.length, 6);
  assert.equal(items.find((i) => i.address === 'aws_db_instance.main').action, 'replace');
});

test('exactly the three risky addresses are named', () => {
  assert.deepEqual(found.map((f) => f.address).sort(), ['aws_db_instance.main', 'aws_iam_policy.deploy', 'aws_security_group_rule.db_from_world']);
});

test('the safe changes are not flagged', () => {
  for (const safe of ['aws_cloudwatch_log_group.api', 'aws_vpc.main', 'aws_subnet.app_c']) assert.ok(!found.some((f) => f.address === safe), safe);
});

test('every finding says what could go wrong and what you ask for', () => {
  for (const f of found) {
    assert.ok(f.risk.length > 25, `${f.address} risk`);
    assert.ok(f.ask.length > 25, `${f.address} ask`);
  }
});

test('the database finding talks about data and the policy finding about the wildcard', () => {
  const by = Object.fromEntries(found.map((f) => [f.address, `${f.risk} ${f.ask}`.toLowerCase()]));
  assert.match(by['aws_db_instance.main'], /data|snapshot|empty/);
  assert.match(by['aws_iam_policy.deploy'], /every|all|\*|narrow/);
  assert.match(by['aws_security_group_rule.db_from_world'], /internet|world|open/);
});
