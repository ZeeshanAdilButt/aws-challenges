import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadNight } from '../shared.mjs';
import { firstSlowQuery, logGrowth, runbook, silentMinutes } from './faults.mjs';

const night = loadNight();
const alarm = night.changes.alarms[0];

test('fault 1: the slow query shows up in the logs at 01:12, after the 01:05 deploy', () => {
  const slow = firstSlowQuery(night.logs);
  assert.equal(slow.query, 'notes_by_owner');
  assert.equal(slow.time, '01:12');
  assert.ok(slow.ms > 1000);
});

test('firstSlowQuery ignores fast queries and other lines', () => {
  assert.equal(firstSlowQuery([{ time: '00:01', msg: 'query a took 20 ms' }, { time: '00:02', msg: 'hello' }]), null);
});

test('fault 2: the log volume tripled after the deploy', () => {
  const g = logGrowth(night.minutes, '01:05', '01:45');
  assert.ok(g.times >= 2.9 && g.times <= 3.2);
});

test('fault 3: the alarm as written is not in ALARM for part of the incident, with breaching it is for all', () => {
  const s = silentMinutes(night.minutes, alarm);
  assert.ok(s.asWritten >= 10, `only ${s.asWritten} quiet minutes`);
  assert.equal(s.withBreaching, 2);
});

test('the runbook has a symptom, a check and a fix', () => {
  for (const part of ['symptom', 'check', 'fix']) assert.ok(typeof runbook[part] === 'string' && runbook[part].length > 20, part);
});

test('the runbook names the deploy rollback and missing data', () => {
  const text = Object.values(runbook).join(' ').toLowerCase();
  assert.match(text, /roll ?back/);
  assert.match(text, /missing data|breaching/);
});
