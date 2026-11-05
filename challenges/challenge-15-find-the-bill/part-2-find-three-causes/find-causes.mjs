// STEP 1: this part never calls AWS. It compares two monthly usage reports.
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { anomalies, billDiff } from '../../../toolkit/models/bill.js';
import { main } from '../../../toolkit/part.js';
import { MONTHS, readReport } from '../part-1-the-usage-report/generate.mjs';

export const title = 'Challenge 15, part 2: find three causes';

// STEP 2: the diff and the anomalies. Provided. billDiff sums the lines of each service and usage type, orders by the
// biggest increase, and anomalies keeps the rows that grew by at least 50 dollars AND at least 2 times (or are new).
export function diff() {
  return billDiff(readReport(MONTHS[0]).lines, readReport(MONTHS[1]).lines);
}
export const flagged = () => anomalies(diff());

// STEP 3: explain each flagged row (your turn).
// For every key in `keys` return { key, dollars, cause, fix }: dollars is the increase (delta) of that row, cause is one plain sentence
// about why it grew, and fix is one plain sentence about what to do. The three real causes of this bill:
//   VPC|NatGateway-Bytes          data going out through the NAT gateways jumped (a new job pulls big files from S3 through NAT)
//   CloudWatch|DataProcessing-Bytes  log volume jumped (debug-level logging was switched on)
//   ELB|LoadBalancerUsage         load balancers that nobody uses were left running (six feature-branch ALBs with no traffic)
export function explain(rows, keys) {
  // YOUR TURN start
  // HINT: find each row with rows.find((r) => r.key === key). Write the cause and the fix in your own words.
  // YOUR TURN end
}

export const FINDINGS_FILE = new URL('./findings.md', import.meta.url);

export async function run() {
  const rows = diff();
  const keys = flagged();
  const found = explain(rows, keys);
  const prevTotal = readReport(MONTHS[0]).lines.reduce((s, l) => s + l.cost, 0);
  const currTotal = readReport(MONTHS[1]).lines.reduce((s, l) => s + l.cost, 0);
  fs.writeFileSync(FINDINGS_FILE, `# Findings: why the bill doubled\n\nCost: 0 dollars, runs on the emulator.\n\n${found.map((f, i) => `## ${i + 1}. ${f.key} (+${f.dollars.toFixed(2)} dollars)\n\n- Cause: ${f.cause}\n- Fix: ${f.fix}\n`).join('\n')}`);
  const explained = found.reduce((s, f) => s + f.dollars, 0);
  return {
    facts: [
      ['Total increase', `${(currTotal - prevTotal).toFixed(2)} dollars (${MONTHS[0]} to ${MONTHS[1]})`],
      ['Flagged rows', keys.join(', ')],
      ['Share of the increase the three causes explain', `${Math.round((explained / (currTotal - prevTotal)) * 100)} percent`],
    ],
    head: ['Usage type', 'Last month', 'This month', 'Increase', 'Times'],
    rows: rows.slice(0, 6).map((r) => [r.key, r.prev.toFixed(2), r.curr.toFixed(2), r.delta.toFixed(2), r.ratio === null ? 'new' : r.ratio.toFixed(1)]),
    chart: {
      title: 'Increase in dollars for the three flagged rows',
      unit: 'dollars',
      format: (v) => v.toFixed(0),
      bars: found.map((f) => ({ label: f.key, value: f.dollars })),
    },
  };
}

main(import.meta.url, run);
