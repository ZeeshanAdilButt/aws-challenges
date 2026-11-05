import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hasVariable, tfText } from '../../../toolkit/hcl.js';
import { exampleNetwork } from '../../../toolkit/models/example-network.js';
import { dockerArgs, providerOverride } from '../../../toolkit/tofu.js';
import { DIR, EXPECTED, modelPlan, readResources } from './vpc-as-code.mjs';

const resources = readResources();
const get = (id) => resources.find((r) => r.id === id);

test('every resource of the network is declared', () => {
  for (const id of EXPECTED) assert.ok(get(id), `declare ${id}`);
});

test('the six subnets use the address blocks planned in challenge 4', () => {
  const planned = exampleNetwork().subnets;
  for (const [name, subnet] of Object.entries(planned)) {
    assert.equal(get(`aws_subnet.${name.replace('-', '_')}`)?.attrs.cidr_block, subnet.cidr, name);
  }
});

test('the VPC takes its block from a variable that defaults to 10.20.0.0/16', () => {
  const text = tfText(DIR);
  assert.match(get('aws_vpc.main').body, /var\.vpc_cidr/);
  assert.ok(hasVariable(text, 'vpc_cidr'));
  assert.match(text, /default\s*=\s*"10\.20\.0\.0\/16"/);
});

test('public and app tables have an internet route, the data table has none', () => {
  assert.match(get('aws_route.public_internet').body, /gateway_id\s*=\s*aws_internet_gateway\.main\.id/);
  assert.match(get('aws_route.app_internet').body, /nat_gateway_id\s*=\s*aws_nat_gateway\.a\.id/);
  assert.ok(!resources.some((r) => r.type === 'aws_route' && /aws_route_table\.data\b/.test(r.body)), 'rt-data must have no route');
});

test('the NAT gateway sits in the public subnet and has an Elastic IP', () => {
  assert.match(get('aws_nat_gateway.a').body, /subnet_id\s*=\s*aws_subnet\.public_a\.id/);
  assert.match(get('aws_nat_gateway.a').body, /allocation_id\s*=\s*aws_eip\.nat\.id/);
});

test('the data subnets use the data table, the app subnets the app table', () => {
  assert.match(get('aws_route_table_association.data_a').body, /aws_route_table\.data\.id/);
  assert.match(get('aws_route_table_association.app_b').body, /aws_route_table\.app\.id/);
});

test('the model plan creates the VPC first and adds everything', () => {
  const plan = modelPlan(resources);
  assert.equal(plan.steps[0].id, 'aws_eip.nat');
  assert.ok(plan.steps.findIndex((s) => s.id === 'aws_vpc.main') < plan.steps.findIndex((s) => s.id === 'aws_subnet.app_a'));
  assert.equal(plan.line, `Plan: ${EXPECTED.length} to add, 0 to change, 0 to destroy.`);
});

test('no real keys or hard-coded endpoints are in the code', () => {
  const text = tfText(DIR);
  assert.doesNotMatch(text, /AKIA|ASIA|access_key|secret_key|endpoints/);
});

test('the wrapper pins the emulator accounts and endpoint, and builds an init/plan/apply command', () => {
  const aws = providerOverride().provider.aws;
  assert.deepEqual(aws.allowed_account_ids, ['123456789012', '000000000000']);
  assert.ok(Object.values(aws.endpoints).every((url) => url === 'http://moto:5000'));
  for (const command of ['init', 'plan', 'apply']) {
    const args = dockerArgs(DIR, [command]);
    assert.equal(args.at(-1), command);
    assert.equal(args.filter((a) => a === '-v').length, 1);
  }
});

test('the code folder has the four files', () => {
  for (const f of ['versions.tf', 'variables.tf', 'main.tf', 'outputs.tf']) assert.ok(fs.existsSync(path.join(DIR, f)), f);
});
