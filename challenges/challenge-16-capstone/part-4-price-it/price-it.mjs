// STEP 1: this part never calls AWS. The emulator has no cost data, so the cost comes from toolkit/models/cost.js and the dated price table.
import '../../../toolkit/guard-offline.js';
import { ASSUMPTIONS, PRICE_DATE, largestLine, monthlyCost } from '../../../toolkit/models/cost.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 16, part 4: price it';

// STEP 2: the three traffic levels of the course (its own choice, not an AWS number): requests a second, all month.
export const LEVELS = [100, 1000, 5000];
export const costs = () => LEVELS.map((rps) => monthlyCost(rps));

// STEP 3: one change that halves the largest line (your turn).
// Return { line, change, overrides, savedDollars } for the traffic level `rps`:
//   line       the name of the largest line at that level (use largestLine)
//   change     one plain sentence: what you would do
//   overrides  the assumption you change, as an object for monthlyCost(rps, overrides) (see ASSUMPTIONS), so the change can be measured
//   savedDollars   the dollars a month saved, rounded to cents, measured with monthlyCost
export function halveTheLargest(rps) {
  // YOUR TURN start
  // HINT: the largest line at 5,000 requests a second is log ingestion. Log half as much per request: logKbPerRequest goes from 1 to 0.5.
  // YOUR TURN end
}

export async function run() {
  const all = costs();
  const pick = halveTheLargest(5000);
  const names = all[0].lines.map((l) => l.name);
  const at = (c, name) => c.lines.find((l) => l.name === name).dollars;
  return {
    facts: [
      ['Prices', `us-east-1, dollars, read ${PRICE_DATE}; every price is VERIFIED except the database size`],
      ['Traffic levels', `${LEVELS.join(', ')} requests a second all month (the course's choice)`],
      ['Largest line at 5,000 a second', `${largestLine(all[2]).name}: ${largestLine(all[2]).dollars.toFixed(2)} dollars`],
      ['One change that halves it', `${pick.change} Saves ${pick.savedDollars.toFixed(2)} dollars a month at 5,000 a second.`],
      ['Database (not in the totals)', `${all[0].unverified.name}: ${all[0].unverified.dollars.toFixed(2)} dollars a month, price UNVERIFIED (dossier P22)`],
      ['Traffic assumptions (not AWS numbers)', Object.entries(ASSUMPTIONS).map(([k, v]) => `${k} ${v}`).join('; ')],
    ],
    head: ['Line', ...LEVELS.map((r) => `${r} a second (dollars)`)],
    rows: [...names.map((n) => [n, ...all.map((c) => at(c, n).toFixed(2))]), ['Total (verified lines)', ...all.map((c) => c.total.toFixed(2))], ['Tasks running', ...all.map((c) => c.tasks)]],
    chart: { title: 'Monthly cost in dollars at three traffic levels', unit: 'dollars', format: (v) => v.toFixed(0), bars: all.map((c) => ({ label: `${c.rps} requests a second`, value: c.total })) },
  };
}

main(import.meta.url, run);
