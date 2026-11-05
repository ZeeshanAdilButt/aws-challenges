import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MONTHS, REPORT_FILES, grandTotal, readReport, report, totalsByService } from './generate.mjs';

const [a, b] = MONTHS.map(readReport);

test('the files in datasets/ are what the generator makes (same seed, same file)', () => {
  MONTHS.forEach((month, i) => assert.equal(fs.readFileSync(REPORT_FILES[i], 'utf8'), `${JSON.stringify(report(month))}\n`));
});

test('every line costs quantity times unit price, to the cent', () => {
  for (const line of [...a.lines, ...b.lines]) assert.equal(line.cost, Math.round(line.quantity * line.unitPrice * 100) / 100, line.resource);
});

test('totalsByService adds up each AWS service, biggest first', () => {
  const t = totalsByService(b.lines);
  assert.ok(t.length >= 6);
  for (let i = 1; i < t.length; i++) assert.ok(t[i].cost <= t[i - 1].cost);
  assert.equal(Math.round(t.reduce((s, x) => s + x.cost, 0) * 100) / 100, grandTotal(b.lines));
});

test('totalsByService on a small example', () => {
  const lines = [{ service: 'S3', cost: 1.01 }, { service: 'EC2', cost: 5 }, { service: 'S3', cost: 2 }];
  assert.deepEqual(totalsByService(lines), [{ service: 'EC2', cost: 5 }, { service: 'S3', cost: 3.01 }]);
});

test('the bill about doubled between the two months', () => {
  const ratio = grandTotal(b.lines) / grandTotal(a.lines);
  assert.ok(ratio > 1.9 && ratio < 2.1, `ratio ${ratio}`);
});
