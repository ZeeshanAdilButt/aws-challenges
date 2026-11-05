import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadNight } from '../shared.mjs';
import { LIMIT_MS, changesBefore, incidentStart } from './timeline.mjs';

const night = loadNight();

test('the night has 120 minutes from 00:30', () => {
  assert.equal(night.minutes.length, 120);
  assert.equal(night.minutes[0].time, '00:30');
});

test('the incident starts at 01:10, not at the noise spike at 00:41', () => {
  assert.equal(incidentStart(night.minutes, LIMIT_MS), '01:10');
});

test('incidentStart on a small example', () => {
  const m = (...v) => v.map((p99Ms, i) => ({ time: `00:0${i}`, p99Ms }));
  assert.equal(incidentStart(m(1, 9, 1, 9, 9, 9), 5), '00:03');
  assert.equal(incidentStart(m(9, 9, 1, 9, 9, 1), 5), null);
  assert.equal(incidentStart(m(9, 9), 5, 2), '00:00');
});

test('the deploy at 01:05 is found as the change before the incident', () => {
  const found = changesBefore(night.changes.changes, '01:10', 10);
  assert.deepEqual(found.map((c) => c.what), ['deploy']);
  assert.equal(found[0].time, '01:05');
});

test('changesBefore leaves out later changes and old ones', () => {
  const changes = [{ time: '00:00', what: 'old' }, { time: '01:05', what: 'deploy' }, { time: '01:45', what: 'rollback' }];
  assert.deepEqual(changesBefore(changes, '01:10', 10).map((c) => c.what), ['deploy']);
  assert.deepEqual(changesBefore(changes, '01:50', 10).map((c) => c.what), ['rollback']);
});
