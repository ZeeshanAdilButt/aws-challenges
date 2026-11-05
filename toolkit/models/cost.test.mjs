import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { largestLine, monthlyCost } from './cost.js';

const line = (cost, name) => cost.lines.find((l) => l.name === name).dollars;

test('at 100 requests a second: 2 tasks, the Fargate line by hand', () => {
  const c = monthlyCost(100);
  assert.equal(c.tasks, 2);
  // 2 tasks x 730 h x (0.5 x 0.04048 + 1 x 0.004445) = 2 x 730 x 0.024685 = 36.04
  assert.equal(line(c, 'Fargate tasks'), 36.04);
});

test('NAT: the one gateway of the design costs 32.85 before any data, and two cost 65.70', () => {
  assert.equal(line(monthlyCost(0.000001), 'NAT gateways'), 32.85);
  assert.equal(line(monthlyCost(0.000001, { natGateways: 2 }), 'NAT gateways'), 65.7);
});

test('logs: 1 KB a request at 100 requests a second is 262.8 GB, 131.40 dollars', () => {
  assert.equal(line(monthlyCost(100), 'CloudWatch Logs'), 131.4);
});

test('every line grows or stays the same when traffic grows', () => {
  const lo = monthlyCost(100);
  const hi = monthlyCost(1000);
  for (const l of lo.lines) assert.ok(line(hi, l.name) >= l.dollars, l.name);
});

test('at 5,000 requests a second the logs are the largest line', () => {
  assert.equal(largestLine(monthlyCost(5000)).name, 'CloudWatch Logs');
});

test('halving the log size halves the log line', () => {
  assert.equal(line(monthlyCost(1000, { logKbPerRequest: 0.5 }), 'CloudWatch Logs'), line(monthlyCost(1000), 'CloudWatch Logs') / 2);
});

test('the database line is kept apart because its price is unverified', () => {
  const c = monthlyCost(100);
  assert.equal(c.unverified.dollars, 47.45);
  assert.ok(!c.lines.some((l) => /Database/.test(l.name)));
});

test('the total is the sum of the verified lines', () => {
  const c = monthlyCost(1000);
  assert.equal(c.total, Math.round(c.lines.reduce((s, l) => s + l.dollars, 0) * 100) / 100);
});
