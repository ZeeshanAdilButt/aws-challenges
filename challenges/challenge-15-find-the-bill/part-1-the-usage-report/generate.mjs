// STEP 1: this part never calls AWS. It writes two usage reports to datasets/ from unit prices, then reads them.
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { main } from '../../../toolkit/part.js';
import { rng } from '../../../toolkit/random.js';

export const title = 'Challenge 15, part 1: the usage report';

export const SEED = 15;
export const MONTHS = ['2026-08', '2026-09'];
export const REPORT_FILES = MONTHS.map((m) => new URL(`../../../datasets/usage-${m}.json`, import.meta.url));

// STEP 2: the unit prices. us-east-1, dollars, read 2026-10-24 (dossier appendix 01b). Every price here is VERIFIED.
//   EC2 m7g.large 0.0816 an hour (P13, tool-read)      NAT gateway 0.045 an hour and 0.045 a GB (P15)
//   ALB 0.0225 an hour and 0.008 per LCU-hour (P9)     public IPv4 0.005 an hour (P14, P12)
//   CloudWatch Logs ingestion 0.50 a GB (P7)           S3 Standard 0.023 a GB-month, PUT 0.005 per 1,000 (P11)
//   DynamoDB on-demand 0.625 per million writes, 0.125 per million reads (P10)    SQS standard 0.40 per million requests (D4)
export const UNIT = {
  ec2: 0.0816, natHour: 0.045, natGb: 0.045, albHour: 0.0225, lcu: 0.008, ipv4: 0.005, logsGb: 0.5,
  s3Gb: 0.023, s3Put1000: 0.005, ddbWriteM: 0.625, ddbReadM: 0.125, sqsM: 0.4,
};
const HOURS = 730;

// The lines of one month. `grow` is what changes between the two months. The tags are what each resource carries:
// team, env and service. Some resources have none, on purpose (part 3 counts them).
export function lines(month) {
  const random = rng(SEED + (month === MONTHS[0] ? 0 : 1));
  const wobble = (n) => Math.round(n * (1 + (random.next() - 0.5) * 0.04));
  const second = month === MONTHS[1];
  const out = [];
  const add = (service, usageType, resource, quantity, unit, unitPrice, tags = {}) =>
    out.push({ service, usageType, resource, quantity, unit, unitPrice, cost: Math.round(quantity * unitPrice * 100) / 100, tags });
  const api = { team: 'api', env: 'prod', service: 'daftar-api' };
  add('EC2', 'BoxUsage:m7g.large', 'daftar-api (6 servers)', 6 * HOURS, 'hours', UNIT.ec2, api);
  add('EC2', 'BoxUsage:m7g.large', 'daftar-worker (2 servers)', 2 * HOURS, 'hours', UNIT.ec2, { team: 'api', env: 'prod', service: 'daftar-worker' });
  add('EC2', 'BoxUsage:m7g.large', 'daftar-admin (1 server)', HOURS, 'hours', UNIT.ec2, { team: 'platform', env: 'prod' });
  add('VPC', 'NatGateway-Hours', 'nat-a, nat-b', 2 * HOURS, 'hours', UNIT.natHour, { team: 'platform', env: 'prod', service: 'network' });
  add('VPC', 'NatGateway-Bytes', 'nat-a, nat-b', second ? 20000 : 900, 'GB', UNIT.natGb, { team: 'platform', env: 'prod', service: 'network' });
  add('VPC', 'PublicIPv4:InUseAddress', 'public addresses', (second ? 29 : 20) * HOURS, 'hours', UNIT.ipv4, {});
  add('CloudWatch', 'DataProcessing-Bytes', '/daftar/api, /daftar/worker', second ? 1800 : 120, 'GB', UNIT.logsGb, { team: 'api', env: 'prod' });
  add('ELB', 'LoadBalancerUsage', 'daftar-prod-alb', HOURS, 'hours', UNIT.albHour, { team: 'api', env: 'prod', service: 'daftar-api' });
  add('ELB', 'LCUUsage', 'daftar-prod-alb', HOURS * 1.5, 'LCU-hours', UNIT.lcu, { team: 'api', env: 'prod', service: 'daftar-api' });
  for (const name of ['daftar-staging-alb', 'daftar-admin-alb']) {
    add('ELB', 'LoadBalancerUsage', name, HOURS, 'hours', UNIT.albHour, { team: 'api', env: name.includes('staging') ? 'staging' : 'prod', service: 'daftar-api' });
    add('ELB', 'LCUUsage', name, HOURS * 0.5, 'LCU-hours', UNIT.lcu, { team: 'api', env: name.includes('staging') ? 'staging' : 'prod', service: 'daftar-api' });
  }
  if (second) {
    // Six load balancers left behind by feature branches: no tags, no traffic.
    for (let i = 1; i <= 6; i++) {
      add('ELB', 'LoadBalancerUsage', `feature-branch-${i}-alb`, HOURS, 'hours', UNIT.albHour, {});
      add('ELB', 'LCUUsage', `feature-branch-${i}-alb`, HOURS * 0.05, 'LCU-hours', UNIT.lcu, {});
    }
  }
  add('S3', 'TimedStorage-ByteHrs', 'daftar-notes-prod', wobble(second ? 17500 : 16500), 'GB-months', UNIT.s3Gb, { team: 'api', env: 'prod', service: 'daftar-api' });
  add('S3', 'TimedStorage-ByteHrs', 'daftar-exports', wobble(second ? 4200 : 3900), 'GB-months', UNIT.s3Gb, { team: 'api', env: 'prod' });
  add('S3', 'Requests-Tier1', 'daftar-notes-prod', wobble(second ? 55000 : 50000), 'thousand requests', UNIT.s3Put1000, { team: 'api', env: 'prod', service: 'daftar-api' });
  add('DynamoDB', 'WriteRequestUnits', 'daftar-sessions', wobble(second ? 210 : 200), 'million units', UNIT.ddbWriteM, { team: 'api', env: 'prod', service: 'daftar-api' });
  add('DynamoDB', 'ReadRequestUnits', 'daftar-sessions', wobble(second ? 830 : 800), 'million units', UNIT.ddbReadM, { team: 'api', env: 'prod', service: 'daftar-api' });
  add('SQS', 'Requests-Tier1', 'daftar-jobs', wobble(second ? 330 : 300), 'million requests', UNIT.sqsM, { team: 'api', env: 'prod', service: 'daftar-worker' });
  return out;
}

