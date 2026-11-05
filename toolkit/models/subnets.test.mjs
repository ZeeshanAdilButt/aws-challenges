import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ipToInt, intToIp, parseCidr, usableAddresses, reservedAddresses, splitCidr, overlaps, contains,
  ipInCidr, prefixForHosts, findOverlaps, checkSubnet,
} from './subnets.js';

test('addresses convert both ways', () => {
  assert.equal(ipToInt('10.0.0.1'), 167772161);
  assert.equal(intToIp(167772161), '10.0.0.1');
  assert.throws(() => ipToInt('10.0.0.256'));
  assert.throws(() => ipToInt('10.0.0'));
});

test('parseCidr gives size and range, and rejects host bits', () => {
  const block = parseCidr('10.20.8.0/24');
  assert.equal(block.size, 256);
  assert.equal(block.firstIp, '10.20.8.0');
  assert.equal(block.lastIp, '10.20.8.255');
  assert.throws(() => parseCidr('10.20.8.1/24'), /host bits/);
  assert.throws(() => parseCidr('10.0.0.0/33'));
});

test('usable addresses lose exactly five', () => {
  assert.equal(usableAddresses('10.0.0.0/16'), 65531);
  assert.equal(usableAddresses('10.0.0.0/24'), 251);
  assert.equal(usableAddresses('10.0.0.0/28'), 11);
  assert.equal(usableAddresses('10.0.0.0/22'), 1019);
});

test('the five reserved addresses of 10.0.1.0/24', () => {
  assert.deepEqual(reservedAddresses('10.0.1.0/24').map((r) => r.ip), ['10.0.1.0', '10.0.1.1', '10.0.1.2', '10.0.1.3', '10.0.1.255']);
});

test('splitCidr cuts a block into equal parts', () => {
  assert.deepEqual(splitCidr('10.0.0.0/16', 18), ['10.0.0.0/18', '10.0.64.0/18', '10.0.128.0/18', '10.0.192.0/18']);
  assert.equal(splitCidr('10.0.0.0/16', 24).length, 256);
  assert.throws(() => splitCidr('10.0.0.0/24', 16));
});

test('overlap and containment', () => {
  assert.equal(overlaps('10.0.0.0/24', '10.0.0.128/25'), true);
  assert.equal(overlaps('10.0.0.0/24', '10.0.1.0/24'), false);
  assert.equal(contains('10.0.0.0/16', '10.0.5.0/24'), true);
  assert.equal(contains('10.0.5.0/24', '10.0.0.0/16'), false);
  assert.deepEqual(findOverlaps(['10.0.0.0/24', '10.0.1.0/24', '10.0.0.64/26']), [['10.0.0.0/24', '10.0.0.64/26']]);
});

test('ipInCidr', () => {
  assert.equal(ipInCidr('10.0.1.77', '10.0.1.0/24'), true);
  assert.equal(ipInCidr('10.0.2.1', '10.0.1.0/24'), false);
  assert.equal(ipInCidr('203.0.113.9', '0.0.0.0/0'), true);
});

test('prefixForHosts counts the five reserved addresses', () => {
  assert.equal(prefixForHosts(11), 28);
  assert.equal(prefixForHosts(12), 27); // a /28 has only 11 usable
  assert.equal(prefixForHosts(59), 26);
  assert.equal(prefixForHosts(60), 25); // a /26 has only 59 usable
  assert.equal(prefixForHosts(200), 24);
  assert.equal(prefixForHosts(1000), 22);
  assert.throws(() => prefixForHosts(70000));
});

test('checkSubnet', () => {
  assert.deepEqual(checkSubnet('10.0.1.0/24', '10.0.0.0/16'), []);
  assert.equal(checkSubnet('10.0.1.0/29', '10.0.0.0/16').length, 1);
  assert.equal(checkSubnet('10.1.1.0/24', '10.0.0.0/16').length, 1);
});
