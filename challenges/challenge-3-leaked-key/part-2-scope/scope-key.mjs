// STEP 1: this part never calls AWS. It reads the log from part 1 and answers "what did the stranger do?".
import '../../../toolkit/guard-offline.js';
import { main } from '../../../toolkit/part.js';
import { countBy, loadEvents } from '../part-1-event-log/inspect-log.mjs';

export const title = 'Challenge 3, part 2: scope the damage';

export const LEAKED_KEY = 'AKIADAFTARLEAK000001';
export const TRUSTED_IPS = ['198.51.100.10']; // the CI server, where this key legitimately lives

// STEP 2: everything the key did from an address we do not trust (your turn).
// Returns { keyId, owner, trustedCalls, suspect: { calls, failed, firstSeen, lastSeen, sourceIps, regions,
//           byEvent: [[name, count], ...], objectsRead, instancesLaunched, writes } }
//   failed          calls with an errorCode
//   objectsRead     distinct "bucket/key" read by a successful GetObject
//   instancesLaunched  ids in the responseElements.instances of successful RunInstances calls
//   writes          names of successful calls that are not read-only, sorted and distinct
export function scopeKey(events, keyId, trustedIps) {
  // YOUR TURN start
  // HINT: first keep only events with userIdentity.accessKeyId === keyId. Split them by sourceIPAddress.
  // HINT: use countBy from part 1 for byEvent. eventTime is an ISO text, so sorting as text sorts by time.
  // YOUR TURN end
}

export async function run() {
  const scope = scopeKey(loadEvents(), LEAKED_KEY, TRUSTED_IPS);
  const s = scope.suspect;
  const minutes = Math.round((Date.parse(s.lastSeen) - Date.parse(s.firstSeen)) / 60000);
  return {
    facts: [
      ['Key', `${scope.keyId} (belongs to ${scope.owner})`],
      ['Normal calls from the CI server', String(scope.trustedCalls)],
      ['Calls from the stranger', `${s.calls} (${s.failed} failed)`],
      ['First and last call', `${s.firstSeen} to ${s.lastSeen} (${minutes} minutes)`],
      ['Source addresses and regions', `${s.sourceIps.join(' ')}; ${s.regions.join(' ')}`],
      ['Notes read', String(s.objectsRead)],
      ['Servers started', String(s.instancesLaunched)],
      ['Things changed', s.writes.join(', ') || 'none'],
    ],
    head: ['Call (service:name)', 'Times'],
    rows: s.byEvent.map(([name, count]) => [name, count]),
    chart: {
      title: 'What the stranger did with the key (calls)',
      unit: 'calls',
      bars: s.byEvent.slice(0, 6).map(([name, count]) => ({ label: name, value: count })),
    },
  };
}

main(import.meta.url, run);
