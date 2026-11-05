// ECS rolling deployment planner. Mirrors the ECS service settings minimumHealthyPercent and maximumPercent.
// AWS's rounding rules are not in the course notes. The exercise states its own: the minimum is rounded up, the maximum is rounded down.
// Circuit breaker (dossier D22, VERIFIED): the default threshold is 50 percent of the desired count rounded up,
// clamped between 3 and 200 (25 tasks gives 13, 1 task gives 3, 400 gives 200); only consecutive failures count
// (resetOnHealthyTask is true by default); a tripped breaker rolls back to the last COMPLETED deployment.

// Rounds of "start some new tasks, then stop some old ones" until all tasks are new.
export function plan({ desired, minHealthyPercent, maxPercent }) {
  const minH = Math.ceil((desired * minHealthyPercent) / 100);
  const maxT = Math.floor((desired * maxPercent) / 100);
  let old = desired;
  let nw = 0;
  const rounds = [];
  while (!(nw === desired && old === 0)) {
    const start = Math.min(desired - nw, Math.max(0, maxT - (old + nw)));
    const afterStart = nw + start;
    const stop = Math.min(old, Math.max(0, old + afterStart - minH));
    if (start === 0 && stop === 0) return { rounds, done: false, stuck: true, minH, maxT };
    nw = afterStart;
    old -= stop;
    rounds.push({ start, stop });
  }
  return { rounds, done: true, minH, maxT };
}

// The circuit breaker threshold for a desired count.
export const breakerThreshold = (desired) => Math.min(200, Math.max(3, Math.ceil(desired * 0.5)));

// A rollout where the first `failingStarts` new tasks fail their health check (Infinity: every new task fails).
// Old tasks are only replaced by tasks that came up healthy, except when the maximum leaves no room to start:
// then old tasks stop first, down to the minimum healthy count. Each batch takes `secondsPerBatch` seconds.
// Returns { state: 'COMPLETED' | 'ROLLED_BACK' | 'STUCK', ongoing (stuck with less than full capacity, so the loss never ends), events, failures, threshold, minCapacityPercent, secondsBelowFull }.
// secondsBelowFull is the time the service served fewer tasks than desired: the "error budget" this deploy spent.
export function badDeploy({ desired, minHealthyPercent, maxPercent, failingStarts = Infinity, secondsPerBatch = 60, threshold = breakerThreshold(desired), breaker = true }) {
  const minH = Math.ceil((desired * minHealthyPercent) / 100);
  const maxT = Math.floor((desired * maxPercent) / 100);
  let old = desired;
  let good = 0;
  let bad = 0;
  let failures = 0;
  let started = 0;
  let t = 0;
  let minCap = desired;
  let below = 0;
  const events = [];
  const log = (text) => events.push({ t, text, serving: old + good });
  const result = (state) => ({ state, ongoing: state === 'STUCK' && old + good < desired, events, failures, threshold, minCapacityPercent: Math.round((minCap / desired) * 100), secondsBelowFull: below });
  log(`start: ${desired} old tasks serving`);
  for (let batch = 0; batch < 40; batch++) {
    let slots = maxT - (old + good + bad);
    if (slots <= 0) {
      const stop = Math.min(old, Math.max(0, old + good - minH));
      if (stop > 0) {
        old -= stop;
        minCap = Math.min(minCap, old + good);
        log(`stop ${stop} old tasks to make room`);
        slots = maxT - (old + good + bad);
      }
    }
    const start = Math.min(slots, desired - good);
    if (start <= 0) {
      log('no room to start new tasks: the rollout is stuck');
      return result('STUCK');
    }
    for (let i = 0; i < start; i++) {
      started += 1;
      if (started <= failingStarts) {
        bad += 1;
        failures += 1;
        log(`new task ${started} fails its health check (${failures} in a row)`);
        if (breaker && failures >= threshold) {
          const restored = desired - old;
          if (old + good < desired) below += secondsPerBatch;
          t += secondsPerBatch;
          old = desired;
          good = 0;
          bad = 0;
          log(`circuit breaker trips at ${threshold} failures: roll back, ${restored} old tasks restarted`);
          return result('ROLLED_BACK');
        }
      } else {
        good += 1;
        failures = 0;
        log(`new task ${started} is healthy`);
      }
    }
    old = Math.max(desired - good, 0);
    minCap = Math.min(minCap, old + good);
    if (old + good < desired) below += secondsPerBatch;
    t += secondsPerBatch;
    if (good === desired) {
      log('all tasks are new and healthy: COMPLETED');
      return result('COMPLETED');
    }
  }
  return result('STUCK');
}
