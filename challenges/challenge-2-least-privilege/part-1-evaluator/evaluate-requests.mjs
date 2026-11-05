// STEP 1: this part never calls AWS. The decision logic is in toolkit/models/policy.js (the YOUR TURN is there).
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { evaluate } from '../../../toolkit/models/policy.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 2, part 1: the policy evaluator';

export const sample = JSON.parse(fs.readFileSync(new URL('./cases.json', import.meta.url), 'utf8'));

// STEP 2: ask the evaluator about one case. The policies and the boundary come from cases.json.
export function ask(c, { policies, boundary } = sample) {
  return evaluate({ action: c.action, resource: c.resource, context: c.context }, policies, boundary);
}

export async function run() {
  // STEP 3: compare every answer with the decision and the reason written in cases.json.
  const rows = sample.cases.map((c) => {
    const got = ask(c);
    const ok = got.decision === c.decision && got.reason === c.reason;
    return [c.name, c.action, c.decision, `${got.decision} (${got.reason})`, ok ? 'yes' : 'NO'];
  });
  const passed = rows.filter((r) => r[4] === 'yes').length;
  return {
    facts: [['Cases passed', `${passed} of ${rows.length}`]],
    head: ['Case', 'Action', 'Expected', 'Evaluator says', 'Match?'],
    rows,
  };
}

main(import.meta.url, run);
