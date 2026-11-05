import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOT } from '../shared.mjs';
import { drill, spread } from './skewed-load.mjs';

const d = await drill();

test('spread on a small example', () => {
  const s = spread({ a: 70, b: 10, c: 10, d: 10 });
  assert.equal(s.keys, 4);
  assert.equal(s.total, 100);
  assert.equal(s.evenShare, 25);
  assert.deepEqual(s.top, { key: 'a', count: 70, share: 0.7 });
  assert.deepEqual(s.hot, ['a']);
});

test('an even load has no hot key', () => assert.deepEqual(spread({ a: 10, b: 10, c: 10 }).hot, []));

test('one class takes about 60 percent of the 3,000 writes', () => {
  assert.equal(d.spread.total, 3000);
  assert.equal(d.spread.top.key, HOT);
  assert.ok(d.spread.top.share > 0.55 && d.spread.top.share < 0.65, `share ${d.spread.top.share}`);
});

test('it is the only hot key', () => assert.deepEqual(d.spread.hot, [HOT]));

test('the emulator holds as many items for the hot key as the load had', () => assert.equal(d.inTable, d.counts[HOT]));
