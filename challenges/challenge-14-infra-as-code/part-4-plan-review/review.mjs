// STEP 1: this part never calls AWS and never runs OpenTofu. It reads a plan written as text and you review it.
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 14, part 4: the plan review';

export const PLAN_FILE = new URL('./plan-output.txt', import.meta.url);

// STEP 2: split the plan into its changes. Provided. Each item is { address, action, text }.
// action is one of create, update, replace, destroy, from the line "# <address> will be ...".
export function parsePlan(text = fs.readFileSync(PLAN_FILE, 'utf8')) {
  const parts = text.split(/^\s{2}# /m).slice(1);
  return parts.map((part) => {
    const first = part.split('\n')[0];
    const address = first.split(' ')[0];
    const action = /must be replaced/.test(first) ? 'replace' : /will be created/.test(first) ? 'create' : /updated in-place/.test(first) ? 'update' : /destroyed/.test(first) ? 'destroy' : 'other';
    return { address, action, text: part };
  });
}

// STEP 3: write the review (your turn). Return a list of { address, risk, ask } for the changes that need a person to stop and think.
// risk is one sentence: what could go wrong. ask is one sentence: what you want before you approve.
// There are three risky changes in this plan and three safe ones. Do not flag the safe ones.
export function review(items) {
  // YOUR TURN start
  // HINT: look for "forces replacement" on a database, a 0.0.0.0/0 on a database port, and "*" for both Action and Resource in a policy.
  // YOUR TURN end
}

export const REVIEW_FILE = new URL('./review.md', import.meta.url);

export async function run() {
  const items = parsePlan();
  const found = review(items);
  const md = `# Plan review\n\nCost: 0 dollars, runs on the emulator.\n\nThe plan has ${items.length} changes. ${found.length} need a person.\n\n${found.map((f) => `## ${f.address}\n\n- Risk: ${f.risk}\n- Ask: ${f.ask}\n`).join('\n')}`;
  fs.writeFileSync(REVIEW_FILE, md);
  return {
    facts: [['Changes in the plan', String(items.length)], ['Changes that need a person', String(found.length)], ['Plan text', 'a hand-written illustration, not a real run']],
    head: ['Address', 'Action', 'Flagged?'],
    rows: items.map((i) => [i.address, i.action, found.some((f) => f.address === i.address) ? 'yes' : 'no']),
  };
}

main(import.meta.url, run);
