// Shared by the three parts of challenge 13: the bad night and what is known about it.
import fs from 'node:fs';
import { GAP, INCIDENT } from '../../datasets/make-bad-night.mjs';

const read = (name) => fs.readFileSync(new URL(`../../datasets/${name}`, import.meta.url), 'utf8');

export function loadNight() {
  const night = JSON.parse(read('bad-night.json'));
  const logs = read('bad-night-logs.jsonl').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const changes = JSON.parse(read('bad-night-changes.json'));
  return { start: night.start, minutes: night.minutes, logs, changes };
}

// Where the incident really is, from the generator. The tests of part 2 and part 3 use it as the answer key.
export { GAP, INCIDENT };
export const timeOf = (night, index) => night.minutes[index].time;
