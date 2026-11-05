// STEP 1: this script never calls AWS and never starts OpenTofu. It reads your .tf files and checks them.
// The real apply (the wrapper starts OpenTofu in a container on the emulator's network) is run by hand, see the README.
import '../../../toolkit/guard-offline.js';
import { fileURLToPath } from 'node:url';
import { parseResources, tfText } from '../../../toolkit/hcl.js';
import { planDiff } from '../../../toolkit/models/plan.js';
import { main } from '../../../toolkit/part.js';
import { CONTAINER_ENDPOINT, TOFU_IMAGE, dockerArgs, providerOverride } from '../../../toolkit/tofu.js';

export const title = 'Challenge 14, part 1: the VPC as code';

export const DIR = fileURLToPath(new URL('.', import.meta.url));

// STEP 2: read the code. The files are versions.tf, variables.tf, main.tf and outputs.tf in this folder.
export const readResources = (dir = DIR) => parseResources(tfText(dir));

// STEP 3: what the code should declare. These are the 21 resources of challenge 4's network:
// the VPC, the internet gateway, six subnets, three route tables with their routes and six associations, the Elastic IP and the NAT gateway.
// The tables rt-public and rt-app each have a 0.0.0.0/0 route. The table rt-data has none.
export const EXPECTED = [
  'aws_vpc.main', 'aws_internet_gateway.main',
  'aws_subnet.app_a', 'aws_subnet.app_b', 'aws_subnet.public_a', 'aws_subnet.public_b', 'aws_subnet.data_a', 'aws_subnet.data_b',
  'aws_route_table.public', 'aws_route_table.app', 'aws_route_table.data',
  'aws_route.public_internet', 'aws_route.app_internet',
  'aws_route_table_association.public_a', 'aws_route_table_association.public_b',
  'aws_route_table_association.app_a', 'aws_route_table_association.app_b',
  'aws_route_table_association.data_a', 'aws_route_table_association.data_b',
  'aws_eip.nat', 'aws_nat_gateway.a',
];

// STEP 4: the plan line the course model gives for this code against an empty account. The real `tofu plan` line came out the
// same in the first apply run. The model puts dependencies first, so the VPC comes before everything that needs it.
export function modelPlan(resources = readResources()) {
  return planDiff(resources.map((r) => ({ id: r.id, type: r.type, attrs: r.attrs, dependsOn: r.dependsOn })), []);
}

export const COMMANDS = ['init', 'plan', 'apply -auto-approve'];

export async function run() {
  const resources = readResources();
  const plan = modelPlan(resources);
  const missing = EXPECTED.filter((id) => !resources.some((r) => r.id === id));
  const byType = new Map();
  for (const r of resources) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
  const aws = providerOverride().provider.aws;
  return {
    facts: [
      ['Resources declared', `${resources.length} (expected ${EXPECTED.length}, missing ${missing.length})`],
      ['Plan line from the course model', plan.line],
      ['First resource to create', plan.steps[0]?.id ?? 'none'],
      ['Wrapper', `${TOFU_IMAGE} on the Compose network, endpoint ${CONTAINER_ENDPOINT}, allowed_account_ids ${aws.allowed_account_ids.join(' and ')}`],
      ['Docker arguments for plan', dockerArgs('.', ['plan']).slice(0, 4).join(' ') + ' ...'],
      ['First apply run', 'Plan: 21 to add, 0 to change, 0 to destroy. Then: Apply complete! Resources: 21 added, 0 changed, 0 destroyed.'],
    ],
    head: ['Resource type', 'Count'],
    rows: [...byType.entries()].sort().map(([type, count]) => [type, count]),
  };
}

main(import.meta.url, run);
