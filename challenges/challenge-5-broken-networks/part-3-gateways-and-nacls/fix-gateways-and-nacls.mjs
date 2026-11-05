// STEP 1: this part never calls AWS. The reachability model finds each fault; you write the fix and the runbook line.
import '../../../toolkit/guard-offline.js';
import { main } from '../../../toolkit/part.js';
import { loadSet, resultFor, runSet } from '../shared.mjs';

export const title = 'Challenge 5, part 3: broken gateways and network ACLs';

// STEP 2: the three broken networks. Provided.
export const set = loadSet(new URL('./configs.json', import.meta.url));

// STEP 3: one fix per configuration (your turn).
export const fixes = {
  // YOUR TURN start
  // HINT: network.natGateways['nat-a'].subnet is where the NAT gateway lives. A NAT gateway must sit in a public subnet.
  // HINT: network.instances.alb.publicIp is the public address. network.nacls[...].outbound is a list of rules, lowest number first.
  // HINT: a network ACL is stateless: the reply needs its own rule. Replies go to high ports, 1024 to 65535.
  // YOUR TURN end
};

// STEP 4: one runbook line per configuration (your turn): "<fault code> at <where>: <what to change>".
export const runbook = {
  // YOUR TURN start
  // HINT: for nat-not-public the place is the subnet that holds the NAT gateway; for nacl-return-denied it is the ACL.
  // YOUR TURN end
};

export async function run() {
  return resultFor(set, runSet(set, fixes, runbook), 'Gateways and ACLs');
}

main(import.meta.url, run);
