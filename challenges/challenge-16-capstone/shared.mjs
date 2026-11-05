// Shared by the four parts of challenge 16: the capstone code, read as text, and the network it describes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseResources, tfText } from '../../toolkit/hcl.js';
import { exampleNetwork } from '../../toolkit/models/example-network.js';

export const PART1 = fileURLToPath(new URL('./part-1-design-and-code/', import.meta.url));
export const INFRA = path.join(PART1, 'infra');
export const VALIDATE_ONLY = path.join(INFRA, 'validate-only');

export const infraText = () => tfText(INFRA);
export const infraResources = () => parseResources(infraText());
export const policyFile = (name) => JSON.parse(fs.readFileSync(path.join(INFRA, 'policies', `${name}.json`), 'utf8'));

// The security groups as the code declares them, in the shape the reachability model reads.
// aws_security_group.app becomes 'sg-app'. A rule's peer is its cidr_ipv4, or the group it refers to.
export function securityGroupsFromCode(resources = infraResources()) {
  const groups = {};
  for (const r of resources.filter((x) => x.type === 'aws_security_group')) groups[`sg-${r.id.split('.')[1]}`] = { ingress: [], egress: [] };
  for (const r of resources) {
    const direction = r.type === 'aws_vpc_security_group_ingress_rule' ? 'ingress' : r.type === 'aws_vpc_security_group_egress_rule' ? 'egress' : null;
    if (!direction) continue;
    const owner = `sg-${r.attrs.security_group_id.split('.')[1]}`;
    const peer = r.attrs.cidr_ipv4 ?? `sg-${r.attrs.referenced_security_group_id.split('.')[1]}`;
    groups[owner][direction].push({ protocol: r.attrs.ip_protocol, from: Number(r.attrs.from_port), to: Number(r.attrs.to_port), peer });
  }
  return groups;
}

// The reference network (subnets, routes, servers) with the security groups replaced by the ones in the code.
// The subnet blocks in the code are checked against the reference in part 1.
export function networkFromCode() {
  const network = exampleNetwork();
  network.securityGroups = securityGroupsFromCode();
  return network;
}
