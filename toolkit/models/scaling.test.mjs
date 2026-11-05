import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desiredCapacity, healthStep, simulate } from './scaling.js';

const want = (current, metric, target, min, max) => desiredCapacity({ current, metric, target, min, max });

test('desiredCapacity: 4 servers at 90 percent with a target of 50 want 8', () => assert.equal(want(4, 90, 50, 2, 20), 8));
test('desiredCapacity: low load falls to the minimum', () => {
  assert.equal(want(4, 20, 50, 2, 20), 2);
  assert.equal(want(4, 20, 50, 3, 20), 3);
});
test('desiredCapacity: the maximum clamps', () => assert.equal(want(10, 90, 50, 2, 12), 12));
test('desiredCapacity: on target changes nothing', () => assert.equal(want(4, 50, 50, 2, 20), 4));
test('desiredCapacity: zero load stays at the minimum', () => assert.equal(want(1, 0, 50, 1, 5), 1));

const feed = (state, results) => results.map((ok) => (state = healthStep(state, ok)));

test('five passes from initial: initial 1 to 4, then healthy', () => {
  const states = feed({ status: 'initial', run: 0 }, [true, true, true, true, true]);
  assert.deepEqual(states.map((s) => `${s.status}${s.run}`), ['initial1', 'initial2', 'initial3', 'initial4', 'healthy0']);
});
test('from healthy: a pass resets the failure run', () => {
  const states = feed({ status: 'healthy', run: 0 }, [false, true, false, false]);
  assert.deepEqual(states.map((s) => `${s.status}${s.run}`), ['healthy1', 'healthy0', 'healthy1', 'unhealthy0']);
});
test('from unhealthy: four passes stay unhealthy, the fifth recovers', () => {
  const states = feed({ status: 'unhealthy', run: 0 }, [true, true, true, true, true]);
  assert.deepEqual(states.map((s) => `${s.status}${s.run}`), ['unhealthy1', 'unhealthy2', 'unhealthy3', 'unhealthy4', 'healthy0']);
});
test('the combined run ends healthy', () => {
  const states = feed({ status: 'healthy', run: 0 }, [false, true, false, false, true, true, true, true, true]);
  assert.equal(`${states.at(-1).status}${states.at(-1).run}`, 'healthy0');
});

const flatThenSpike = [...Array(6).fill(100), ...Array(12).fill(1000), ...Array(30).fill(100)];
const base = { profile: flatThenSpike, perServerRps: 50, target: 50, min: 4, max: 50 };

test('simulate: a steady load drops nothing and stays at the minimum', () => {
  const r = simulate({ ...base, profile: Array(30).fill(100) });
  assert.equal(r.dropped, 0);
  assert.equal(r.peakRunning, 4);
});
test('simulate: a ten times spike drops requests while new servers warm up', () => {
  const r = simulate({ ...base, warmupSeconds: 60 });
  assert.ok(r.dropped > 0);
  assert.equal(r.peakRunning, 40);
});
test('simulate: faster warm-up drops fewer requests', () => {
  const slow = simulate({ ...base, warmupSeconds: 120 }).dropped;
  const fast = simulate({ ...base, warmupSeconds: 20 }).dropped;
  assert.ok(fast < slow);
});
test('simulate: a longer cooldown keeps servers longer after the spike', () => {
  const short = simulate({ ...base, warmupSeconds: 20, cooldownSeconds: 0 });
  const long = simulate({ ...base, warmupSeconds: 20, cooldownSeconds: 300 });
  assert.ok(long.serverHours > short.serverHours);
});
test('simulate: servers that are still warming up are not launched twice', () => {
  const r = simulate({ ...base, warmupSeconds: 100 });
  assert.ok(Math.max(...r.timeline.map((row) => row.running + row.pending)) <= 40);
});

test('simulate: a scheduled minimum raised before the spike removes the drops', () => {
  const profile = [...Array(12).fill(100), ...Array(24).fill(1000), ...Array(12).fill(100)];
  const plain = simulate({ profile, perServerRps: 50, target: 50, min: 4, max: 50, warmupSeconds: 60 });
  const planned = simulate({ profile, perServerRps: 50, target: 50, min: 4, max: 50, warmupSeconds: 60, scheduled: [{ atSecond: 0, min: 40 }] });
  assert.ok(plain.dropped > 0);
  assert.equal(planned.dropped, 0);
  assert.ok(planned.serverHours > plain.serverHours);
});

test('simulate: losing three quarters of the servers drops requests until new servers are warm', () => {
  const profile = Array(60).fill(500);
  const ok = simulate({ profile, perServerRps: 50, target: 50, min: 10, max: 50, initial: 20, warmupSeconds: 60 });
  const lost = simulate({ profile, perServerRps: 50, target: 50, min: 10, max: 50, initial: 20, warmupSeconds: 60, lose: { atSecond: 200, fraction: 0.75 } });
  assert.equal(ok.dropped, 0);
  assert.ok(lost.dropped > 0);
  assert.equal(lost.timeline.at(-1).running, 20);
});
