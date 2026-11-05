// Can A reach B? Route tables, security groups and network ACLs, checked along the path.
// A pure model of one VPC. moto stores the settings but moves no packets, so this is where the
// question is answered. The same rules are used by the course's network pictures.
//
// Network shape (plain JSON, see example-network.js):
//   cidr: '10.20.0.0/16'
//   internetGateway: true | false                      an internet gateway is attached
//   natGateways: { 'nat-a': { subnet: 'public-a' } }
//   subnets: { 'public-a': { cidr, routeTable: 'rt-public', nacl?: 'nacl-1' } }
//   routeTables: { 'rt-public': [{ destination: '0.0.0.0/0', target: 'igw' }] }
//       target is 'local', 'igw', 'nat:<name>' or 'blackhole'. The local route for the VPC block must be listed.
//   securityGroups: { 'sg-web': { ingress: [rule], egress: [rule] } }
//       rule: { protocol: 'tcp' | 'udp' | '-1', from, to, peer }   peer is a CIDR or a security group name
//   nacls: { 'nacl-1': { inbound: [naclRule], outbound: [naclRule] } }
//       naclRule: { rule: 100, action: 'allow' | 'deny', protocol, from, to, cidr }   lowest number first
//   instances: { web: { subnet: 'public-a', ip: '10.20.8.10', publicIp?: '54.0.2.1', securityGroups: ['sg-web'] } }
//
// An endpoint is an instance name, or 'internet:<address>' for something outside the VPC.
import { ipInCidr, parseCidr } from './subnets.js';

export const FAULTS = [
  'unknown-endpoint', 'sg-egress-denied', 'sg-ingress-denied', 'nacl-out-denied', 'nacl-in-denied',
  'nacl-return-denied', 'no-route', 'blackhole', 'no-igw', 'no-public-ip', 'nat-missing', 'nat-not-public',
];
const RETURN_PORT = 50000; // replies come back to a high "ephemeral" port; stateless NACLs must allow it

const isCidr = (text) => /^\d+\.\d+\.\d+\.\d+(\/\d+)?$/.test(text);

function portMatches(rule, protocol, port) {
  if (rule.protocol === '-1') return true;
  if (rule.protocol !== protocol) return false;
  return port >= rule.from && port <= rule.to;
}

// Longest prefix wins. Returns the route, or null when no route matches.
export function lookupRoute(routes, ip) {
  let best = null;
  let bestPrefix = -1;
  for (const route of routes ?? []) {
    if (ipInCidr(ip, route.destination)) {
      const { prefix } = parseCidr(route.destination);
      if (prefix > bestPrefix) {
        best = route;
        bestPrefix = prefix;
      }
    }
  }
  return best;
}

// Security groups are stateful: a reply to an allowed request is allowed without a rule.
// direction: 'ingress' | 'egress'. Returns the first matching rule, or null.
export function sgAllows(network, groupNames, direction, { protocol, port, peerIp, peerGroups = [] }) {
  for (const name of groupNames) {
    for (const rule of network.securityGroups?.[name]?.[direction] ?? []) {
      if (!portMatches(rule, protocol, port)) continue;
      const peerOk = isCidr(rule.peer) ? peerIp !== undefined && ipInCidr(peerIp, rule.peer) : peerGroups.includes(rule.peer);
      if (peerOk) return { group: name, rule };
    }
  }
  return null;
}

// Network ACLs are stateless: the reply needs its own rule. Rules run lowest number first, first match decides.
// A subnet with no nacl uses the default, which allows everything. An ACL with no matching rule denies.
export function naclAllows(network, subnetName, direction, { protocol, port, ip }) {
  const id = network.subnets[subnetName].nacl;
  if (!id) return { allowed: true, rule: null };
  const rules = [...(network.nacls?.[id]?.[direction === 'in' ? 'inbound' : 'outbound'] ?? [])].sort((a, b) => a.rule - b.rule);
  for (const rule of rules) {
    if (portMatches(rule, protocol, port) && ipInCidr(ip, rule.cidr)) return { allowed: rule.action === 'allow', rule, nacl: id };
  }
  return { allowed: false, rule: null, nacl: id };
}

function endpoint(network, text) {
  if (typeof text === 'string' && text.startsWith('internet:')) return { kind: 'internet', ip: text.slice('internet:'.length), text };
  const instance = network.instances?.[text];
  if (!instance) return null;
  return { kind: 'instance', name: text, ...instance };
}

function routeTableOf(network, subnetName) {
  return network.routeTables[network.subnets[subnetName].routeTable] ?? [];
}

// Is this subnet "public": does its table send 0.0.0.0/0 to an attached internet gateway?
export function hasInternetRoute(network, subnetName) {
  const route = lookupRoute(routeTableOf(network, subnetName), '203.0.113.1');
  return Boolean(route && route.target === 'igw' && network.internetGateway);
}

