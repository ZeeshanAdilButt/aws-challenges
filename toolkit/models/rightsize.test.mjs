import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, percentile, recommend } from './rightsize.js';

const current = { vcpu: 2, memGb: 8, price: 0.1008 };
const flat = (n, cpuPct, memGb) => Array.from({ length: n }, () => ({ cpuPct, memGb }));
const run = (samples, opts) => recommend(samples, current, CATALOG, opts);

test('10 percent CPU and 2 GB fits a c7g.large and saves 20.66 a month', () => {
  assert.deepEqual(run(flat(168, 10, 2)), { name: 'c7g.large', needVcpu: 0.33, needMem: 2.4, monthlySaving: 20.66 });
});
test('20 percent CPU and 10 GB needs memory: r7g.large, which costs more', () => {
  assert.deepEqual(run(flat(168, 20, 10)), { name: 'r7g.large', needVcpu: 0.67, needMem: 12, monthlySaving: -4.6 });
});
test('90 percent CPU and 3 GB has no fit', () => {
  const r = run(flat(168, 90, 3));
  assert.equal(r.name, null);
  assert.equal(r.needVcpu, 3);
});
test('burstable sizes are skipped unless allowed', () => {
  assert.equal(run(flat(168, 10, 2), { allowBurstable: true }).name, 't4g.medium');
  assert.equal(run(flat(168, 10, 2), { allowBurstable: true }).monthlySaving, 49.06);
});
test('p95 ignores a few spikes: 95 samples at 10 and 5 at 100', () => {
  const s = [...flat(95, 10, 2), ...flat(5, 100, 2)];
  assert.equal(run(s).name, 'c7g.large');
});
test('6 spikes out of 100 move the p95 to 100 and nothing fits', () => {
  const s = [...flat(94, 10, 2), ...flat(6, 100, 2)];
  const r = run(s);
  assert.equal(r.name, null);
  assert.ok(Math.abs(r.needVcpu - 3.3333) < 0.001);
});
test('50 percent CPU: 6 GB fits m7g.large, 7 GB needs r7g.large', () => {
  assert.deepEqual(run(flat(168, 50, 6)), { name: 'm7g.large', needVcpu: 1.67, needMem: 7.2, monthlySaving: 14.02 });
  const r = run(flat(168, 50, 7));
  assert.equal(r.needMem, 8.4);
  assert.equal(r.name, 'r7g.large');
});
test('no samples throws', () => {
  assert.throws(() => run([]));
});
test('percentile is nearest rank', () => {
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5), 5);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95), 10);
  assert.equal(percentile([7], 0.95), 7);
});
