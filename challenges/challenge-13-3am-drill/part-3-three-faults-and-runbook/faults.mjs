// STEP 1: this part never calls AWS. It reads the night again and writes down what went wrong.
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { replayAlarm } from '../../../toolkit/models/alarm.js';
import { main } from '../../../toolkit/part.js';
import { INCIDENT, loadNight } from '../shared.mjs';

export const title = 'Challenge 13, part 3: three faults and the runbook';

const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;

// STEP 2: fault 1, the slow query (your turn). logs is a list of { time, level, msg }.
// Return the time of the first log line whose message mentions a query that took more than 1000 ms, or null.
// The messages look like "query notes_by_owner took 4180 ms".
export function firstSlowQuery(logs) {
  // YOUR TURN start
  // HINT: a regular expression such as /took (\d+) ms/ gives you the number.
  // YOUR TURN end
}

// STEP 3: fault 2, the log volume. Compare the average logMb before the deploy with the average between the deploy and the rollback. Provided.
export function logGrowth(minutes, deployTime, rollbackTime) {
  const at = minutes.findIndex((m) => m.time === deployTime);
  const end = minutes.findIndex((m) => m.time === rollbackTime);
  const before = mean(minutes.slice(0, at).map((m) => m.logMb));
  const after = mean(minutes.slice(at, end).map((m) => m.logMb));
  return { before: Math.round(before), after: Math.round(after), times: Math.round((after / before) * 10) / 10 };
}

// STEP 4: fault 3, the silent alarm (your turn).
// The 5XX alarm in the change record is 3 of 3 above 5 with missing data treated as notBreaching. For the minutes of the incident,
// count how many were NOT in ALARM with the alarm as written (alarm.treat), and how many with treat 'breaching'.
// Return { asWritten, withBreaching }.
export function silentMinutes(minutes, alarm) {
  // YOUR TURN start
  // HINT: series = minutes.map((m) => m.errors5xx) (it holds null when the metric is missing).
  // HINT: replayAlarm({ series, threshold, m, n, treat }) gives a state per minute; look only at indexes INCIDENT[0] to INCIDENT[1] - 1.
  // YOUR TURN end
}

// STEP 5: the runbook line (your turn). Three short parts: what the on-call person sees, what to check, what to do.
export const runbook = {
  // YOUR TURN start
  // YOUR TURN end
};

export const RUNBOOK_FILE = new URL('./runbook.md', import.meta.url);

export async function run() {
  const night = loadNight();
  const alarm = night.changes.alarms[0];
  const deploy = night.changes.changes.find((c) => c.what === 'deploy');
  const slow = firstSlowQuery(night.logs);
  const growth = logGrowth(night.minutes, deploy.time, night.changes.changes.find((c) => c.what === 'rollback').time);
  const silent = silentMinutes(night.minutes, alarm);
  fs.writeFileSync(RUNBOOK_FILE, `# Runbook: Daftar API slow or failing after a deploy\n\nCost: 0 dollars, runs on the emulator.\n\n- Symptom: ${runbook.symptom}\n- Check: ${runbook.check}\n- Fix: ${runbook.fix}\n`);
  return {
    facts: [
      ['Fault 1', `a slow query: ${slow.query} took ${slow.ms} ms at ${slow.time}, after the deploy at ${deploy.time}`],
      ['Fault 2', `log volume went from ${growth.before} MB to ${growth.after} MB a minute (${growth.times} times), from the deploy on: a debug line on every request`],
      ['Fault 3', `the 5XX alarm treats missing data as notBreaching: ${silent.asWritten} of the ${INCIDENT[1] - INCIDENT[0]} incident minutes were not in ALARM; with breaching, ${silent.withBreaching}`],
      ['Log cost of fault 2', `${Math.round((growth.after - growth.before) * 60 / 1024 * 100) / 100} GB more an hour, at 0.50 dollars a GB (dossier P7, VERIFIED) is about ${(((growth.after - growth.before) * 60) / 1024 * 0.5).toFixed(2)} dollars an hour`],
    ],
    head: ['Fault', 'Evidence', 'Fix'],
    rows: [
      ['slow query after the deploy', `${slow.query} ${slow.ms} ms from ${slow.time}`, 'roll back, then add the index'],
      ['debug log line', `${growth.times} times the log volume`, 'remove the line or set the level to INFO'],
      ['silent alarm', `${silent.asWritten} incident minutes not in ALARM`, "treat missing data as breaching"],
    ],
    chart: {
      title: 'Incident minutes without an ALARM state (of 35)',
      unit: 'minutes',
      bars: [{ label: 'as written (notBreaching)', value: silent.asWritten }, { label: 'treat missing as breaching', value: silent.withBreaching }],
    },
  };
}

main(import.meta.url, run);
