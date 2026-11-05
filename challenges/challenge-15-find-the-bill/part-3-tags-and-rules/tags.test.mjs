import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MONTHS, readReport } from '../part-1-the-usage-report/generate.mjs';
import { REQUIRED, coverageByService, taggingRules } from './tags.mjs';

const lines = readReport(MONTHS[1]).lines;
const byService = coverageByService(lines, REQUIRED);
const get = (s) => byService.find((x) => x.service === s);

test('coverageByService on a small example', () => {
  const l = [
    { service: 'A', cost: 100, tags: { team: 'x' } },
    { service: 'A', cost: 100, tags: {} },
    { service: 'B', cost: 50, tags: { team: 'x' } },
  ];
  assert.deepEqual(coverageByService(l, ['team']), [{ service: 'A', total: 200, percent: 50 }, { service: 'B', total: 50, percent: 100 }]);
});

test('the lowest coverage comes first', () => {
  for (let i = 1; i < byService.length; i++) assert.ok(byService[i].percent >= byService[i - 1].percent);
});

test('public IPv4 addresses carry no tags at all', () => assert.equal(get('VPC').percent < 100, true));

test('the load balancers have the idle untagged ones, so ELB is below 100', () => {
  assert.ok(get('ELB').percent < 100);
  assert.ok(get('ELB').percent > 0);
});

test('every service total adds up to the bill', () => {
  const sum = byService.reduce((s, x) => s + x.total, 0);
  assert.ok(Math.abs(sum - lines.reduce((s, l) => s + l.cost, 0)) < 0.05);
});

test('the rules cover each required tag with allowed values and an owner', () => {
  for (const tag of REQUIRED) {
    assert.ok(taggingRules[tag], `rule for ${tag}`);
    assert.ok(taggingRules[tag].values.length >= 2, `values for ${tag}`);
    assert.ok(taggingRules[tag].enforcedBy.length > 20, `enforcement for ${tag}`);
  }
});

test('the env tag allows prod and staging', () => {
  assert.ok(taggingRules.env.values.includes('prod'));
  assert.ok(taggingRules.env.values.includes('staging'));
});
