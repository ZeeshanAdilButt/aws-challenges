// STEP 1: this part never calls AWS. It measures how much of the bill carries the tags Daftar requires.
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { tagCoverage } from '../../../toolkit/models/bill.js';
import { main } from '../../../toolkit/part.js';
import { MONTHS, readReport } from '../part-1-the-usage-report/generate.mjs';

export const title = 'Challenge 15, part 3: tags and rules';

// A tag is a label on a resource, like team=api. Cost reports can group by tag, but only for resources that have the tag.
export const REQUIRED = ['team', 'env', 'service'];

// STEP 2: coverage for each AWS service (your turn).
// Return a list of { service, total, percent } for every service in the lines, lowest percent first (ties by service name).
// percent is the share of that service's dollars on lines that carry every required tag.
export function coverageByService(lines, required) {
  // YOUR TURN start
  // HINT: group the lines by service, then call tagCoverage(group, required) on each group.
  // YOUR TURN end
}

// STEP 3: the tagging rules (your turn). Fill in the three required tags: the allowed values of each, and who enforces the rule.
export const taggingRules = {
  // YOUR TURN start
  // YOUR TURN end
};

export const RULES_FILE = new URL('./tagging-rules.md', import.meta.url);

export async function run() {
  const lines = readReport(MONTHS[1]).lines;
  const overall = tagCoverage(lines, REQUIRED);
  const byService = coverageByService(lines, REQUIRED);
  const md = ['# Tagging rules', '', 'Cost: 0 dollars, runs on the emulator.', '', 'Every resource needs these three tags.', '', '| Tag | Allowed values | Who enforces it |', '|---|---|---|',
    ...Object.entries(taggingRules).map(([name, r]) => `| ${name} | ${r.values.join(', ')} | ${r.enforcedBy} |`), ''].join('\n');
  fs.writeFileSync(RULES_FILE, md);
  return {
    facts: [
      ['Required tags', REQUIRED.join(', ')],
      ['Bill covered by every required tag', `${overall.percent} percent (${overall.covered.toFixed(2)} of ${overall.total.toFixed(2)} dollars)`],
      ['Dollars missing each tag', Object.entries(overall.missing).map(([tag, dollars]) => `${tag}: ${dollars.toFixed(2)}`).join(', ')],
    ],
    head: ['AWS service', 'Bill (dollars)', 'Covered (%)'],
    rows: byService.map((s) => [s.service, s.total.toFixed(2), s.percent]),
    chart: {
      title: 'Share of each service bill with every required tag (percent)',
      unit: '%',
      format: (v) => v.toFixed(0),
      bars: byService.map((s) => ({ label: s.service, value: s.percent })),
    },
  };
}

main(import.meta.url, run);
