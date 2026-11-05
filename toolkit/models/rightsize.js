// Right-sizing from a week of metrics. Mirrors the idea behind AWS Compute Optimizer (sizing from observed use).
// Compute Optimizer's own rules are not in the course notes; the 0.6 and 1.2 values are this exercise's defaults.
// Prices used by the tests are EC2 on-demand, us-east-1, read 2026-10-24 (price table read 2026-10-24).
export const HOURS_PER_MONTH = 730;

// Nearest-rank percentile: the value at position ceil(p * n) of the sorted list.
export function percentile(values, p) {
  if (!values.length) throw new Error('No values');
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1];
}

const round = (n, places) => Math.round(n * 10 ** places) / 10 ** places;

// samples: [{ cpuPct, memGb }], current: { vcpu, memGb, price }, catalog: [{ name, vcpu, memGb, price, burstable? }]
export function recommend(samples, current, catalog, opts = {}) {
  const { targetUtil = 0.6, memHeadroom = 1.2, allowBurstable = false } = opts;
  if (!samples.length) throw new Error('No samples');
  const usedVcpu = (percentile(samples.map((s) => s.cpuPct), 0.95) / 100) * current.vcpu;
  const needVcpu = usedVcpu / targetUtil;
  const needMem = Math.max(...samples.map((s) => s.memGb)) * memHeadroom;
  const fits = catalog
    .filter((c) => (allowBurstable || !c.burstable) && c.vcpu >= needVcpu - 1e-9 && c.memGb >= needMem - 1e-9)
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
  if (!fits.length) return { name: null, needVcpu, needMem };
  const fit = fits[0];
  return { name: fit.name, needVcpu: round(needVcpu, 2), needMem: round(needMem, 1), monthlySaving: round((current.price - fit.price) * HOURS_PER_MONTH, 2) };
}

// The six sizes of the exercise (price table, 2026-10-24). The vCPU and memory shapes are the platform's catalog shape,
// not read from AWS.
export const CATALOG = [
  { name: 't3.medium', vcpu: 2, memGb: 4, price: 0.0416, burstable: true },
  { name: 't4g.medium', vcpu: 2, memGb: 4, price: 0.0336, burstable: true },
  { name: 'c7g.large', vcpu: 2, memGb: 4, price: 0.0725 },
  { name: 'm7g.large', vcpu: 2, memGb: 8, price: 0.0816 },
  { name: 'm7i.large', vcpu: 2, memGb: 8, price: 0.1008 },
  { name: 'r7g.large', vcpu: 2, memGb: 16, price: 0.1071 },
];
