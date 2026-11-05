// STEP 1: this part never calls AWS. It uses the rolling deployment planner from toolkit/models/rollout.js.
import '../../../toolkit/guard-offline.js';
import { plan } from '../../../toolkit/models/rollout.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 8, part 2: plan the rollout';

export const DESIRED = 6; // the Daftar API runs 6 tasks
// Two percentages decide everything: minimumHealthyPercent and maximumPercent.
export const OPTIONS = [
  { min: 100, max: 200 },
  { min: 100, max: 150 },
  { min: 100, max: 100 },
  { min: 50, max: 100 },
  { min: 50, max: 150 },
  { min: 0, max: 100 },
];

// STEP 2: what one option does to the service. Provided.
// A round starts new tasks, waits until they are healthy, and only then stops old ones. So after a round,
// lowestServing is the fewest tasks that answer requests: the old tasks left plus all new tasks so far.
export function describeOption({ min, max }, desired = DESIRED) {
  const p = plan({ desired, minHealthyPercent: min, maxPercent: max });
  let old = desired;
  let nw = 0;
  let lowestServing = desired;
  let mostRunning = desired;
  for (const round of p.rounds) {
    nw += round.start;
    mostRunning = Math.max(mostRunning, old + nw);
    old -= round.stop;
    lowestServing = Math.min(lowestServing, old + nw);
  }
  return { min, max, rounds: p.rounds.length, stuck: Boolean(p.stuck), minH: p.minH, maxT: p.maxT, lowestServing: p.stuck ? desired : lowestServing, mostRunning };
}

// STEP 3: choose (your turn). Keep only the options that are not stuck and never serve fewer than `mustServe` tasks.
// Among them take the one with the fewest rounds; if two tie, take the one that runs the fewest extra tasks at once (mostRunning).
// Return the chosen option as described by describeOption, or null if none is safe.
export function choose(options, mustServe) {
  // YOUR TURN start
  // HINT: filter with !o.stuck && o.lowestServing >= mustServe, then sort by rounds and then by mostRunning.
  // YOUR TURN end
}

export const MUST_SERVE = 6; // Daftar wants every one of the 6 tasks to keep answering during a deploy

export async function run() {
  const described = OPTIONS.map((o) => describeOption(o));
  const pick = choose(described, MUST_SERVE);
  const roundText = (o) => (o.stuck ? 'stuck: nothing can move' : plan({ desired: DESIRED, minHealthyPercent: o.min, maxPercent: o.max }).rounds.map((r) => `+${r.start}/-${r.stop}`).join(' '));
  return {
    facts: [
      ['Tasks', `${DESIRED}, and all ${MUST_SERVE} must keep answering during a deploy`],
      ['Rounding', 'the minimum is rounded up and the maximum is rounded down (the exercise\'s own rule)'],
      ['Chosen', pick ? `${pick.min} and ${pick.max}: ${pick.rounds} round, at most ${pick.mostRunning} tasks running` : 'none is safe'],
    ],
    head: ['Min healthy %', 'Max %', 'Rounds (+start/-stop)', 'Lowest tasks serving', 'Most tasks running', 'Keeps all 6?'],
    rows: described.map((o) => [o.min, o.max, roundText(o), o.lowestServing, o.mostRunning, !o.stuck && o.lowestServing >= MUST_SERVE ? 'yes' : 'no']),
  };
}

main(import.meta.url, run);
