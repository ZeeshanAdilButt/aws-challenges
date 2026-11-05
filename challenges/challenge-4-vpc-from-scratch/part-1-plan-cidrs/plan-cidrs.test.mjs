import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSubnet, findOverlaps, parseCidr } from '../../../toolkit/models/subnets.js';
import { VPC, buildPlan, requirements } from './plan-cidrs.mjs';

const plan = buildPlan(VPC, requirements);

test('every requirement gets a block, with its zone', () => {
  assert.deepEqual(plan.map((p) => p.name).sort(), requirements.map((r) => r.name).sort());
  for (const p of plan) assert.equal(p.zone, requirements.find((r) => r.name === p.name).zone);
});

test('each block is big enough after the five reserved addresses', () => {
  for (const p of plan) {
    const need = requirements.find((r) => r.name === p.name).hosts;
    assert.ok(p.usable >= need, `${p.name}: ${p.usable} usable, ${need} needed`);
    assert.equal(p.usable, parseCidr(p.cidr).size - 5);
  }
});

test('blocks are not wasteful: one prefix smaller would not fit', () => {
  for (const p of plan) {
    const need = requirements.find((r) => r.name === p.name).hosts;
    assert.ok(2 ** (32 - p.prefix - 1) - 5 < need, `${p.name} could use a smaller block`);
  }
});

test('no overlaps, everything inside the VPC, AWS size limits respected', () => {
  assert.deepEqual(findOverlaps(plan.map((p) => p.cidr)), []);
  for (const p of plan) assert.deepEqual(checkSubnet(p.cidr, VPC), [], p.name);
});

test('the plan is sorted by address and uses the exact blocks the next part builds', () => {
  assert.deepEqual(plan.map((p) => `${p.name} ${p.cidr}`), [
    'app-a 10.20.0.0/22',
    'app-b 10.20.4.0/22',
    'public-a 10.20.8.0/24',
    'public-b 10.20.9.0/24',
    'data-a 10.20.10.0/26',
    'data-b 10.20.10.64/26',
  ]);
});

test('it throws when the subnets cannot fit', () => {
  assert.throws(() => buildPlan('10.20.0.0/24', requirements), /does not fit/);
});

test('it does not change the list it is given', () => {
  const copy = JSON.stringify(requirements);
  buildPlan(VPC, requirements);
  assert.equal(JSON.stringify(requirements), copy);
});
