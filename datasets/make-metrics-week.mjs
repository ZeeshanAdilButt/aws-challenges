// Generates datasets/metrics-week.json: one week of hourly CPU, memory and instance counts for three Daftar services.
// Seeded, so the file is the same on every run:  node datasets/make-metrics-week.mjs
// Each hour: { cpuPct, memGb, instances }. cpuPct and memGb are the average over the instances running that hour.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng } from '../toolkit/random.js';

export const SEED = 11;
export const START = '2026-10-12T00:00:00Z'; // a Monday
const round1 = (n) => Math.round(n * 10) / 10;

// Every service runs on an m7i.large today (2 vCPU, 8 GB, 0.1008 dollars an hour, dossier P13).
const CURRENT = { type: 'm7i.large', vcpu: 2, memGb: 8, pricePerHour: 0.1008 };

export function generate() {
  const random = rng(SEED);
  const hours = 24 * 7;
  const services = {
    // The API follows the working day: busy from 08:00 to 20:00, quiet at night. Three servers by day, two at night.
    api: Array.from({ length: hours }, (_, h) => {
      const hod = h % 24;
      const day = hod >= 8 && hod < 20;
      const peak = hod >= 12 && hod < 15;
      const cpu = (day ? 24 : 9) + (peak ? 9 : 0) + random.int(-3, 3);
      return { cpuPct: round1(cpu), memGb: round1(3.6 + (day ? 0.8 : 0) + random.next() * 0.4), instances: day ? 3 : 2 };
    }),
    // The worker is quiet, then runs the nightly export from 01:00 to 04:00 (50 percent for three hours) with one
    // short hot hour at 02:00 (85 percent). Extra servers (up to three) start only for the export.
    worker: Array.from({ length: hours }, (_, h) => {
      const hod = h % 24;
      const job = hod >= 1 && hod < 4;
      const hot = hod === 2;
      const cpu = hot ? 85 + random.int(-2, 2) : job ? 50 + random.int(-3, 3) : 7 + random.int(-2, 2);
      return { cpuPct: round1(cpu), memGb: round1(job ? 2.9 + random.next() * 0.3 : 1.9 + random.next() * 0.3), instances: job ? 3 : 1 };
    }),
    // The admin tool is used by a few people: almost idle.
    admin: Array.from({ length: hours }, (_, h) => {
      const hod = h % 24;
      return { cpuPct: round1((hod >= 9 && hod < 18 ? 5 : 2) + random.next() * 2), memGb: round1(1.2 + random.next() * 0.2), instances: 1 };
    }),
  };
  return { description: 'One week of hourly metrics for the Daftar services, made up for the challenge.', start: START, hours, current: CURRENT, services };
}

const file = fileURLToPath(new URL('./metrics-week.json', import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(file, `${JSON.stringify(generate())}\n`);
  console.log(`wrote ${file}`);
}
