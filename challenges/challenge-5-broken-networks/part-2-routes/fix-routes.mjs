// STEP 1: this part never calls AWS. The reachability model finds each fault; you write the fix and the runbook line.
import '../../../toolkit/guard-offline.js';
import { main } from '../../../toolkit/part.js';
import { loadSet, resultFor, runSet } from '../shared.mjs';

export const title = 'Challenge 5, part 2: three broken route tables';

// STEP 2: the three broken networks. Provided.
export const set = loadSet(new URL('./configs.json', import.meta.url));

// STEP 3: one fix per configuration (your turn).
export const fixes = {
  // YOUR TURN start
  // HINT: network.routeTables['rt-name'] is a list of { destination, target }. target is 'local', 'igw', 'nat:<name>' or 'blackhole'.
  // HINT: network.subnets['subnet-name'].routeTable says which table a subnet uses.
  // YOUR TURN end
};

// STEP 4: one runbook line per configuration (your turn): "<fault code> at <where>: <what to change>".
export const runbook = {
  // YOUR TURN start
  // HINT: a blackhole route means its target was deleted. no-route means no line in the table matches the address.
  // YOUR TURN end
};

export async function run() {
  return resultFor(set, runSet(set, fixes, runbook), 'Route tables');
}

main(import.meta.url, run);