// checkPath(network, { from, to, protocol = 'tcp', port })
// returns { reachable, fault, steps }
//   fault: null, or { code, where, message } for the first thing that stops the traffic
//   steps: every check made, in order: [{ check, ok, note }]
export function checkPath(network, { from, to, protocol = 'tcp', port }) {
  const steps = [];
  const pass = (check, note = '') => steps.push({ check, ok: true, note });
  const stop = (check, code, where, message) => {
    steps.push({ check, ok: false, note: message });
    return { reachable: false, fault: { code, where, message }, steps };
  };

  const source = endpoint(network, from);
  const target = endpoint(network, to);
  if (!source || !target) return stop('endpoints', 'unknown-endpoint', 'request', `Unknown endpoint: ${!source ? from : to}`);
  if (source.kind === 'internet' && target.kind === 'internet') return stop('endpoints', 'unknown-endpoint', 'request', 'One end must be inside the VPC');

  const request = { protocol, port };
  const reply = { protocol, port: RETURN_PORT };

  // Traffic leaving an instance: security group, network ACL, route.
  if (source.kind === 'instance') {
    const out = sgAllows(network, source.securityGroups, 'egress', { ...request, peerIp: target.ip, peerGroups: target.securityGroups ?? [] });
    if (!out) return stop('security group egress', 'sg-egress-denied', source.securityGroups.join(','), `${from}: no egress rule allows ${protocol}/${port} to ${target.ip}`);
    pass('security group egress', `${out.group} allows ${protocol}/${port}`);

    const naclOut = naclAllows(network, source.subnet, 'out', { ...request, ip: target.ip });
    if (!naclOut.allowed) return stop('network ACL outbound', 'nacl-out-denied', network.subnets[source.subnet].nacl, `${source.subnet}: the outbound ACL does not allow ${protocol}/${port} to ${target.ip}`);
    pass('network ACL outbound');

    const route = lookupRoute(routeTableOf(network, source.subnet), target.ip);
    if (!route) return stop('route', 'no-route', network.subnets[source.subnet].routeTable, `No route to ${target.ip} in ${network.subnets[source.subnet].routeTable}`);
    if (route.target === 'blackhole') return stop('route', 'blackhole', network.subnets[source.subnet].routeTable, `The route for ${route.destination} is a blackhole (its target was deleted)`);

    if (target.kind === 'instance') {
      if (route.target !== 'local') return stop('route', 'no-route', network.subnets[source.subnet].routeTable, `${target.ip} is inside the VPC but the best route goes to ${route.target}`);
      pass('route', `local (${route.destination})`);
    } else if (route.target === 'igw') {
      if (!network.internetGateway) return stop('route', 'no-igw', 'vpc', 'The route points at an internet gateway, but none is attached to the VPC');
      if (!source.publicIp) return stop('public address', 'no-public-ip', from, `${from} has no public IPv4 address, so an internet gateway cannot translate its traffic`);
      pass('route', `internet gateway, public address ${source.publicIp}`);
    } else if (route.target.startsWith('nat:')) {
      const natName = route.target.slice(4);
      const nat = network.natGateways?.[natName];
      if (!nat) return stop('route', 'nat-missing', natName, `The route points at ${natName}, which does not exist`);
      if (!hasInternetRoute(network, nat.subnet)) return stop('NAT gateway subnet', 'nat-not-public', nat.subnet, `${natName} sits in ${nat.subnet}, which has no route to an internet gateway`);
      pass('route', `NAT gateway ${natName} in ${nat.subnet}`);
    } else {
      return stop('route', 'no-route', network.subnets[source.subnet].routeTable, `The best route (${route.destination} to ${route.target}) does not lead to the internet`);
    }
  } else {
    // From the internet to an instance: the instance needs a public address and a public subnet.
    if (!network.internetGateway) return stop('internet gateway', 'no-igw', 'vpc', 'No internet gateway is attached to the VPC');
    if (!target.publicIp) return stop('public address', 'no-public-ip', to, `${to} has no public IPv4 address`);
    pass('public address', target.publicIp);
    if (!hasInternetRoute(network, target.subnet)) {
      const table = network.subnets[target.subnet].routeTable;
      return stop('route', 'no-route', table, `${target.subnet} (${table}) has no route to the internet gateway, so replies cannot leave`);
    }
    pass('subnet has a route to the internet gateway');
  }

  // Traffic arriving at an instance: network ACL, security group.
  if (target.kind === 'instance') {
    const naclIn = naclAllows(network, target.subnet, 'in', { ...request, ip: source.ip });
    if (!naclIn.allowed) return stop('network ACL inbound', 'nacl-in-denied', network.subnets[target.subnet].nacl, `${target.subnet}: the inbound ACL does not allow ${protocol}/${port} from ${source.ip}`);
    pass('network ACL inbound');

    const into = sgAllows(network, target.securityGroups, 'ingress', { ...request, peerIp: source.ip, peerGroups: source.securityGroups ?? [] });
    if (!into) return stop('security group ingress', 'sg-ingress-denied', target.securityGroups.join(','), `${to}: no ingress rule allows ${protocol}/${port} from ${source.kind === 'instance' ? from : source.ip}`);
    pass('security group ingress', `${into.group} allows ${protocol}/${port}`);

    // The reply travels back. Security groups remember the request; network ACLs do not.
    const backOut = naclAllows(network, target.subnet, 'out', { ...reply, ip: source.ip });
    if (!backOut.allowed) return stop('network ACL reply (outbound)', 'nacl-return-denied', network.subnets[target.subnet].nacl, `${target.subnet}: the outbound ACL blocks the reply to ${source.ip}`);
    pass('network ACL reply (outbound)');
  }
  if (source.kind === 'instance') {
    const backIn = naclAllows(network, source.subnet, 'in', { ...reply, ip: target.ip });
    if (!backIn.allowed) return stop('network ACL reply (inbound)', 'nacl-return-denied', network.subnets[source.subnet].nacl, `${source.subnet}: the inbound ACL blocks the reply from ${target.ip}`);
    pass('network ACL reply (inbound)');
  }
  return { reachable: true, fault: null, steps };
}
