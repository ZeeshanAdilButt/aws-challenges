import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anomalies, billDiff, tagCoverage } from './bill.js';

const prev = [
  { service: 'VPC', usageType: 'NatGateway-Bytes', cost: 100 },
  { service: 'CloudWatch', usageType: 'DataProcessing-Bytes', cost: 40 },
  { service: 'EC2', usageType: 'BoxUsage', cost: 700 },
  { service: 'EC2', usageType: 'BoxUsage', cost: 500 },
  { service: 'S3', usageType: 'TimedStorage', cost: 300 },
];
const curr = [
  { service: 'VPC', usageType: 'NatGateway-Bytes', cost: 1300 },
  { service: 'CloudWatch', usageType: 'DataProcessing-Bytes', cost: 400 },
  { service: 'ELB', usageType: 'LoadBalancerUsage', cost: 150 },
  { service: 'EC2', usageType: 'BoxUsage', cost: 1210 },
  { service: 'S3', usageType: 'TimedStorage', cost: 360 },
];

test('rows are ordered by the size of the increase, and duplicate lines are summed', () => {
  const rows = billDiff(prev, curr);
  assert.deepEqual(rows.map((r) => r.key), ['VPC|NatGateway-Bytes', 'CloudWatch|DataProcessing-Bytes', 'ELB|LoadBalancerUsage', 'S3|TimedStorage', 'EC2|BoxUsage']);
  assert.equal(rows.find((r) => r.service === 'EC2').prev, 1200);
});
test('the first row has the exact shape', () => {
  assert.deepEqual(billDiff(prev, curr)[0], { key: 'VPC|NatGateway-Bytes', service: 'VPC', usageType: 'NatGateway-Bytes', prev: 100, curr: 1300, delta: 1200, ratio: 13 });
});
test('a line only in the current month has a null ratio', () => {
  assert.equal(billDiff(prev, curr).find((r) => r.service === 'ELB').ratio, null);
});
test('default anomalies: NAT, CloudWatch and the new load balancer, not EC2', () => {
  assert.deepEqual(anomalies(billDiff(prev, curr)), ['VPC|NatGateway-Bytes', 'CloudWatch|DataProcessing-Bytes', 'ELB|LoadBalancerUsage']);
});
test('a higher dollar line keeps only NAT', () => assert.deepEqual(anomalies(billDiff(prev, curr), { minDollars: 500 }), ['VPC|NatGateway-Bytes']));
test('a high ratio line with no dollar floor', () => assert.deepEqual(anomalies(billDiff(prev, curr), { minDollars: 0, minRatio: 10 }), ['VPC|NatGateway-Bytes', 'CloudWatch|DataProcessing-Bytes', 'ELB|LoadBalancerUsage']));
test('two empty bills give nothing', () => {
  assert.deepEqual(billDiff([], []), []);
  assert.deepEqual(anomalies([]), []);
});
test('S3 grew 60 dollars but only 1.2 times: not an anomaly', () => assert.ok(!anomalies(billDiff(prev, curr)).includes('S3|TimedStorage')));

const tagged = [
  { service: 'A', usageType: 'x', cost: 600, tags: { team: 'api', env: 'prod' } },
  { service: 'B', usageType: 'x', cost: 300, tags: { team: 'web', env: '' } },
  { service: 'C', usageType: 'x', cost: 100, tags: {} },
];
test('coverage for one tag', () => assert.deepEqual(tagCoverage(tagged, ['team']), { total: 1000, covered: 900, percent: 90, missing: { team: 100 } }));
test('coverage for two tags: an empty value counts as missing', () => {
  assert.deepEqual(tagCoverage(tagged, ['team', 'env']), { total: 1000, covered: 600, percent: 60, missing: { env: 400, team: 100 } });
});
test('an empty bill is 100 percent covered', () => assert.equal(tagCoverage([], ['team']).percent, 100));
