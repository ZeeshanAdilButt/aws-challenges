import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ec2 as makeEc2, resetEmulator } from '../../../toolkit/aws.js';
import { exampleNetwork } from '../../../toolkit/models/example-network.js';
import { PLAN, buildVpc, describeNetwork } from './build-vpc.mjs';

const ec2 = makeEc2();
await resetEmulator();
const built = await buildVpc(ec2);
const network = await describeNetwork(ec2, built.vpcId);
const expected = exampleNetwork();

test('six subnets with the planned blocks', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(network.subnets).map(([n, s]) => [n, s.cidr])), Object.fromEntries(PLAN.map((p) => [p.name, p.cidr])));
});

test('an internet gateway is attached', () => {
  assert.equal(network.internetGateway, true);
});

test('one NAT gateway, in the public-a subnet', () => {
  assert.deepEqual(network.natGateways, { 'nat-a': { subnet: 'public-a' } });
});

test('public subnets send 0.0.0.0/0 to the internet gateway', () => {
  assert.deepEqual(network.routeTables['rt-public'], expected.routeTables['rt-public']);
  assert.equal(network.subnets['public-a'].routeTable, 'rt-public');
  assert.equal(network.subnets['public-b'].routeTable, 'rt-public');
});

test('app subnets send 0.0.0.0/0 to the NAT gateway', () => {
  assert.deepEqual(network.routeTables['rt-app'], expected.routeTables['rt-app']);
  assert.equal(network.subnets['app-a'].routeTable, 'rt-app');
  assert.equal(network.subnets['app-b'].routeTable, 'rt-app');
});

test('data subnets have no internet route', () => {
  assert.deepEqual(network.routeTables['rt-data'], expected.routeTables['rt-data']);
  assert.equal(network.subnets['data-a'].routeTable, 'rt-data');
  assert.equal(network.subnets['data-b'].routeTable, 'rt-data');
});
