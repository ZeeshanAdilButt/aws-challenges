// STEP 1: this part never calls AWS and never starts OpenTofu. It reads design.md and the code in infra/ and checks them.
// The apply on the emulator is run by hand with the wrapper (README).
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import path from 'node:path';
import { parseResources, tfText } from '../../../toolkit/hcl.js';
import { exampleNetwork } from '../../../toolkit/models/example-network.js';
import { planDiff } from '../../../toolkit/models/plan.js';
import { main } from '../../../toolkit/part.js';
import { PART1, VALIDATE_ONLY, infraResources, infraText } from '../shared.mjs';

export const title = 'Challenge 16, part 1: design and code it';

// STEP 2: the resource types the platform must declare in infra/ (applied to the emulator).
export const REQUIRED_TYPES = [
  'aws_iam_role', 'aws_iam_role_policy', 'aws_vpc', 'aws_subnet', 'aws_nat_gateway', 'aws_security_group',
  'aws_ecs_cluster', 'aws_ecs_task_definition', 'aws_ecs_service', 'aws_s3_bucket', 'aws_sqs_queue',
  'aws_lambda_function', 'aws_cloudwatch_metric_alarm', 'aws_cloudwatch_log_group',
];
// The database is validate-only: moto has no RDS subnet groups. It lives in infra/validate-only/, a separate root.
export const VALIDATE_ONLY_TYPES = ['aws_db_subnet_group', 'aws_db_instance'];

export const PILLARS = ['Operational excellence', 'Security', 'Reliability', 'Performance efficiency', 'Cost optimization', 'Sustainability'];
export const SECTIONS = ['Requirements', 'Estimate', 'Diagram', 'Self-review against the six pillars', 'Lab board result'];

// STEP 3: read design.md and report what is missing (provided). A section counts when it has at least 40 characters of text.
export function sectionText(markdown, heading, level = 2) {
  const marks = '#'.repeat(level);
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => l.trim() === `${marks} ${heading}`);
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (new RegExp(`^#{1,${level}} `).test(lines[i])) { end = i; break; }
  return lines.slice(start + 1, end).join('\n').trim();
}
export function designGaps(markdown) {
  const gaps = SECTIONS.filter((s) => s !== 'Self-review against the six pillars' && sectionText(markdown, s).length < 40);
  for (const pillar of PILLARS) if (sectionText(markdown, pillar, 3).length < 40) gaps.push(`pillar: ${pillar}`);
  return gaps;
}

export const readDesign = () => {
  const file = path.join(PART1, 'design.md');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};

// STEP 4: the plan line from the course model for the code in infra/. The real `tofu plan` line counts each for_each item, so it is higher.
export function modelPlan() {
  const r = infraResources();
  return planDiff(r.map((x) => ({ id: x.id, type: x.type, attrs: x.attrs, dependsOn: x.dependsOn.filter((d) => r.some((y) => y.id === d)) })), []);
}

export async function run() {
  const resources = infraResources();
  const types = new Set(resources.map((r) => r.type));
  const missing = REQUIRED_TYPES.filter((t) => !types.has(t));
  const dbTypes = parseResources(tfText(VALIDATE_ONLY)).map((r) => r.type);
  const gaps = designGaps(readDesign());
  const plan = modelPlan();
  const reference = exampleNetwork();
  const blocksOk = Object.values(reference.subnets).every((s) => infraText().includes(`"${s.cidr}"`));
  return {
    facts: [
      ['Resource blocks in infra/', `${resources.length} (${types.size} types); missing required types: ${missing.length ? missing.join(', ') : 'none'}`],
      ['Database (validate-only, not applied)', dbTypes.join(', ')],
      ['Subnet blocks equal challenge 4', blocksOk ? 'yes' : 'NO'],
      ['design.md gaps', gaps.length ? gaps.join(', ') : 'none'],
      ['Plan line from the course model', plan.line],
      ['First apply run', 'Plan: 43 to add, 0 to change, 0 to destroy. The apply created 40 and moto 5.2.4 refused the 3 aws_cloudwatch_metric_alarm resources; with the 3 alarms left out by -exclude: Apply complete! Resources: 40 added, 0 changed, 0 destroyed.'],
    ],
    head: ['Resource type', 'Count'],
    rows: [...types].sort().map((t) => [t, resources.filter((r) => r.type === t).length]),
  };
}

main(import.meta.url, run);
