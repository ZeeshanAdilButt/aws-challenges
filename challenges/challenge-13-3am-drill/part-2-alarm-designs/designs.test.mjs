import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadNight } from '../shared.mjs';
import { DESIGNS, evaluateDesign } from './designs.mjs';

const night = loadNight();
const result = (name) => evaluateDesign(night.minutes, DESIGNS.find((d) => d.name === name));

test('1 of 1 pages at once but also pages for the two noise spikes', () => {
  const r = result('1 of 1');
  assert.equal(r.delay, 0);
  assert.equal(r.falsePages, 2);
  assert.equal(r.pages, 3);
});

test('2 of 3 pages one minute after the incident with no false page', () => {
  const r = result('2 of 3');
  assert.equal(r.delay, 1);
  assert.equal(r.falsePages, 0);
  assert.equal(r.pages, 1);
});

test('3 of 3 has no false page but pages two minutes late', () => {
  const r = result('3 of 3');
  assert.equal(r.delay, 2);
  assert.equal(r.falsePages, 0);
});

test('every design catches the incident', () => {
  for (const d of DESIGNS) assert.notEqual(evaluateDesign(night.minutes, d).delay, null, d.name);
});
