// STEP 1: this part never calls AWS. It is arithmetic on address blocks, using the subnet model.
import '../../../toolkit/guard-offline.js';
import { intToIp, parseCidr, prefixForHosts, usableAddresses } from '../../../toolkit/models/subnets.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 4, part 1: plan the address blocks';

export const VPC = '10.20.0.0/16';

// What each subnet must hold: the number of addresses its servers and load balancers need, with room to grow.
export const requirements = [
  { name: 'public-a', zone: 'a', hosts: 200 },
  { name: 'public-b', zone: 'b', hosts: 200 },
  { name: 'app-a', zone: 'a', hosts: 1000 },
  { name: 'app-b', zone: 'b', hosts: 1000 },
  { name: 'data-a', zone: 'a', hosts: 50 },
  { name: 'data-b', zone: 'b', hosts: 50 },
];

// STEP 2: give every requirement its own block inside the VPC (your turn).
// Rules: big blocks first (they need the strictest alignment), every block starts at a multiple of its own size,
// no two blocks overlap, everything stays inside the VPC, and throw an Error if it does not fit.
// Return [{ name, zone, cidr, prefix, usable }] sorted by address.
export function buildPlan(vpcCidr, needs) {
  // YOUR TURN start
  // HINT: prefixForHosts(hosts) gives the smallest prefix that holds that many hosts after AWS keeps 5 addresses.
  // HINT: keep a cursor (an address number). Round it up to a multiple of the block size, place the block, move the cursor.
  // YOUR TURN end
}

export async function run() {
  const plan = buildPlan(VPC, requirements);
  const used = plan.reduce((sum, p) => sum + parseCidr(p.cidr).size, 0);
  const total = parseCidr(VPC).size;
  return {
    facts: [
      ['VPC block', `${VPC} (${total} addresses)`],
      ['Addresses given to subnets', `${used} (${((used / total) * 100).toFixed(1)} percent)`],
      ['Addresses left for later', String(total - used)],
    ],
    head: ['Subnet', 'Zone', 'Block', 'Usable addresses', 'Needed', 'Spare'],
    rows: plan.map((p) => {
      const need = requirements.find((r) => r.name === p.name).hosts;
      return [p.name, p.zone, p.cidr, p.usable, need, p.usable - need];
    }),
    chart: {
      title: 'Usable addresses in each subnet',
      unit: 'addresses',
      bars: plan.map((p) => ({ label: `${p.name} ${p.cidr}`, value: p.usable })),
    },
  };
}

main(import.meta.url, run);
