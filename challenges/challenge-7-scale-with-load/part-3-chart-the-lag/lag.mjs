// STEP 1: this part never calls AWS. It measures how late the fleet is and draws it.
import '../../../toolkit/guard-offline.js';
import { main } from '../../../toolkit/part.js';
import { SALE_SCHEDULE, loadProfile, replay } from '../shared.mjs';
import { perMinute } from '../part-1-replay-the-profile/replay.mjs';

export const title = 'Challenge 7, part 3: chart the lag';

// STEP 2: the lag (your turn). timeline rows are { t, offered, wanted, running, pending, dropped }.
// Return { startSecond, endSecond, seconds } where startSecond is the time of the first row with dropped requests,
// endSecond is the time when the last such row ends (its t plus stepSeconds), and seconds is the difference.
// With no drops at all, return { startSecond: null, endSecond: null, seconds: 0 }.
export function lag(timeline, stepSeconds) {
  // YOUR TURN start
  // HINT: find the first and the last row with dropped > 0 (rows.findIndex, rows.findLastIndex or a loop).
  // YOUR TURN end
}

// STEP 3: how many servers were wanted but not yet running at the worst moment.
export const worstShortfall = (timeline) => Math.max(...timeline.map((row) => row.wanted - row.running));

export async function run() {
  const { stepSeconds } = loadProfile();
  const plain = replay({ warmupSeconds: 120, cooldownSeconds: 300 });
  const planned = replay({ warmupSeconds: 120, cooldownSeconds: 60, scheduled: SALE_SCHEDULE });
  const lagPlain = lag(plain.timeline, stepSeconds);
  const lagPlanned = lag(planned.timeline, stepSeconds);
  const minutes = perMinute(plain.timeline).filter((m) => m.minute >= 8 && m.minute <= 12);
  return {
    facts: [
      ['Without a schedule', `late for ${lagPlain.seconds} seconds (from second ${lagPlain.startSecond} to ${lagPlain.endSecond}), ${plain.dropped} requests dropped`],
      ['Worst gap between servers wanted and running', `${worstShortfall(plain.timeline)} servers`],
      ['With a scheduled minimum', `late for ${lagPlanned.seconds} seconds, ${planned.dropped} requests dropped`],
    ],
    head: ['Minute', 'Requests a second', 'Servers wanted', 'Servers running', 'Requests dropped'],
    rows: minutes.map((m) => [m.minute, m.offeredAvg, m.wanted, m.running, m.dropped]),
    chart: {
      title: 'Servers wanted and servers running, minute by minute (no schedule)',
      unit: 'servers',
      bars: minutes.flatMap((m) => [{ label: `minute ${m.minute} wanted`, value: m.wanted }, { label: `minute ${m.minute} running`, value: m.running }]),
    },
  };
}

main(import.meta.url, run);
