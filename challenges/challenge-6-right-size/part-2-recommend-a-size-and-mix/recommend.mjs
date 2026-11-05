// STEP 1: this part never calls AWS. It uses the course model and the price table.
import '../../../toolkit/guard-offline.js';
import { CATALOG, HOURS_PER_MONTH, recommend } from '../../../toolkit/models/rightsize.js';
import { main } from '../../../toolkit/part.js';
import { loadWeek, summarise } from '../part-1-read-the-metrics/summarise.mjs';

export const title = 'Challenge 6, part 2: recommend a size and a purchase mix';

// STEP 2: the discounts. AWS gives only the ceiling, never a typical figure (AWS Savings Plans and Spot pages):
// a Compute Savings Plan saves "up to" 66 percent and Spot "up to" 90 percent. The course does not invent a typical number,
// so every result with a discount says "best case". Real savings are lower.
export const CEILING = { commit: 0.66, spot: 0.9 };

// STEP 3: the purchase mix for one service (your turn).
// instancesPerHour is the list of how many servers ran in each hour of the week. Return, as servers-hours in a month (730 hours):
//   commit    the floor: the number of servers that ran in every hour, for all hours of the month (a commitment is for always-on use)
//   spot      the servers above the floor, ONLY when spotOk is true (retry-safe work such as the worker); otherwise 0
//   onDemand  the servers above the floor when spotOk is false
// The week is scaled to a month: extra server-hours in the week times 730 / 168.
export function purchaseMix(instancesPerHour, spotOk) {
  // YOUR TURN start
  // HINT: floor = the smallest number in the list. extraWeek = the sum of (count - floor).
  // HINT: monthly extra = extraWeek * HOURS_PER_MONTH / instancesPerHour.length. Round to whole hours.
  // YOUR TURN end
}

// STEP 4: a burstable size (t3, t4g) is cheap but earns CPU credits slowly and spends them when busy (your turn).
// Return true when the cheapest burstable choice would be unsafe for this service.
// The course rule: unsafe when the service has any hour above 60 percent CPU in the week. A p95 hides a short hot hour.
export function burstableUnsafe(summary) {
  // YOUR TURN start
  // YOUR TURN end
}

const money = (n) => Math.round(n * 100) / 100;

// Monthly cost of a mix at list price, and at the best case.
export function mixCost(mix, price) {
  const list = (mix.commit + mix.spot + mix.onDemand) * price;
  const best = mix.commit * price * (1 - CEILING.commit) + mix.spot * price * (1 - CEILING.spot) + mix.onDemand * price;
  return { list: money(list), best: money(best) };
}

export function analyse(week = loadWeek()) {
  return Object.entries(week.services).map(([name, hours]) => {
    const summary = summarise(hours);
    const samples = hours.map((h) => ({ cpuPct: h.cpuPct, memGb: h.memGb }));
    const rec = recommend(samples, week.current, CATALOG);
    const cheap = recommend(samples, week.current, CATALOG, { allowBurstable: true });
    const instances = hours.map((h) => h.instances);
    const mix = purchaseMix(instances, name === 'worker');
    const serverHours = mix.commit + mix.spot + mix.onDemand;
    const fit = CATALOG.find((c) => c.name === rec.name);
    const before = money(serverHours * week.current.pricePerHour);
    const after = mixCost(mix, fit.price);
    return {
      name,
      summary,
      rec,
      mix,
      before,
      resized: after.list,
      best: after.best,
      burstable: cheap.name !== rec.name ? { pick: cheap.name, unsafe: burstableUnsafe(summary) } : null,
    };
  });
}

export async function run() {
  const rows = analyse();
  const total = (key) => money(rows.reduce((sum, r) => sum + r[key], 0));
  const warn = rows.filter((r) => r.burstable?.unsafe);
  return {
    facts: [
      ['Current size', 'm7i.large for every service (0.1008 dollars an hour, price table read 2026-10-24)'],
      ['All three services, today', `${total('before').toFixed(2)} dollars a month`],
      ['On the recommended sizes, list price', `${total('resized').toFixed(2)} dollars a month (saves ${money(total('before') - total('resized')).toFixed(2)})`],
      ['On the recommended sizes and the purchase mix, best case', `${total('best').toFixed(2)} dollars a month (the discounts are AWS ceilings, not typical)`],
      ['Burstable warning', warn.length ? warn.map((r) => `${r.name}: ${r.burstable.pick} is cheaper but unsafe, ${r.summary.hoursAbove60} hours above 60 percent`).join('; ') : 'none'],
    ],
    head: ['Service', 'Recommended', 'Need (vCPU, GB)', 'Servers: commit, on-demand, spot (hours a month)', 'Today (dollars)', 'New size (dollars)', 'Best case (dollars)'],
    rows: rows.map((r) => [r.name, r.rec.name, `${r.rec.needVcpu}, ${r.rec.needMem}`, `${r.mix.commit}, ${r.mix.onDemand}, ${r.mix.spot}`, r.before.toFixed(2), r.resized.toFixed(2), r.best.toFixed(2)]),
    chart: {
      title: 'Monthly cost in dollars: today, recommended sizes, best case with the mix',
      unit: 'dollars',
      format: (v) => v.toFixed(0),
      bars: rows.flatMap((r) => [
        { label: `${r.name} today`, value: r.before },
        { label: `${r.name} new size`, value: r.resized },
        { label: `${r.name} best case`, value: r.best },
      ]),
    },
  };
}

main(import.meta.url, run);
