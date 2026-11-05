// STEP 1: this part never calls AWS. Three things go wrong on purpose, and each is measured with a model or a dataset from an earlier challenge.
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { anomalies, billDiff } from '../../../toolkit/models/bill.js';
import { checkPath } from '../../../toolkit/models/reach.js';
import { simulate } from '../../../toolkit/models/scaling.js';
import { barsSvg } from '../../../toolkit/bars.js';
import { main } from '../../../toolkit/part.js';
import { LEAKED_KEY, TRUSTED_IPS, scopeKey } from '../../challenge-3-leaked-key/part-2-scope/scope-key.mjs';
import { loadEvents } from '../../challenge-3-leaked-key/part-1-event-log/inspect-log.mjs';
import { MONTHS, readReport } from '../../challenge-15-find-the-bill/part-1-the-usage-report/generate.mjs';
import { loadProfile } from '../../challenge-7-scale-with-load/shared.mjs';
import { networkFromCode } from '../shared.mjs';

export const title = 'Challenge 16, part 3: break it';

// STEP 2: experiment 1, a zone is lost during the sale (your turn).
// Replay the sale profile (challenge 7) with a fleet that aims for `target` percent busy, between 4 and 50 servers, warm-up 120 s,
// that starts the sale already sized for the peak (initial = ceil(1000 / (50 x target / 100)) servers), and a zone failure at second 780
// that takes away half of the running servers.
// Return { dropped, dropPercent } (percent of the requests offered, two decimals).
export function zoneLoss(target) {
  // YOUR TURN start
  // HINT: simulate({ profile, stepSeconds, perServerRps, target, min, max, warmupSeconds, cooldownSeconds, scheduled, lose: { atSecond, fraction } }).
  // YOUR TURN end
}

// With one NAT gateway in zone a, losing zone a also cuts outside calls from zone b. The reachability model says which fault it is.
export function natZoneLost() {
  const network = networkFromCode();
  const before = checkPath(network, { from: 'app', to: 'internet:203.0.113.20', port: 443 });
  delete network.natGateways['nat-a'];
  const after = checkPath(network, { from: 'app', to: 'internet:203.0.113.20', port: 443 });
  return { before: before.reachable ? 'ok' : before.fault.code, after: after.reachable ? 'ok' : after.fault.code };
}

// STEP 3: experiment 2, the leaked key (challenge 3). Scope it from the dataset. Provided.
export const keyScope = () => scopeKey(loadEvents(), LEAKED_KEY, TRUSTED_IPS);

// STEP 4: experiment 3, a bill spike (challenge 15). Find it with billDiff. Provided.
export function billSpike() {
  const rows = billDiff(readReport(MONTHS[0]).lines, readReport(MONTHS[1]).lines);
  return { rows, flagged: anomalies(rows) };
}

// STEP 5: the runbook, one entry for each experiment (your turn). Each entry has a symptom, a check and a fix, in plain sentences.
export const runbook = {
  // YOUR TURN start
  // YOUR TURN end
};

export const RUNBOOK_FILE = new URL('./runbook.md', import.meta.url);
const dir = new URL('./', import.meta.url);

export async function run() {
  const z50 = zoneLoss(40);
  const z80 = zoneLoss(80);
  const nat = natZoneLost();
  const scope = keyScope();
  const s = scope.suspect;
  const spike = billSpike();
  const entry = (name, e) => `## ${name}\n\n- Symptom: ${e.symptom}\n- Check: ${e.check}\n- Fix: ${e.fix}\n`;
  fs.writeFileSync(RUNBOOK_FILE, `# Runbook: three failures we tried\n\nCost: 0 dollars, runs on the emulator.\n\n${entry('A zone is lost', runbook.zoneLost)}\n${entry('A key is leaked', runbook.leakedKey)}\n${entry('The bill jumps', runbook.billSpike)}`);
  // One chart for each experiment.
  const write = (name, chart) => fs.writeFileSync(new URL(name, dir), barsSvg(chart));
  write('chart-zone.svg', { title: 'Requests dropped when a zone is lost (percent), by target busy level', unit: '%', bars: [{ label: 'target 40 percent', value: z50.dropPercent }, { label: 'target 80 percent', value: z80.dropPercent }] });
  write('chart-key.svg', { title: 'What the stranger did (calls)', unit: 'calls', bars: [{ label: 'calls in total', value: s.calls }, { label: 'calls that failed', value: s.failed }, { label: 'notes read', value: s.objectsRead }, { label: 'servers started', value: s.instancesLaunched }] });
  write('chart-bill.svg', { title: 'Increase in dollars, three flagged bill rows', unit: 'dollars', format: (v) => v.toFixed(0), bars: spike.flagged.map((k) => ({ label: k, value: spike.rows.find((r) => r.key === k).delta })) });
  return {
    facts: [
      ['Experiment 1: a zone is lost during the sale', `target 40 percent: ${z50.dropPercent} percent dropped; target 80 percent: ${z80.dropPercent} percent dropped`],
      ['One NAT gateway in the lost zone', `app to the internet goes from ${nat.before} to ${nat.after}`],
      ['Experiment 2: the leaked key', `${s.calls} calls from ${s.sourceIps.join(' ')}, ${s.failed} failed, ${s.objectsRead} notes read, ${s.instancesLaunched} servers started`],
      ['Experiment 3: the bill spike', `${spike.flagged.length} rows flagged: ${spike.flagged.join(', ')}`],
    ],
    head: ['Experiment', 'Number that matters', 'Chart'],
    rows: [
      ['zone lost, target 40', `${z50.dropPercent} percent dropped`, 'chart-zone.svg'],
      ['leaked key', `${s.calls} stranger calls`, 'chart-key.svg'],
      ['bill spike', `${spike.flagged.length} flagged rows`, 'chart-bill.svg'],
    ],
    chart: { title: 'Requests dropped when a zone is lost (percent)', unit: '%', bars: [{ label: 'target 40 percent', value: z50.dropPercent }, { label: 'target 80 percent', value: z80.dropPercent }] },
  };
}

main(import.meta.url, run);
