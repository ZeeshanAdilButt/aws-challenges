// Month-to-month bill diff, cost anomalies and tag coverage. Mirrors Cost Explorer grouped by service and usage type,
// Cost Anomaly Detection, and a tag coverage report. A bill is an array of { service, usageType, cost, tags? }.
// Left out on purpose: credits, refunds, tax, amortised commitments and forecasts.
// The unit prices behind the generated usage reports are in toolkit/prices.js (dossier P7, P9, P12, P14, P15).
const cents = (n) => Math.round(n * 100) / 100;
const keyOf = (line) => `${line.service}|${line.usageType}`;

function totals(bill) {
  const map = new Map();
  for (const line of bill) {
    const key = keyOf(line);
    const row = map.get(key) ?? { service: line.service, usageType: line.usageType, cost: 0 };
    row.cost += line.cost;
    map.set(key, row);
  }
  return map;
}

// One row per service and usage type found in either month, biggest increase first.
export function billDiff(prev, curr) {
  const a = totals(prev);
  const b = totals(curr);
  const rows = [...new Set([...a.keys(), ...b.keys()])].map((key) => {
    const before = cents(a.get(key)?.cost ?? 0);
    const after = cents(b.get(key)?.cost ?? 0);
    const source = a.get(key) ?? b.get(key);
    return {
      key,
      service: source.service,
      usageType: source.usageType,
      prev: before,
      curr: after,
      delta: cents(after - before),
      ratio: before === 0 ? null : Math.round((after / before) * 10000) / 10000,
    };
  });
  return rows.sort((x, y) => y.delta - x.delta || x.key.localeCompare(y.key));
}

// Keys of rows that grew by at least minDollars and are new or grew by at least minRatio times.
export function anomalies(rows, { minDollars = 50, minRatio = 2 } = {}) {
  return rows.filter((row) => row.delta >= minDollars && (row.ratio === null || row.ratio >= minRatio)).map((row) => row.key);
}

// How much of the bill carries every required tag. An empty tag value counts as missing.
export function tagCoverage(items, required) {
  const missing = {};
  let total = 0;
  let covered = 0;
  for (const item of items) {
    total += item.cost;
    const lacking = required.filter((tag) => !item.tags?.[tag]);
    if (!lacking.length) covered += item.cost;
    for (const tag of lacking) missing[tag] = cents((missing[tag] ?? 0) + item.cost);
  }
  return { total: cents(total), covered: cents(covered), percent: total === 0 ? 100 : Math.round((covered / total) * 10000) / 100, missing };
}
