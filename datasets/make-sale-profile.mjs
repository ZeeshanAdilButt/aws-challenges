// Generates datasets/sale-profile.json: the traffic of a Daftar Friday sale, one value per 10 seconds for 30 minutes.
// Seeded, so the file is the same on every run:  node datasets/make-sale-profile.mjs
// rps is requests a second. The sale starts at minute 8: traffic jumps ten times in 30 seconds, stays high, then falls.
// A second, smaller spike (800) comes at minute 24, so a server fleet that scaled in too fast is caught out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng } from '../toolkit/random.js';

export const SEED = 5;
export const STEP_SECONDS = 10;

export function generate() {
  const random = rng(SEED);
  const rps = [];
  for (let i = 0; i < 180; i++) {
    const minute = (i * STEP_SECONDS) / 60;
    let base = 100;
    if (minute >= 8 && minute < 8.5) base = 100 + ((minute - 8) / 0.5) * 900; // ramp to 1000 in 30 seconds
    else if (minute >= 8.5 && minute < 18) base = 1000;
    else if (minute >= 18 && minute < 21) base = 1000 - ((minute - 18) / 3) * 900; // slow fall
    else if (minute >= 24 && minute < 24.5) base = 100 + ((minute - 24) / 0.5) * 700; // a second, smaller spike
    else if (minute >= 24.5 && minute < 26) base = 800;
    rps.push(Math.round(base * (1 + (random.next() - 0.5) * 0.08)));
  }
  return { description: 'Requests a second for a Daftar sale, one value per 10 seconds, made up for the challenge.', stepSeconds: STEP_SECONDS, perServerRps: 50, rps };
}

const file = fileURLToPath(new URL('./sale-profile.json', import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(file, `${JSON.stringify(generate())}\n`);
  console.log(`wrote ${file}`);
}
