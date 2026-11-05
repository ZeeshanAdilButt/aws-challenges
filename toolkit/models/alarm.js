// A CloudWatch-style metric alarm: M breaching datapoints out of the last N, with a treat-missing-data setting.
// The semantics are the exercise's own rules, based on the CloudWatch alarms and missing-data pages (dossier D13, D14).
// A standard alarm costs 0.10 dollars per alarm-metric-month (P7, VERIFIED, read 2026-10-24).

// points: numbers, or null for a missing datapoint. treat: 'missing' | 'notBreaching' | 'breaching' | 'ignore'.
// prev: the state before this evaluation (default 'OK').
export function evaluateAlarm({ points, threshold, m, n, treat = 'missing', prev = 'OK' }) {
  const recent = points.slice(-n);
  const window = [...Array(n - recent.length).fill(null), ...recent];
  const missingCount = window.filter((p) => p === null || p === undefined).length;
  const breaching = window.filter((p) => (p === null || p === undefined ? treat === 'breaching' : p > threshold)).length;
  if (treat === 'ignore' && missingCount > 0) return breaching >= m ? 'ALARM' : prev;
  if (treat === 'missing' && missingCount === n) return 'INSUFFICIENT_DATA';
  return breaching >= m ? 'ALARM' : 'OK';
}

// Run an alarm over a whole series, one evaluation per datapoint. Returns the state after each point.
export function replayAlarm({ series, threshold, m, n, treat = 'missing' }) {
  const states = [];
  let prev = 'OK';
  for (let i = 0; i < series.length; i++) {
    prev = evaluateAlarm({ points: series.slice(0, i + 1), threshold, m, n, treat, prev });
    states.push(prev);
  }
  return states;
}

// What an alarm did against a known incident [startIndex, endIndex): pages (runs of ALARM), false pages (runs outside it),
// and the delay in points from the first bad point to the first ALARM inside it (null: it never fired).
export function judgeAlarm(states, incident) {
  const [start, end] = incident;
  let pages = 0;
  let falsePages = 0;
  states.forEach((state, i) => {
    if (state === 'ALARM' && states[i - 1] !== 'ALARM') {
      pages += 1;
      if (i < start || i >= end) falsePages += 1;
    }
  });
  const first = states.findIndex((state, i) => i >= start && i < end && state === 'ALARM');
  return { pages, falsePages, delay: first < 0 ? null : first - start };
}
