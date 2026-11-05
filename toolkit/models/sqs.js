// Retry, visibility timeout and dead-letter queue simulator. Mirrors SQS redrive and a Lambda event source mapping.
// AWS's exact rules are not in the course notes, so these are the exercise's own rules.
// Facts from the dossier (D1, D2, VERIFIED): the default visibility timeout is 30 seconds, messages are kept 4 days by default.

// Follow one message from the queue to "done" or to the dead-letter queue (dlq).
// msg = { id, failAttempts?, poison? }. A poison message fails on every receive; otherwise it fails its first failAttempts receives.
export function deliver(msg, { visibilityTimeout = 30, maxReceiveCount = 3, handlerSeconds = 5 } = {}) {
  const failsFor = msg.poison ? Infinity : msg.failAttempts ?? 0;
  let receives = 0;
  let t = 0;
  for (;;) {
    receives += 1;
    if (receives <= failsFor) {
      if (receives >= maxReceiveCount) return { id: msg.id, outcome: 'dlq', receives, effects: 0, finishedAt: t + visibilityTimeout };
      t += visibilityTimeout;
      continue;
    }
    let effects = 1;
    if (handlerSeconds > visibilityTimeout) {
      const copies = Math.min(Math.floor(handlerSeconds / visibilityTimeout) + 1, maxReceiveCount - receives + 1);
      receives += copies - 1;
      effects = copies;
    }
    return { id: msg.id, outcome: 'done', receives, effects, finishedAt: t + handlerSeconds };
  }
}

// Do the work for an id only once. store is a Set that survives between calls (in real life: a table with a conditional write).
// The id is claimed BEFORE the work, so a repeat that arrives while the work runs finds the claim and skips. If the work throws, the claim is released so a retry can try again.
export function processOnce(store, id, fn) {
  if (store.has(id)) return false;
  store.add(id);
  try {
    fn();
  } catch (err) {
    store.delete(id);
    throw err;
  }
  return true;
}

// The key the upload pipeline uses: the object key plus its ETag, so a changed file is new work and a repeated event is not.
export const idempotencyKey = (bucket, key, etag) => `${bucket}/${key}#${String(etag).replaceAll('"', '')}`;
