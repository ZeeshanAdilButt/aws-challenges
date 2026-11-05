// STEP 1: this part never calls AWS. A bad deploy is simulated with the model in toolkit/models/rollout.js.
import '../../../toolkit/guard-offline.js';
import { badDeploy, breakerThreshold } from '../../../toolkit/models/rollout.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 8, part 3: fail and roll back';

// STEP 2: the story. Image 1.4.3 has a bug: every new task fails its health check.
export const DESIRED = 6;
export const SECONDS_PER_BATCH = 60;
export const SECONDS_IN_30_DAYS = 30 * 24 * 3600;
// When the breaker is off and capacity stays low, the loss goes on until a person notices. The exercise assumes 30 minutes.
export const PERSON_NOTICES_AFTER = 1800;
export const badSeconds = (r) => (r.ongoing ? PERSON_NOTICES_AFTER : r.secondsBelowFull);

// STEP 3: how much of the monthly error budget a deploy spent (your turn).
// An availability target of 99.9 percent allows 0.1 percent of the 30 days to be bad: 2,592 seconds.
// secondsBelowFull is how long the service ran with fewer tasks than it should. Return the percent of the budget spent,
// rounded to one decimal place. 60 seconds is 2.3 percent.
export function budgetSpentPercent(secondsBelowFull, targetPercent = 99.9) {
  // YOUR TURN start
  // HINT: the allowance in seconds is (100 - targetPercent) / 100 * SECONDS_IN_30_DAYS.
  // YOUR TURN end
}

// STEP 4: run the same bad image under three settings, and one with the breaker off. Provided.
export const SCENARIOS = [
  { name: '100 and 200, breaker on', min: 100, max: 200, breaker: true },
  { name: '50 and 100, breaker on', min: 50, max: 100, breaker: true },
  { name: '50 and 100, breaker off', min: 50, max: 100, breaker: false },
  { name: '100 and 100, breaker off', min: 100, max: 100, breaker: false },
];

export function runScenario(s) {
  return badDeploy({ desired: DESIRED, minHealthyPercent: s.min, maxPercent: s.max, breaker: s.breaker, secondsPerBatch: SECONDS_PER_BATCH });
}

export async function run() {
  const results = SCENARIOS.map((s) => ({ s, r: runScenario(s) }));
  const first = results[1];
  return {
    facts: [
      ['Bad image', `every new task fails its health check; ${DESIRED} tasks wanted`],
      ['Breaker threshold', `${breakerThreshold(DESIRED)} failures in a row (half of ${DESIRED}, at least 3; dossier D22)`],
      ['Timeline for "50 and 100, breaker on"', first.r.events.map((e) => `${e.t}s: ${e.text} [${e.serving} serving]`).join(' | ')],
    ],
    head: ['Setting', 'End state', 'Failures', 'Lowest capacity', 'Seconds below full', 'Budget spent (99.9%)'],
    rows: results.map(({ s, r }) => [s.name, r.state, r.failures, `${r.minCapacityPercent}%`, badSeconds(r), `${budgetSpentPercent(badSeconds(r))}%${r.ongoing ? ' (a person notices after 30 minutes)' : ''}`]),
    chart: {
      title: 'Percent of the monthly error budget one bad deploy spends',
      unit: '%',
      format: (v) => v.toFixed(1),
      bars: results.map(({ s, r }) => ({ label: s.name, value: budgetSpentPercent(badSeconds(r)) })),
    },
  };
}

main(import.meta.url, run);
