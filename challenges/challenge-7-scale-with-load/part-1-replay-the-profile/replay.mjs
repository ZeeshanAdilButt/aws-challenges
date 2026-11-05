// STEP 1: this part never calls AWS. It replays a traffic file through the target tracking model.
import '../../../toolkit/guard-offline.js';
import { main } from '../../../toolkit/part.js';
import { dropPercent, loadProfile, replay } from '../shared.mjs';

export const title = 'Challenge 7, part 1: replay the profile';

// STEP 2: group the 10-second steps into minutes (your turn).
// timeline is a list of { t, offered, wanted, running, pending, dropped } (t in seconds, one row per 10 seconds).
// Return one row per minute: { minute, offeredAvg, wanted, running, dropped }
//   offeredAvg  the average requests a second in that minute, rounded
//   wanted      the largest "wanted" in that minute
//   running     the "running" at the last step of that minute
//   dropped     the requests dropped in that minute (sum)
export function perMinute(timeline) {
  // YOUR TURN start
  // HINT: the minute of a row is Math.floor(row.t / 60). Build a Map from minute to the rows in it.
  // YOUR TURN end
}

// STEP 3: replay the sale. Servers take 120 seconds to start and the cooldown is 300 seconds: plain target tracking.
export const SETTINGS = { warmupSeconds: 120, cooldownSeconds: 300 };

export async function run() {
  const profile = loadProfile();
  const result = replay(SETTINGS);
  const minutes = perMinute(result.timeline);
  const worst = minutes.reduce((a, b) => (b.dropped > a.dropped ? b : a));
  return {
    facts: [
      ['Profile', `${profile.rps.length} values, one every ${profile.stepSeconds} seconds, one server answers ${profile.perServerRps} requests a second`],
      ['Settings', `target 50 percent, 4 to 50 servers, warm-up ${SETTINGS.warmupSeconds} s, cooldown ${SETTINGS.cooldownSeconds} s`],
      ['Requests offered', String(result.offeredTotal)],
      ['Requests dropped', `${result.dropped} (${dropPercent(result)} percent)`],
      ['Most servers running', String(result.peakRunning)],
      ['Worst minute', `minute ${worst.minute}: ${worst.dropped} dropped`],
    ],
    head: ['Minute', 'Requests a second', 'Servers wanted', 'Servers running', 'Requests dropped'],
    rows: minutes.filter((m) => m.dropped > 0).map((m) => [m.minute, m.offeredAvg, m.wanted, m.running, m.dropped]),
  };
}

main(import.meta.url, run);
