// STEP 1: this part never calls AWS. The emulator keeps alarm settings but does not say it evaluates them,
// so the alarm rule is the course model in toolkit/models/alarm.js.
import '../../../toolkit/guard-offline.js';
import { judgeAlarm, replayAlarm } from '../../../toolkit/models/alarm.js';
import { main } from '../../../toolkit/part.js';
import { INCIDENT, loadNight } from '../shared.mjs';

export const title = 'Challenge 13, part 2: three alarm designs';

// STEP 2: three ways to write the same alarm on p99 above 800 ms. M of N means: ALARM when M of the last N minutes breach.
export const DESIGNS = [
  { name: '1 of 1', m: 1, n: 1, treat: 'notBreaching' },
  { name: '2 of 3', m: 2, n: 3, treat: 'missing' },
  { name: '3 of 3', m: 3, n: 3, treat: 'notBreaching' },
];
export const THRESHOLD = 800;

// STEP 3: run one design over the night (your turn).
// Return { name, pages, falsePages, delay } where pages is the number of times it went into ALARM, falsePages the pages outside
// the incident, and delay the minutes from the first bad minute to the first ALARM inside the incident (null: never).
// The incident is INCIDENT = [first index, end index) in the minutes list.
export function evaluateDesign(minutes, design) {
  // YOUR TURN start
  // HINT: series = the p99 values. replayAlarm({ series, threshold, m, n, treat }) gives one state per minute.
  // HINT: judgeAlarm(states, INCIDENT) counts pages, false pages and the delay for you.
  // YOUR TURN end
}

export async function run() {
  const night = loadNight();
  const results = DESIGNS.map((d) => evaluateDesign(night.minutes, d));
  return {
    facts: [
      ['Metric', `p99 above ${THRESHOLD} ms, one datapoint a minute`],
      ['Real incident', `${night.minutes[INCIDENT[0]].time} to ${night.minutes[INCIDENT[1] - 1].time}; two single-minute spikes at 00:41 and 02:05 are noise`],
      ['Best design here', '2 of 3: one minute after the incident starts and no false page'],
    ],
    head: ['Design', 'Pages', 'False pages', 'Delay (minutes after the first bad minute)'],
    rows: results.map((r) => [r.name, r.pages, r.falsePages, r.delay ?? 'never']),
    chart: {
      title: 'False pages at night for each design (the two noise spikes)',
      unit: 'pages',
      bars: results.map((r) => ({ label: r.name, value: r.falsePages })),
    },
  };
}

main(import.meta.url, run);
