// STEP 1: this part never calls AWS. It reads one bad night of metrics, logs and a change record.
import '../../../toolkit/guard-offline.js';
import { main } from '../../../toolkit/part.js';
import { loadNight } from '../shared.mjs';

export const title = 'Challenge 13, part 1: the bad night';

// STEP 2: find when the trouble started (your turn).
// minutes is a list of { time: 'HH:MM', p99Ms, ... }, one per minute. Return the time of the first minute that starts a run of
// at least `run` minutes in a row with p99Ms above `limitMs`. One bad minute alone is noise, not an incident.
// Return null when there is no such run.
export function incidentStart(minutes, limitMs, run = 3) {
  // YOUR TURN start
  // HINT: walk through the list and count how many minutes in a row are above the limit. When the count reaches `run`, the start is `run - 1` minutes back.
  // YOUR TURN end
}

// STEP 3: what changed just before (your turn). changes is a list of { time: 'HH:MM', what, detail }.
// Return the changes made in the `windowMinutes` minutes before `time` (and not after it), oldest first.
const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
export function changesBefore(changes, time, windowMinutes) {
  // YOUR TURN start
  // HINT: turn "01:10" into minutes since midnight to subtract.
  // YOUR TURN end
}

export const LIMIT_MS = 800;

export async function run() {
  const night = loadNight();
  const start = incidentStart(night.minutes, LIMIT_MS);
  const before = changesBefore(night.changes.changes, start, 10);
  const noise = night.minutes.filter((m) => m.p99Ms > LIMIT_MS && m.time !== start).length;
  return {
    facts: [
      ['Minutes in the night', `${night.minutes.length}, from ${night.minutes[0].time} to ${night.minutes.at(-1).time}`],
      ['Log lines kept', String(night.logs.length)],
      ['Incident starts', `${start} (p99 above ${LIMIT_MS} ms for 3 minutes in a row)`],
      ['Changes in the 10 minutes before', before.map((c) => `${c.time} ${c.what}: ${c.detail}`).join('; ') || 'none'],
      ['Minutes above the limit', `${night.minutes.filter((m) => m.p99Ms > LIMIT_MS).length}, and ${noise > 0 ? 'two single-minute spikes (00:41, 02:05) are noise' : 'none are noise'}`],
    ],
    head: ['Time', 'p99 (ms)', 'Requests', '5XX errors', 'Task CPU (%)', 'Logs (MB)'],
    rows: night.minutes.filter((m) => ['00:41', '01:04', '01:05', '01:09', '01:10', '01:20', '01:30', '01:44', '01:45', '02:05'].includes(m.time)).map((m) => [m.time, m.p99Ms, m.requests, m.errors5xx ?? 'missing', m.taskCpuPct, m.logMb]),
  };
}

main(import.meta.url, run);
