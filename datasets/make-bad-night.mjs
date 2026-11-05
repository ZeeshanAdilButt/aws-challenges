// Generates datasets/bad-night.json, bad-night-logs.jsonl and bad-night-changes.json: one bad night of Daftar, per minute.
// Seeded, so the files are the same on every run:  node datasets/make-bad-night.mjs
// The night runs from 00:30 to 02:29 (120 minutes). What was injected, so the tests can check the answers:
//   01:05 a deploy (daftar-api v142) adds a debug log line, so log volume triples from then on
//   01:10 a slow query (notes_by_owner) appears and p99 rises from about 180 ms to about 2,600 ms until 01:44
//   01:20 to 01:29 the error counter is not published at all (the tasks restart), so 5XX is missing
//   01:45 the deploy is rolled back
//   two single-minute noise spikes of p99 at 00:41 and 02:05, which are not incidents
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng } from '../toolkit/random.js';

export const SEED = 13;
export const START_MINUTE = 30; // minutes after midnight
export const MINUTES = 120;
export const INCIDENT = [40, 75]; // index of 01:10 and 01:45
export const GAP = [50, 60]; // index of 01:20 to 01:29
export const hhmm = (index) => {
  const total = START_MINUTE + index;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export function generate() {
  const random = rng(SEED);
  const minutes = [];
  const logs = [];
  for (let i = 0; i < MINUTES; i++) {
    const inIncident = i >= INCIDENT[0] && i < INCIDENT[1];
    const afterDeploy = i >= 35 && i < INCIDENT[1];
    const noise = i === 11 || i === 95;
    let p99 = 170 + random.int(0, 40);
    if (inIncident) p99 = 2400 + random.int(0, 400);
    if (noise) p99 = 1500 + random.int(0, 200);
    const requests = 3000 + random.int(-150, 150);
    let errors = random.int(0, 2);
    if (inIncident) errors = 40 + random.int(0, 25);
    const missing = i >= GAP[0] && i < GAP[1];
    const cpu = inIncident ? 85 + random.int(-4, 5) : 30 + random.int(-5, 8);
    const logMb = (afterDeploy ? 310 : 100) + random.int(-8, 8);
    minutes.push({ time: hhmm(i), p99Ms: p99, requests, errors5xx: missing ? null : errors, taskCpuPct: cpu, logMb });
    if (i === 35) logs.push({ time: hhmm(i), level: 'DEBUG', msg: 'cache lookup key=notes:owner:* hit=false', note: 'first seen right after the deploy, then on every request' });
    if (inIncident && i % 6 === 0) logs.push({ time: hhmm(i), level: 'WARN', msg: 'query notes_by_owner took 4180 ms', rows: 214000 });
    if (inIncident && i % 9 === 1) logs.push({ time: hhmm(i), level: 'ERROR', msg: 'upstream timeout after 5000 ms', path: '/api/notes' });
    if (missing && i === GAP[0]) logs.push({ time: hhmm(i), level: 'ERROR', msg: 'task exited: out of memory, restarting', task: 'daftar-api' });
  }
  const changes = {
    changes: [
      { time: '01:05', what: 'deploy', detail: 'daftar-api v142 (adds notes_by_owner listing, adds a debug log line)' },
      { time: '01:45', what: 'rollback', detail: 'daftar-api back to v141' },
    ],
    alarms: [{ name: 'api-5xx', metric: 'errors5xx', threshold: 5, m: 3, n: 3, treat: 'notBreaching' }],
  };
  return { minutes, logs, changes };
}

const dir = path.dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { minutes, logs, changes } = generate();
  fs.writeFileSync(path.join(dir, 'bad-night.json'), `${JSON.stringify({ description: 'Per-minute metrics of one bad night, made up for the challenge.', start: hhmm(0), minutes })}\n`);
  fs.writeFileSync(path.join(dir, 'bad-night-logs.jsonl'), `${logs.map((l) => JSON.stringify(l)).join('\n')}\n`);
  fs.writeFileSync(path.join(dir, 'bad-night-changes.json'), `${JSON.stringify(changes, null, 2)}\n`);
  console.log(`wrote bad-night.json, bad-night-logs.jsonl, bad-night-changes.json`);
}
