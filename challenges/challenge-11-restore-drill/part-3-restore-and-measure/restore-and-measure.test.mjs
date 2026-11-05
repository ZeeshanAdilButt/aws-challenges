import '../../../toolkit/guard-offline.js';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { stopAll, toMs } from '../docker.mjs';
import { WRITES_PER_SECOND } from '../part-1-wal-and-write-load/wal-and-load.mjs';
import { drill, recoveryLines } from './restore-and-measure.mjs';

const d = await drill();
after(async () => {
  await d.restoredClient.end();
  stopAll();
});

test('recoveryLines names the target time, the archive and promotion', () => {
  const text = recoveryLines('2026-01-01 00:00:00+00').join('\n');
  assert.match(text, /restore_command = 'cp \/archive\/%f %p'/);
  assert.match(text, /recovery_target_time = '2026-01-01 00:00:00\+00'/);
  assert.match(text, /recovery_target_action = 'promote'/);
  assert.match(text, /archive_mode = 'off'/);
});

test('the restored database has the table back, with most of the notes', () => {
  assert.ok(d.restoredRows > 0);
  assert.ok(d.restoredRows < d.rowsBefore, 'some writes of the last second must be lost');
});

test('the last restored note is older than the target time', () => {
  assert.ok(toMs(d.lastRestored) <= toMs(d.target) + 1);
});

test('measured lost writes are between 10 and 30', () => {
  assert.ok(d.lostWrites >= 10 && d.lostWrites <= 30, `measured ${d.lostWrites}, expected 10 to 30 (the model says ${d.modelled.lostWrites})`);
});

test('the newest surviving note was written in the target second', () => {
  assert.equal(Math.floor(toMs(d.lastRestored) / 1000), Math.floor(toMs(d.target) / 1000), `newest note ${d.lastRestored}, target ${d.target}`);
});

test('the model says one second of writes is lost when restoring to one second before', () => assert.equal(d.modelled.lostWrites, WRITES_PER_SECOND));
