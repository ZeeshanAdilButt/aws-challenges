// STEP 1: this part never calls AWS. It replays the sale many times with different settings.
import '../../../toolkit/guard-offline.js';
import { main } from '../../../toolkit/part.js';
import { SALE_SCHEDULE, dollars, dropPercent, replay } from '../shared.mjs';

export const title = 'Challenge 7, part 2: warm-up and cooldown';

// STEP 2: how long a server needs before it answers requests changes everything. Cooldown 300 seconds, no schedule.
export const WARMUPS = [30, 60, 120, 240];
export function warmupTable() {
  return WARMUPS.map((warmupSeconds) => {
    const r = replay({ warmupSeconds, cooldownSeconds: 300 });
    return { warmupSeconds, dropped: r.dropped, dropPercent: dropPercent(r), serverHours: r.serverHours, dollars: dollars(r.serverHours) };
  });
}

// STEP 3: the levers you control when the warm-up is 120 seconds: the cooldown, and a scheduled minimum before the sale.
export const COOLDOWNS = [0, 60, 300];
export function leverTable() {
  const rows = [];
  for (const scheduled of [false, true]) {
    for (const cooldownSeconds of COOLDOWNS) {
      const r = replay({ warmupSeconds: 120, cooldownSeconds, scheduled: scheduled ? SALE_SCHEDULE : [] });
      rows.push({ scheduled, cooldownSeconds, dropped: r.dropped, dropPercent: dropPercent(r), serverHours: r.serverHours, dollars: dollars(r.serverHours) });
    }
  }
  return rows;
}

// STEP 4: pick the cheapest setting that keeps dropped requests under a line (your turn).
// rows are the lever rows above. maxDropPercent is the line, for example 2 (percent of the requests offered).
// Return the cheapest row (by dollars) with dropPercent at or below the line, or null when none qualifies.
export function cheapestUnder(rows, maxDropPercent) {
  // YOUR TURN start
  // HINT: filter first, then pick the smallest dollars. If two cost the same, keep the one with fewer drops.
  // YOUR TURN end
}

export const LINE = 2;

export async function run() {
  const warm = warmupTable();
  const levers = leverTable();
  const pick = cheapestUnder(levers, LINE);
  return {
    facts: [
      ['Server', 'm7g.large, 0.0816 dollars an hour (dossier P13); cost is for the 30 minutes of the profile'],
      ['The line', `no more than ${LINE} percent of requests dropped`],
      ['Cheapest setting under the line', pick ? `warm-up 120 s, cooldown ${pick.cooldownSeconds} s, ${pick.scheduled ? 'with' : 'without'} a scheduled minimum: ${pick.dropPercent} percent dropped, ${pick.dollars.toFixed(2)} dollars` : 'none'],
      ['With no schedule, the best the levers can do', `${Math.min(...levers.filter((l) => !l.scheduled).map((l) => l.dropPercent))} percent dropped`],
    ],
    head: ['Warm-up (s)', 'Requests dropped', 'Percent dropped', 'Server-hours', 'Cost (dollars)'],
    rows: warm.map((w) => [w.warmupSeconds, w.dropped, w.dropPercent, w.serverHours, w.dollars.toFixed(2)]),
    extra: {
      head: ['Scheduled minimum', 'Cooldown (s)', 'Requests dropped', 'Percent dropped', 'Server-hours', 'Cost (dollars)'],
      rows: levers.map((l) => [l.scheduled ? 'yes' : 'no', l.cooldownSeconds, l.dropped, l.dropPercent, l.serverHours, l.dollars.toFixed(2)]),
    },
  };
}

main(import.meta.url, run);
