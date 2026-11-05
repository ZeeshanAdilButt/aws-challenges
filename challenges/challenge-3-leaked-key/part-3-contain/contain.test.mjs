import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CreateAccessKeyCommand, CreateUserCommand, GetUserPolicyCommand, ListAccessKeysCommand } from '@aws-sdk/client-iam';
import { iam as makeIam, resetEmulator } from '../../../toolkit/aws.js';
import { evaluate } from '../../../toolkit/models/policy.js';
import { loadEvents } from '../part-1-event-log/inspect-log.mjs';
import { LEAKED_KEY, TRUSTED_IPS, scopeKey } from '../part-2-scope/scope-key.mjs';
import { PHASES, POLICY_NAME, buildPlan, denyPolicy, execute, runbookEntry, stillAllowed } from './contain.mjs';

const events = loadEvents();
const scope = scopeKey(events, LEAKED_KEY, TRUSTED_IPS);

test('the deny policy beats an allow-everything policy for any action', () => {
  const allowAll = { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }] };
  for (const action of ['s3:GetObject', 'ec2:RunInstances', 'iam:CreateUser', 'sts:GetCallerIdentity']) {
    const result = evaluate({ action, resource: '*', context: {} }, [allowAll, denyPolicy(scope)]);
    assert.equal(result.reason, 'explicit-deny', action);
  }
});

test('after containment none of the stranger calls would still succeed', () => {
  const after = stillAllowed(events, scope);
  assert.ok(after.calls > 100);
  assert.equal(after.stillOk, 0);
});

test('the plan has the phases in order, contain first', () => {
  const plan = buildPlan(scope);
  assert.deepEqual(plan.map((p) => p.order), plan.map((_, i) => i + 1));
  const rank = plan.map((p) => PHASES.indexOf(p.phase));
  assert.ok(rank.every((r) => r >= 1), 'every step needs a phase from PHASES, after Detect');
  assert.deepEqual(rank, [...rank].sort((a, b) => a - b));
  assert.equal(plan[0].api, 'iam:UpdateAccessKey');
  assert.equal(plan[1].api, 'iam:PutUserPolicy');
  assert.equal(new Set(plan.map((p) => p.phase)).size, 4);
});

test('running the plan on the emulator switches the key off and attaches the policy', async () => {
  const iam = makeIam();
  await resetEmulator();
  await iam.send(new CreateUserCommand({ UserName: scope.owner }));
  const { AccessKey } = await iam.send(new CreateAccessKeyCommand({ UserName: scope.owner }));
  const ran = await execute(buildPlan({ ...scope, keyId: AccessKey.AccessKeyId }), iam);
  assert.deepEqual(ran.filter((r) => r.ran).map((r) => r.order), [1, 2]);
  const key = (await iam.send(new ListAccessKeysCommand({ UserName: scope.owner }))).AccessKeyMetadata[0];
  assert.equal(key.Status, 'Inactive');
  const attached = await iam.send(new GetUserPolicyCommand({ UserName: scope.owner, PolicyName: POLICY_NAME }));
  const document = JSON.parse(decodeURIComponent(attached.PolicyDocument));
  assert.equal(document.Statement[0].Effect, 'Deny');
});

test('the runbook entry has every phase heading and the numbers', () => {
  const text = runbookEntry(scope);
  for (const phase of PHASES) assert.match(text, new RegExp(`^## ${phase}$`, 'm'));
  for (const needle of [scope.keyId, scope.owner, scope.suspect.firstSeen, scope.suspect.lastSeen, String(scope.suspect.calls), String(scope.suspect.objectsRead), String(scope.suspect.instancesLaunched)]) {
    assert.ok(text.includes(needle), `the runbook should mention ${needle}`);
  }
  assert.ok(!text.includes(String.fromCharCode(0x2014)) && !text.includes(String.fromCharCode(0x2013)), 'no long dashes');
});
