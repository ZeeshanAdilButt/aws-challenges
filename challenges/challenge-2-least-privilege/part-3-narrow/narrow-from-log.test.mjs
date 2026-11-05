import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLog, measure, narrow, probes, widePolicy } from './narrow-from-log.mjs';

const events = loadLog();
const narrowed = narrow(events);

test('the log has 600 events', () => {
  assert.equal(events.length, 600);
});

test('the wide policy allows the whole log and most of the probes', () => {
  const m = measure(widePolicy, events);
  assert.equal(m.logAllowed, 600);
  assert.ok(m.probesAllowed >= 13, `wide allows ${m.probesAllowed}`);
});

test('the narrowed policy still allows every call in the log', () => {
  assert.equal(measure(narrowed, events).logAllowed, events.length);
});

test('the narrowed policy refuses every probe', () => {
  const m = measure(narrowed, events);
  assert.equal(m.probesAllowed, 0, `still allows ${m.probesAllowed} of ${m.probesTotal}`);
  assert.equal(m.probesTotal, probes.length);
});

test('no wildcard action, no resource of just *', () => {
  for (const s of narrowed.Statement) {
    for (const a of [s.Action].flat()) assert.ok(!a.includes('*'), a);
    for (const r of [s.Resource].flat()) assert.notEqual(r, '*');
  }
});

test('the policy is short enough to read: at most 6 statements', () => {
  assert.ok(narrowed.Statement.length >= 1 && narrowed.Statement.length <= 6, `${narrowed.Statement.length} statements`);
});

test('it is a valid policy and built only from the log (a new log gives a new policy)', () => {
  assert.equal(narrowed.Version, '2012-10-17');
  const small = narrow(events.filter((e) => e.action === 'sqs:SendMessage'));
  assert.deepEqual(small.Statement.map((s) => s.Action), ['sqs:SendMessage']);
});
