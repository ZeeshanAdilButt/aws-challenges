// STEP 1: this part never calls AWS. It reads a file of metrics and prints a table.
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 6, part 1: read the metrics';

export const METRICS_FILE = new URL('../../../datasets/metrics-week.json', import.meta.url);

// STEP 2: read the week. services.<name> is a list of 168 hours: { cpuPct, memGb, instances }.
export function loadWeek(file = METRICS_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// STEP 3: the percentile (your turn). The p-th percentile (p between 0 and 1) by the nearest-rank rule:
// sort the values from small to large and take the value at position ceil(p * n) (counting from 1).
// p50 of [1..10] is 5. p95 of [1..10] is 10. p95 of 168 hours is the 160th smallest.
export function percentileOf(values, p) {
  // YOUR TURN start
  // HINT: copy the array before you sort it (sort changes the array it is called on), and sort numbers with (a, b) => a - b.
  // HINT: the position counted from 0 is Math.ceil(p * values.length) - 1.
  // YOUR TURN end
}

// STEP 4: one service in numbers: median, p95, the highest hour, and how many hours were above 60 percent CPU.
export function summarise(hours) {
  const cpu = hours.map((h) => h.cpuPct);
  return {
    p50: percentileOf(cpu, 0.5),
    p95: percentileOf(cpu, 0.95),
    peak: Math.max(...cpu),
    hoursAbove60: cpu.filter((v) => v > 60).length,
    maxMemGb: Math.max(...hours.map((h) => h.memGb)),
  };
}

export async function run() {
  const week = loadWeek();
  const rows = Object.entries(week.services).map(([name, hours]) => {
    const s = summarise(hours);
    return [name, s.p50, s.p95, s.peak, s.hoursAbove60, s.maxMemGb];
  });
  return {
    facts: [
      ['Hours per service', String(week.hours)],
      ['Server today', `${week.current.type}, ${week.current.vcpu} vCPU, ${week.current.memGb} GB, ${week.current.pricePerHour} dollars an hour`],
    ],
    head: ['Service', 'CPU p50 (%)', 'CPU p95 (%)', 'CPU peak (%)', 'Hours above 60%', 'Memory peak (GB)'],
    rows,
    chart: { title: 'CPU p95 per service (percent of one server)', unit: '%', bars: rows.map((r) => ({ label: r[0], value: r[2] })) },
  };
}

main(import.meta.url, run);
