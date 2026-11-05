// STEP 1: this part never calls AWS. The reachability model finds each fault; you write the fix and the runbook line.
import '../../../toolkit/guard-offline.js';
import { main } from '../../../toolkit/part.js';
import { loadSet, resultFor, runSet } from '../shared.mjs';

export const title = 'Challenge 5, part 1: four broken security groups';

// STEP 2: the four broken networks. Each has one probe that fails. Provided.
export const set = loadSet(new URL('./configs.json', import.meta.url));

// STEP 3: one fix per configuration (your turn). A fix is a function that changes the network it is given.
// Change the smallest thing that is wrong. Opening a port to 0.0.0.0/0 would also "work", and the test refuses it.
export const fixes = {
  // YOUR TURN start
  // HINT: network.securityGroups['sg-name'].ingress is a list of rules: { protocol, from, to, peer }.
  // HINT: peer is an address range like '0.0.0.0/0' or the name of another security group like 'sg-app'.
  // YOUR TURN end
};

// STEP 4: one runbook line per configuration (your turn). Say the fault code, where it is, and what to change.
// Example shape:  "<fault code> at <where>: <what to change>"
export const runbook = {
  // YOUR TURN start
  // HINT: the model reports a code (like sg-ingress-denied) and a place (like sg-app). Both must appear in your line.
  // YOUR TURN end
};

export async function run() {
  return resultFor(set, runSet(set, fixes, runbook), 'Security groups');
}

main(import.meta.url, run);
