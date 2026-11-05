// S3 monthly cost by storage class, with request charges, and a lifecycle rule that moves objects by age.
// Prices: us-east-1, dollars, read 2026-10-24, dossier source P11 (VERIFIED):
//   storage per GB-month: Standard 0.023 (first 50 TB), Standard-IA 0.0125, Glacier Instant Retrieval 0.004
//   PUT/COPY/POST/LIST 0.005 per 1,000; GET 0.0004 per 1,000 (Standard), 0.01 per 10,000 (IA), 0.1 per 10,000 (Glacier IR)
//   Glacier IR retrieval 0.03 per GB
// Not sourced: the price of a lifecycle transition request by class, so the exercise bills a transition like one PUT.
// The exercise has no Standard-IA retrieval fee (flagged: the real class has one).
export const S3_PRICES = {
  storagePerGb: { standard: 0.023, ia: 0.0125, glacierIr: 0.004 },
  putPer1000: 0.005,
  getPer1000: { standard: 0.0004, ia: 0.001, glacierIr: 0.01 },
  retrievalPerGb: { glacierIr: 0.03 },
};
const cents = (n) => Math.round(n * 100) / 100;

// plan = { gb: {standard, ia, glacierIr}, puts, transitions, gets: {standard, ia, glacierIr}, retrieveGb: {glacierIr} }
export function monthlyCost(plan = {}) {
  const gb = plan.gb ?? {};
  const gets = plan.gets ?? {};
  const storage = Object.entries(S3_PRICES.storagePerGb).reduce((sum, [cls, price]) => sum + (gb[cls] ?? 0) * price, 0);
  const putLike = (((plan.puts ?? 0) + (plan.transitions ?? 0)) / 1000) * S3_PRICES.putPer1000;
  const getCost = Object.entries(S3_PRICES.getPer1000).reduce((sum, [cls, price]) => sum + ((gets[cls] ?? 0) / 1000) * price, 0);
  const retrieval = (plan.retrieveGb?.glacierIr ?? 0) * S3_PRICES.retrievalPerGb.glacierIr;
  const out = { storage: cents(storage), requests: cents(putLike + getCost), retrieval: cents(retrieval) };
  return { ...out, total: cents(out.storage + out.requests + out.retrieval) };
}

// Which class an object is in after ageDays, given rules [{ afterDays, class }] (any order). The latest rule that has started wins.
export function classForAge(ageDays, rules) {
  let cls = 'standard';
  let from = -1;
  for (const rule of rules) {
    if (ageDays >= rule.afterDays && rule.afterDays > from) {
      cls = rule.class;
      from = rule.afterDays;
    }
  }
  return cls;
}
