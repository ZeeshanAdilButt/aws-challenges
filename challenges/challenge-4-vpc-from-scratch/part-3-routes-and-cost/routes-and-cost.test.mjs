import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breakEvenGb, natMonthlyCost, networkFromEmulator, oneNat, perZoneNat, probes, runProbes } from './routes-and-cost.mjs';

const network = await networkFromEmulator();

test('the network read back from the emulator passes every probe', () => {
  const results = runProbes(network);
  assert.ok(results.length >= 6, 'write at least six probes');
  for (const r of results) assert.equal(r.got, r.expect, `${r.from} to ${r.to}:${r.port}`);
});

test('the probes include paths that work and paths that must stay closed', () => {
  assert.ok(probes.filter((p) => p.expect === 'ok').length >= 3);
  assert.ok(probes.filter((p) => p.expect !== 'ok').length >= 3);
});

test('the required paths are among the probes, with the right answers', () => {
  const find = (from, to, port) => probes.find((p) => p.from.startsWith(from) && p.to.startsWith(to) && p.port === port);
  assert.equal(find('internet', 'alb', 443)?.expect, 'ok');
  assert.equal(find('app', 'internet', 443)?.expect, 'ok');
  assert.equal(find('app', 'db', 5432)?.expect, 'ok');
  assert.ok(find('internet', 'app', 8080), 'test that the internet cannot reach the app directly');
  assert.notEqual(find('internet', 'app', 8080)?.expect, 'ok');
  assert.ok(find('db', 'internet', 443), 'test that the database cannot go out');
  assert.notEqual(find('db', 'internet', 443)?.expect, 'ok');
});

test('a NAT gateway left out of the public subnet is caught by the model', () => {
  const broken = structuredClone(network);
  broken.natGateways['nat-a'].subnet = 'app-a';
  const [result] = runProbes(broken, [{ from: 'app', to: 'internet:203.0.113.20', port: 443, expect: 'nat-not-public' }]);
  assert.equal(result.match, true);
});

test('NAT cost: the fee alone is 32.85 for one gateway and 65.70 for two', () => {
  assert.equal(natMonthlyCost({ gateways: 1, gbPerMonth: 0 }).total, 32.85);
  assert.equal(natMonthlyCost({ gateways: 2, gbPerMonth: 0 }).total, 65.7);
});

test('NAT cost: processing is 0.045 a GB', () => {
  const c = natMonthlyCost({ gateways: 1, gbPerMonth: 1000 });
  assert.equal(c.processing, 45);
  assert.equal(c.crossZone, 0);
  assert.equal(c.total, 77.85);
});

test('NAT cost: data that crosses zones pays 0.01 each way', () => {
  const c = natMonthlyCost({ gateways: 1, gbPerMonth: 1000, crossZoneShare: 0.5 });
  assert.equal(c.crossZone, 10);
  assert.equal(c.total, 87.85);
});

test('one gateway per zone: more fee, no crossing', () => {
  assert.equal(oneNat(1000).total, 87.85);
  assert.equal(perZoneNat(1000).total, 110.7);
  assert.ok(oneNat(100).total < perZoneNat(100).total);
});

test('break even: below it one gateway is cheaper, above it one per zone is', () => {
  const gb = breakEvenGb();
  assert.equal(gb, 3285);
  assert.ok(oneNat(gb - 500).total < perZoneNat(gb - 500).total);
  assert.ok(oneNat(gb + 500).total > perZoneNat(gb + 500).total);
});
