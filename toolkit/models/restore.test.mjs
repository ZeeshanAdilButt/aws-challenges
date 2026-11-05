import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maxConnections, poolSize, restorePlan } from './restore.js';

const base = { dropAt: 600, restorableStart: 0, restorableEnd: 595, writesPerMinute: 120, sizeGb: 300, gbPerMinute: 10, fixedMinutes: 15 };
const plan = (over = {}) => restorePlan({ ...base, ...over });
const GIB = 1024 ** 3;

test('base case', () => assert.deepEqual(plan(), { target: 595, lostWrites: 600, restoreMinutes: 45 }));
test('a window that reaches past the drop restores to one minute before it', () => assert.deepEqual(plan({ restorableEnd: 700 }), { target: 599, lostWrites: 120, restoreMinutes: 45 }));
test('a window that ends early loses more', () => assert.deepEqual(plan({ restorableEnd: 590 }), { target: 590, lostWrites: 1200, restoreMinutes: 45 }));
test('no restore point before the window starts', () => assert.equal(plan({ restorableStart: 600 }), null));
test('a drop at minute 1 restores to minute 0', () => assert.deepEqual(plan({ dropAt: 1 }), { target: 0, lostWrites: 120, restoreMinutes: 45 }));
test('restore time rounds up', () => assert.deepEqual(plan({ sizeGb: 0, fixedMinutes: 15.2 }), { target: 595, lostWrites: 600, restoreMinutes: 16 }));
test('max connections for 4, 8, 16, 64 and 1024 GiB', () => {
  assert.deepEqual([4, 8, 16, 64, 1024].map((g) => maxConnections(g * GIB)), [450, 901, 1802, 5000, 5000]);
});
test('pool size for ten instances', () => assert.equal(poolSize({ maxConnections: 901, reserved: 10, instances: 10 }), 89));
test('pool size for eight instances', () => assert.equal(poolSize({ maxConnections: 450, reserved: 10, instances: 8 }), 55));
test('pool size never goes below 1', () => assert.equal(poolSize({ maxConnections: 20, reserved: 10, instances: 40 }), 1));
