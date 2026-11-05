import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPath, lookupRoute, sgAllows, naclAllows, hasInternetRoute } from './reach.js';
import { exampleNetwork } from './example-network.js';

const outcome = (network, from, to, port) => {
  const result = checkPath(network, { from, to, port });
  return result.reachable ? 'ok' : result.fault.code;
};

test('lookupRoute: the longest prefix wins, no match gives null', () => {
  const routes = [
    { destination: '10.20.0.0/16', target: 'local' },
    { destination: '0.0.0.0/0', target: 'igw' },
    { destination: '10.20.8.0/24', target: 'blackhole' },
  ];
  assert.equal(lookupRoute(routes, '10.20.1.1').target, 'local');
  assert.equal(lookupRoute(routes, '10.20.8.5').target, 'blackhole');
  assert.equal(lookupRoute(routes, '8.8.8.8').target, 'igw');
  assert.equal(lookupRoute([{ destination: '10.0.0.0/8', target: 'local' }], '8.8.8.8'), null);
});

test('the healthy Daftar network passes its five working paths', () => {
  const network = exampleNetwork();
  assert.equal(outcome(network, 'internet:198.51.100.7', 'alb', 443), 'ok');
  assert.equal(outcome(network, 'alb', 'app', 8080), 'ok');
  assert.equal(outcome(network, 'app', 'db', 5432), 'ok');
  assert.equal(outcome(network, 'app', 'internet:203.0.113.20', 443), 'ok'); // out through the NAT gateway
  const steps = checkPath(network, { from: 'app', to: 'internet:203.0.113.20', port: 443 }).steps;
  assert.ok(steps.some((s) => s.note.includes('NAT gateway nat-a')));
});

test('paths that must stay closed are closed, for the right reason', () => {
  const network = exampleNetwork();
  assert.equal(outcome(network, 'internet:198.51.100.7', 'app', 8080), 'no-public-ip');
  assert.equal(outcome(network, 'internet:198.51.100.7', 'db', 5432), 'no-public-ip');
  assert.equal(outcome(network, 'app', 'db', 3306), 'sg-egress-denied');
  assert.equal(outcome(network, 'alb', 'db', 5432), 'sg-egress-denied');
  assert.equal(outcome(network, 'db', 'internet:203.0.113.20', 443), 'sg-egress-denied');
});

test('a data subnet with an open security group still has no route to the internet', () => {
  const network = exampleNetwork();
  network.securityGroups['sg-db'].egress.push({ protocol: '-1', peer: '0.0.0.0/0' });
  assert.equal(outcome(network, 'db', 'internet:203.0.113.20', 443), 'no-route');
});

test('security group rules can name a security group instead of an address', () => {
  const network = exampleNetwork();
  const hit = sgAllows(network, ['sg-db'], 'ingress', { protocol: 'tcp', port: 5432, peerIp: '10.20.0.10', peerGroups: ['sg-app'] });
  assert.equal(hit.group, 'sg-db');
  assert.equal(sgAllows(network, ['sg-db'], 'ingress', { protocol: 'tcp', port: 5432, peerIp: '10.20.0.10', peerGroups: ['sg-other'] }), null);
});

test('route problems: blackhole, missing NAT, NAT in a private subnet, missing gateway', () => {
  let network = exampleNetwork();
  network.routeTables['rt-app'][1].target = 'blackhole';
  assert.equal(outcome(network, 'app', 'internet:203.0.113.20', 443), 'blackhole');

  network = exampleNetwork();
  network.routeTables['rt-app'][1].target = 'nat:nat-z';
  assert.equal(outcome(network, 'app', 'internet:203.0.113.20', 443), 'nat-missing');

  network = exampleNetwork();
  network.natGateways['nat-a'].subnet = 'app-a';
  assert.equal(outcome(network, 'app', 'internet:203.0.113.20', 443), 'nat-not-public');

  network = exampleNetwork();
  network.internetGateway = false;
  assert.equal(outcome(network, 'internet:198.51.100.7', 'alb', 443), 'no-igw');
  assert.equal(hasInternetRoute(network, 'public-a'), false);
});

test('a public subnet that lost its internet route cannot be reached', () => {
  const network = exampleNetwork();
  network.routeTables['rt-public'].pop();
  assert.equal(outcome(network, 'internet:198.51.100.7', 'alb', 443), 'no-route');
});

test('an instance in a public subnet without a public address cannot go out', () => {
  const network = exampleNetwork();
  network.instances.alb.publicIp = undefined;
  network.securityGroups['sg-alb'].egress.push({ protocol: 'tcp', from: 443, to: 443, peer: '0.0.0.0/0' });
  assert.equal(outcome(network, 'alb', 'internet:203.0.113.20', 443), 'no-public-ip');
});

test('network ACLs: first match wins, no match denies, the reply needs a rule too', () => {
  const network = exampleNetwork();
  network.nacls['nacl-app'] = {
    inbound: [
      { rule: 200, action: 'allow', protocol: 'tcp', from: 8080, to: 8080, cidr: '10.20.8.0/24' },
      { rule: 100, action: 'deny', protocol: '-1', cidr: '10.20.8.10/32' },
    ],
    outbound: [{ rule: 100, action: 'allow', protocol: 'tcp', from: 1024, to: 65535, cidr: '0.0.0.0/0' }],
  };
  network.subnets['app-a'].nacl = 'nacl-app';
  assert.equal(naclAllows(network, 'app-a', 'in', { protocol: 'tcp', port: 8080, ip: '10.20.8.10' }).allowed, false); // rule 100 first
  assert.equal(outcome(network, 'alb', 'app', 8080), 'nacl-in-denied');
  network.nacls['nacl-app'].inbound[1].action = 'allow';
  assert.equal(outcome(network, 'alb', 'app', 8080), 'ok');
  network.nacls['nacl-app'].outbound = [];
  assert.equal(outcome(network, 'alb', 'app', 8080), 'nacl-return-denied');
});

test('unknown names are reported, not crashed on', () => {
  assert.equal(outcome(exampleNetwork(), 'nope', 'app', 8080), 'unknown-endpoint');
});
