// CIDR arithmetic for AWS networks. Pure functions, no AWS calls.
// A CIDR block like 10.20.0.0/22 is a start address plus a prefix length. The prefix says how many
// of the 32 bits are fixed; the rest count addresses. /22 leaves 10 bits, so 2^10 = 1024 addresses.
// AWS keeps the first four and the last address of every subnet, so usable = size - 5.

export const RESERVED_PER_SUBNET = 5;
export const AWS_MIN_PREFIX = 16; // largest subnet or VPC AWS allows (65,536 addresses)
export const AWS_MAX_PREFIX = 28; // smallest (16 addresses)

export function ipToInt(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) {
    throw new Error(`"${ip}" is not an IPv4 address`);
  }
  return parts.reduce((total, p) => total * 256 + Number(p), 0);
}

export function intToIp(n) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

// parseCidr('10.20.0.0/22') -> { cidr, base, prefix, size, first, last, firstIp, lastIp }
// A bare address ("10.0.0.5") is read as a /32.
export function parseCidr(cidr) {
  const [address, prefixText = '32'] = String(cidr).split('/');
  const prefix = Number(prefixText);
  if (!/^\d+$/.test(prefixText) || prefix > 32) {
    throw new Error(`"${cidr}" has a bad prefix length`);
  }
  const base = ipToInt(address);
  const size = 2 ** (32 - prefix);
  if (base % size !== 0) {
    throw new Error(`"${cidr}" has host bits set: a /${prefix} must start at a multiple of ${size}`);
  }
  const last = base + size - 1;
  return { cidr: `${intToIp(base)}/${prefix}`, base, prefix, size, first: base, last, firstIp: intToIp(base), lastIp: intToIp(last) };
}

// AWS subnets lose five addresses.
export function usableAddresses(cidr) {
  return Math.max(0, parseCidr(cidr).size - RESERVED_PER_SUBNET);
}

// The five addresses AWS keeps in every subnet.
export function reservedAddresses(cidr) {
  const { base, last } = parseCidr(cidr);
  return [
    { ip: intToIp(base), purpose: 'network address' },
    { ip: intToIp(base + 1), purpose: 'VPC router' },
    { ip: intToIp(base + 2), purpose: 'DNS server' },
    { ip: intToIp(base + 3), purpose: 'reserved for future use' },
    { ip: intToIp(last), purpose: 'network broadcast (not used, but reserved)' },
  ];
}

// Cut a block into equal smaller blocks: splitCidr('10.0.0.0/16', 18) -> four /18 blocks.
export function splitCidr(cidr, newPrefix) {
  const { base, prefix, size } = parseCidr(cidr);
  if (!Number.isInteger(newPrefix) || newPrefix < prefix || newPrefix > 32) {
    throw new Error(`cannot split a /${prefix} into /${newPrefix}`);
  }
  const step = 2 ** (32 - newPrefix);
  const blocks = [];
  for (let start = base; start < base + size; start += step) blocks.push(`${intToIp(start)}/${newPrefix}`);
  return blocks;
}

export function overlaps(a, b) {
  const x = parseCidr(a);
  const y = parseCidr(b);
  return x.first <= y.last && y.first <= x.last;
}

export function contains(outer, inner) {
  const o = parseCidr(outer);
  const i = parseCidr(inner);
  return o.first <= i.first && i.last <= o.last;
}

export function ipInCidr(ip, cidr) {
  const n = ipToInt(ip);
  const { first, last } = parseCidr(cidr);
  return n >= first && n <= last;
}

// The smallest prefix whose subnet still has `hosts` usable addresses (after the five AWS keeps).
export function prefixForHosts(hosts) {
  for (let prefix = AWS_MAX_PREFIX; prefix >= AWS_MIN_PREFIX; prefix--) {
    if (2 ** (32 - prefix) - RESERVED_PER_SUBNET >= hosts) return prefix;
  }
  throw new Error(`${hosts} hosts do not fit in one AWS subnet (the largest is /${AWS_MIN_PREFIX})`);
}

// All pairs in a list that overlap. An empty list means the plan is clean.
export function findOverlaps(cidrs) {
  const pairs = [];
  for (let i = 0; i < cidrs.length; i++) {
    for (let j = i + 1; j < cidrs.length; j++) if (overlaps(cidrs[i], cidrs[j])) pairs.push([cidrs[i], cidrs[j]]);
  }
  return pairs;
}

// Problems with one subnet inside a VPC, as plain sentences. Empty list means fine.
export function checkSubnet(subnetCidr, vpcCidr) {
  const problems = [];
  const subnet = parseCidr(subnetCidr);
  if (subnet.prefix < AWS_MIN_PREFIX || subnet.prefix > AWS_MAX_PREFIX) {
    problems.push(`${subnetCidr}: AWS allows /${AWS_MIN_PREFIX} to /${AWS_MAX_PREFIX} only`);
  }
  if (!contains(vpcCidr, subnetCidr)) problems.push(`${subnetCidr}: not inside the VPC block ${vpcCidr}`);
  return problems;
}
