// Target tracking and health checks, as the course model. Mirrors Auto Scaling target tracking and ALB health checks.
// AWS's exact algorithm is not in the course notes, so the rules below are the exercise's own (stated, not claimed).
// Health check defaults (healthy 5, unhealthy 2) are the course's C83 defaults. Scale-in cool behaviour of AWS is ignored here.
// Server price in the cost line: m7g.large 0.0816 dollars an hour, us-east-1, read 2026-10-24 (dossier P13).

// How many servers a metric asks for: ceil(current * metric / target), kept between min and max.
export function desiredCapacity({ current, metric, target, min, max }) {
  const wanted = Math.ceil((current * metric) / target - 1e-9);
  return Math.min(max, Math.max(min, wanted));
}

// One health check result. state = { status: 'initial' | 'healthy' | 'unhealthy', run }.
export function healthStep(state, ok, cfg = { healthy: 5, unhealthy: 2 }) {
  if (state.status === 'healthy') {
    if (ok) return { status: 'healthy', run: 0 };
    const run = state.run + 1;
    return run >= cfg.unhealthy ? { status: 'unhealthy', run: 0 } : { status: 'healthy', run };
  }
  if (!ok) return { status: state.status, run: 0 };
  const run = state.run + 1;
  return run >= cfg.healthy ? { status: 'healthy', run: 0 } : { status: state.status, run };
}

// Replay a traffic profile (requests a second, one value per `stepSeconds`) through a fleet that scales by target tracking.
//   perServerRps      what one running server can answer
//   target            the utilisation (percent) target tracking aims for
//   min, max          fleet limits;  initial  servers running at the start (default min)
//   scheduled         scheduled actions [{ atSecond, min }]: from that second on, the minimum is that number (the latest one that has started wins)
//   lose              a zone failure { atSecond, fraction }: at that second this share of the running servers is gone at once
//   warmupSeconds     seconds from "launch" until a new server answers requests
//   cooldownSeconds   after any scaling action, no scale-in until this many seconds have passed
// Servers still warming up count as capacity on the way (so the fleet does not launch twice for the same load),
// but they answer nothing. Requests above what running servers can answer in a step are dropped.
// Scale-in is gentle (one tenth of the fleet per action) and each action restarts the cooldown.
export function simulate({ profile, stepSeconds = 10, perServerRps, target = 50, min = 2, max = 50, initial = min, warmupSeconds = 120, cooldownSeconds = 300, scheduled = [], lose = null }) {
  const pending = []; // seconds at which launched servers become ready
  let running = initial;
  let lastAction = -Infinity;
  const timeline = [];
  profile.forEach((offered, i) => {
    const t = i * stepSeconds;
    while (pending.length && pending[0] <= t) {
      pending.shift();
      running += 1;
    }
    if (lose && t === Math.ceil(lose.atSecond / stepSeconds) * stepSeconds) running = Math.max(0, running - Math.ceil(running * lose.fraction));
    const floor = scheduled.filter((s) => s.atSecond <= t).sort((a, b) => b.atSecond - a.atSecond)[0]?.min ?? min;
    const capacity = running * perServerRps;
    const served = Math.min(offered, capacity);
    const dropped = Math.max(0, offered - capacity) * stepSeconds;
    const utilisation = capacity > 0 ? (offered / capacity) * 100 : 1000;
    const wanted = desiredCapacity({ current: Math.max(running, 1), metric: utilisation, target, min: floor, max });
    const total = running + pending.length;
    if (wanted > total) {
      for (let k = 0; k < wanted - total; k++) pending.push(t + warmupSeconds);
      lastAction = t;
    } else if (wanted < running && t - lastAction >= cooldownSeconds) {
      // Scale in gently: at most one tenth of the running servers (at least one) in each action.
      running = Math.max(wanted, floor, running - Math.max(1, Math.floor(running * 0.1)));
      lastAction = t;
    }
    timeline.push({ t, offered, served, wanted, running, pending: pending.length, dropped: Math.round(dropped) });
  });
  const serverSeconds = timeline.reduce((sum, row) => sum + (row.running + row.pending) * stepSeconds, 0);
  return {
    timeline,
    dropped: timeline.reduce((sum, row) => sum + row.dropped, 0),
    offeredTotal: Math.round(profile.reduce((a, b) => a + b, 0) * stepSeconds),
    peakRunning: Math.max(...timeline.map((r) => r.running)),
    serverHours: Math.round((serverSeconds / 3600) * 100) / 100,
  };
}
