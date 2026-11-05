import '../../../toolkit/guard-offline.js';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { stopAll, toMs } from '../docker.mjs';
import { drill } from './drop-a-table.mjs';

const d = await drill();
after(async () => {
  await d.client.end();
  stopAll();
});

test('the drop time is a database timestamp with a zone', () => {
  assert.match(d.dropAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\+\d{2}/);
});

test('the rows before the drop are counted: the whole load was there', () => assert.equal(d.rowsBefore, 160));

test('the drop time is after the last note and not long after', () => {
  const gap = toMs(d.dropAt) - toMs(d.last);
  assert.ok(gap >= 0 && gap < 15000, `gap ${gap} ms`);
});

test('the app now gets "table does not exist" (42P01)', () => assert.equal(d.error?.code, '42P01'));
