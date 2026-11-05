// STEP 1: the guard is the first import. If anything looks unsafe, the program stops right here.
import '../../../toolkit/guard.js';
import { REQUIRED } from '../../../toolkit/guard-core.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 0, part 1: the guard and the safe environment';

// STEP 2: compare each required variable with the value the course expects.
export function checkList(env = process.env) {
  // YOUR TURN start
  // HINT: REQUIRED is a list of { name, expected, why }. Return one row per item:
  // HINT: { variable, expected, actual, ok, why }. Use '(not set)' as actual when the variable is missing.
  // YOUR TURN end
}

export async function run() {
  // STEP 3: show the list for the real environment of this process, and the places the guard moved the config files.
  const rows = checkList(process.env);
  const here = (file) => file.replaceAll('\\', '/').split('/').slice(-2).join('/');
  return {
    facts: [
      ['Config file', here(process.env.AWS_CONFIG_FILE)],
      ['Credentials file', here(process.env.AWS_SHARED_CREDENTIALS_FILE)],
      ['Profile', process.env.AWS_PROFILE ?? '(not set)'],
    ],
    head: ['Variable', 'Expected', 'Actual', 'OK?', 'Why'],
    rows: rows.map((r) => [r.variable, r.expected, r.actual, r.ok ? 'yes' : 'NO', r.why]),
  };
}

main(import.meta.url, run);