export function report(month) {
  return { month, currency: 'USD', description: 'A made-up monthly usage report for the Daftar account.', lines: lines(month) };
}

// STEP 3: read a report back from datasets/.
export function readReport(month) {
  return JSON.parse(fs.readFileSync(REPORT_FILES[MONTHS.indexOf(month)], 'utf8'));
}

// STEP 4: add up a report by AWS service, biggest first (your turn).
// Returns an array of { service, cost } with cost rounded to cents.
export function totalsByService(reportLines) {
  // YOUR TURN start
  // HINT: use a Map or an object keyed by service name; round only at the end.
  // YOUR TURN end
}

export const grandTotal = (reportLines) => Math.round(reportLines.reduce((sum, line) => sum + line.cost, 0) * 100) / 100;

export async function run() {
  for (const [i, month] of MONTHS.entries()) fs.writeFileSync(fileURLToPath(REPORT_FILES[i]), `${JSON.stringify(report(month))}\n`);
  const [a, b] = MONTHS.map(readReport);
  const prev = totalsByService(a.lines);
  const curr = totalsByService(b.lines);
  const services = [...new Set([...prev, ...curr].map((r) => r.service))];
  const find = (list, s) => list.find((r) => r.service === s)?.cost ?? 0;
  return {
    facts: [
      ['Lines in each report', `${a.lines.length} and ${b.lines.length}`],
      [`Total for ${MONTHS[0]}`, `${grandTotal(a.lines).toFixed(2)} dollars`],
      [`Total for ${MONTHS[1]}`, `${grandTotal(b.lines).toFixed(2)} dollars`],
      ['Growth', `${(grandTotal(b.lines) / grandTotal(a.lines)).toFixed(2)} times`],
    ],
    head: ['Service', MONTHS[0], MONTHS[1]],
    rows: services.sort((x, y) => find(curr, y) - find(curr, x)).map((s) => [s, find(prev, s).toFixed(2), find(curr, s).toFixed(2)]),
    chart: {
      title: 'Monthly bill by service in dollars (last month, this month)',
      unit: 'dollars',
      format: (v) => v.toFixed(0),
      bars: services.slice(0, 5).flatMap((s) => [{ label: `${s} ${MONTHS[0]}`, value: find(prev, s) }, { label: `${s} ${MONTHS[1]}`, value: find(curr, s) }]),
    },
  };
}

main(import.meta.url, run);
