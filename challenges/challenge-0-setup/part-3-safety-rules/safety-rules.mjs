// STEP 1: this part never calls AWS, so it uses the guard's offline form: same environment checks, no network.
import '../../../toolkit/guard-offline.js';
import { checkEnvironment } from '../../../toolkit/guard-core.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 0, part 3: the safety rules as tests';

// A safe environment, written out in full so the scenarios below change only one thing at a time.
export const SAFE_ENV = {
  AWS_ENDPOINT_URL: 'http://localhost:5000',
  AWS_ACCESS_KEY_ID: 'test',
  AWS_SECRET_ACCESS_KEY: 'test',
  AWS_REGION: 'us-east-1',
};

// STEP 2: write the unsafe setups. Each one changes a single thing and must be refused for its own reason.
export const scenarios = [
  // YOUR TURN start
  // HINT: { name: 'text for people', env: { VARIABLE: 'value' } }. Cover six different rules:
  // HINT: a remote AWS_ENDPOINT_URL, a remote AWS_ENDPOINT_URL_S3, AWS_IGNORE_CONFIGURED_ENDPOINT_URLS,
  // HINT: a key starting AKIA, an AWS_SESSION_TOKEN, and an AWS_PROFILE.
  // YOUR TURN end
];

// STEP 3: run one scenario through the same function the guard uses.
export function tryScenario({ name, env }) {
  const problems = checkEnvironment({ ...SAFE_ENV, ...env });
  return { name, refused: problems.length > 0, codes: problems.map((p) => p.code) };
}

export async function run() {
  const results = scenarios.map(tryScenario);
  const safe = checkEnvironment(SAFE_ENV).length === 0;
  return {
    facts: [
      ['The safe setup is accepted', safe ? 'yes' : 'NO'],
      ['Unsafe setups refused', `${results.filter((r) => r.refused).length} of ${results.length}`],
    ],
    head: ['Scenario', 'Refused?', 'Rule that fired'],
    rows: results.map((r) => [r.name, r.refused ? 'yes' : 'NO', r.codes.join(', ') || '-']),
  };
}

main(import.meta.url, run);
