import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hasVariable, parseResources, tfText } from '../../../toolkit/hcl.js';
import { exampleNetwork } from '../../../toolkit/models/example-network.js';
import { dockerArgs, providerOverride } from '../../../toolkit/tofu.js';
import { INFRA, VALIDATE_ONLY, infraResources, infraText, policyFile } from '../shared.mjs';
import { PILLARS, REQUIRED_TYPES, VALIDATE_ONLY_TYPES, designGaps, modelPlan, readDesign } from './design-and-code.mjs';

const resources = infraResources();
const text = infraText();
const of = (type) => resources.filter((r) => r.type === type);

test('every required resource type is declared in infra/', () => {
  const have = new Set(resources.map((r) => r.type));
  for (const type of REQUIRED_TYPES) assert.ok(have.has(type), `declare ${type}`);
});

test('the subnet blocks are the six blocks of challenge 4', () => {
  for (const s of Object.values(exampleNetwork().subnets)) assert.ok(text.includes(`"${s.cidr}"`), s.cidr);
});

test('the data route table has no route, the app table goes through the NAT gateway', () => {
  const body = (name) => of('aws_route_table').find((r) => r.id === `aws_route_table.${name}`).body;
  assert.doesNotMatch(body('data'), /route\s*\{/);
  assert.match(body('app'), /nat_gateway_id/);
  assert.match(body('public'), /gateway_id\s*=\s*aws_internet_gateway/);
});

test('the database accepts only the app group, and the app accepts only the load balancer', () => {
  const ingress = (group) => of('aws_vpc_security_group_ingress_rule').filter((r) => r.attrs.security_group_id === `aws_security_group.${group}.id`);
  assert.deepEqual(ingress('db').map((r) => r.attrs.referenced_security_group_id), ['aws_security_group.app.id']);
  assert.deepEqual(ingress('app').map((r) => r.attrs.referenced_security_group_id), ['aws_security_group.alb.id']);
  assert.ok(!resources.some((r) => /0\.0\.0\.0\/0/.test(r.body) && r.attrs.from_port === '5432'));
});

test('the task and execution roles are different roles', () => {
  const task = of('aws_ecs_task_definition')[0].body;
  assert.match(task, /execution_role_arn\s*=\s*aws_iam_role\.execution\.arn/);
  assert.match(task, /task_role_arn\s*=\s*aws_iam_role\.task\.arn/);
});

test('policies are narrow: no wildcard action, and wildcard resources only for the login call', () => {
  for (const name of ['task-role', 'execution-role', 'worker-function-role']) {
    for (const st of policyFile(name).Statement) {
      const actions = [st.Action].flat();
      assert.ok(!actions.some((a) => a === '*' || a.endsWith(':*') && st.Effect === 'Allow'), `${name} ${st.Sid}`);
      if (st.Resource === '*') assert.deepEqual(actions, ['ecr:GetAuthorizationToken']);
    }
  }
});

test('the bucket blocks public access, is encrypted and versioned', () => {
  for (const type of ['aws_s3_bucket_public_access_block', 'aws_s3_bucket_server_side_encryption_configuration', 'aws_s3_bucket_versioning']) assert.equal(of(type).length, 1, type);
  assert.equal((text.match(/=\s*true/g) ?? []).length >= 4, true);
});

test('the queue has a dead-letter queue after 3 receives', () => {
  assert.match(of('aws_sqs_queue').find((r) => r.id === 'aws_sqs_queue.jobs').body, /redrive_policy/);
  assert.match(text, /maxReceiveCount\s*=\s*3/);
});

test('the service rolls back by itself and keeps full capacity during a deploy', () => {
  const service = of('aws_ecs_service')[0].body;
  assert.match(service, /deployment_minimum_healthy_percent\s*=\s*100/);
  assert.match(service, /deployment_maximum_percent\s*=\s*200/);
  assert.match(service, /rollback\s*=\s*true/);
});

test('the error alarm treats missing data as breaching, and there is an alarm on the dead-letter queue', () => {
  const alarms = of('aws_cloudwatch_metric_alarm');
  assert.ok(alarms.length >= 3);
  assert.match(alarms.find((a) => a.attrs.alarm_name === 'daftar-api-5xx').body, /treat_missing_data\s*=\s*"breaching"/);
  assert.ok(alarms.some((a) => /ApproximateNumberOfMessagesVisible/.test(a.body)));
});

test('the database is in its own validate-only folder and not in the applied code', () => {
  const dbTypes = parseResources(tfText(VALIDATE_ONLY)).map((r) => r.type);
  for (const t of VALIDATE_ONLY_TYPES) {
    assert.ok(dbTypes.includes(t), t);
    assert.ok(!resources.some((r) => r.type === t), `${t} must not be in infra/`);
  }
  const db = parseResources(tfText(VALIDATE_ONLY)).find((r) => r.type === 'aws_db_instance').body;
  assert.match(db, /storage_encrypted\s*=\s*true/);
  assert.match(db, /publicly_accessible\s*=\s*false/);
  assert.match(db, /multi_az\s*=\s*true/);
});

test('no real keys, and no endpoints in the code (the wrapper adds them)', () => {
  assert.doesNotMatch(text, /AKIA|ASIA|access_key|secret_key|endpoints/);
  assert.ok(hasVariable(text, 'region'));
});

test('the wrapper pins the emulator accounts and endpoint for this folder', () => {
  assert.deepEqual(providerOverride().provider.aws.allowed_account_ids, ['123456789012', '000000000000']);
  const args = dockerArgs(INFRA, ['plan']);
  assert.equal(args.at(-1), 'plan');
  assert.equal(args.filter((a) => a === '-v').length, 1);
  assert.ok(args.includes('AWS_ENDPOINT_URL=http://moto:5000'));
});

test('the model plan adds every resource and none is left over', () => {
  const plan = modelPlan();
  assert.equal(plan.counts.create, resources.length);
  assert.match(plan.line, /to add, 0 to change, 0 to destroy\.$/);
});

test('design.md has every section and every pillar filled in', () => {
  assert.ok(fs.existsSync(path.join(path.dirname(INFRA), 'design.md')), 'copy design.template.md to design.md');
  assert.deepEqual(designGaps(readDesign()), []);
  for (const pillar of PILLARS) assert.match(readDesign(), new RegExp(pillar));
});
