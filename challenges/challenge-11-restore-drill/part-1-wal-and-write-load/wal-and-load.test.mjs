import '../../../toolkit/guard-offline.js';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { stopAll } from '../docker.mjs';
import { LOAD_SECONDS, WRITES_PER_SECOND, drill } from './wal-and-load.mjs';

const d = await drill();
after(async () => {
  await d.client.end();
  stopAll();
});

test('WAL archiving is on', () => {
  assert.equal(d.setting.mode, 'on');
  assert.equal(d.setting.level, 'replica');
});

test('the write load wrote every note', () => {
  assert.equal(d.written, LOAD_SECONDS * WRITES_PER_SECOND);
  assert.equal(d.count, d.written);
});

test('WAL files appeared in the archive', () => assert.ok(d.files.length >= 1, 'no WAL file was archived'));

test('rows carry their real time, so they are spread over the seconds of the load', () => {
  const span = Date.parse(d.last) - Date.parse(d.first);
  assert.ok(span > (LOAD_SECONDS - 2) * 1000, `span ${span} ms`);
});
