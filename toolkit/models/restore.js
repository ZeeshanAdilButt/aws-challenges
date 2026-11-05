// Restore-point chooser and connection pool sizing. Mirrors choosing a restore time inside the restorable window
// (RDS point-in-time restore) and the PostgreSQL default max_connections rule on RDS: LEAST(memory / 9531392, 5000) (dossier P41, VERIFIED).
// Not sourced: AWS keeps some connections for itself; `reserved` is a number you choose, not an AWS number.
// The unit of time is up to you (whole minutes in the chapter; the drill in challenge 11 counts in seconds).

// dropAt, restorableStart, restorableEnd: whole time units. Returns { target, lostWrites, restoreMinutes } or null.
export function restorePlan({ dropAt, restorableStart, restorableEnd, writesPerMinute, sizeGb, gbPerMinute, fixedMinutes }) {
  const target = Math.min(dropAt - 1, restorableEnd);
  if (target < restorableStart) return null;
  return {
    target,
    lostWrites: (dropAt - target) * writesPerMinute,
    restoreMinutes: Math.ceil(fixedMinutes + sizeGb / gbPerMinute - 1e-9),
  };
}

export const maxConnections = (memoryBytes) => Math.min(Math.floor(memoryBytes / 9531392), 5000);

export const poolSize = ({ maxConnections: max, reserved, instances }) => Math.max(1, Math.floor((max - reserved) / instances));
