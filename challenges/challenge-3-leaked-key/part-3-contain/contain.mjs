// STEP 1: the guard first. Containment changes users and keys, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { CreateAccessKeyCommand, CreateUserCommand, GetUserPolicyCommand, ListAccessKeysCommand, PutUserPolicyCommand, UpdateAccessKeyCommand } from '@aws-sdk/client-iam';
import { iam as makeIam, resetEmulator } from '../../../toolkit/aws.js';
import { evaluate } from '../../../toolkit/models/policy.js';
import { main } from '../../../toolkit/part.js';
import { loadEvents } from '../part-1-event-log/inspect-log.mjs';
import { LEAKED_KEY, TRUSTED_IPS, scopeKey } from '../part-2-scope/scope-key.mjs';

export const title = 'Challenge 3, part 3: containment plan and runbook entry';
export const PHASES = ['Detect', 'Contain', 'Eradicate', 'Recover', 'Learn'];
export const POLICY_NAME = 'ContainLeakedKey';

// STEP 2: a policy that stops everything the user could do, whatever other policies say (your turn).
export function denyPolicy() {
  // YOUR TURN start
  // HINT: one statement, Effect Deny, Action '*', Resource '*'. An explicit deny beats every allow.
  // YOUR TURN end
}

// STEP 3: the containment plan, in the order it must happen (your turn).
// Each step: { order, phase, action, api, params }. The first two steps have an api this repository can run
// on the emulator: 'iam:UpdateAccessKey' and 'iam:PutUserPolicy'. The rest are for a person.
export function buildPlan(scope) {
  // YOUR TURN start
  // HINT: Contain first (switch the key off, attach the deny policy), then Eradicate (remove what the stranger started),
  // HINT: then Recover (a new key or, better, no key), then Learn. Use scope.owner, scope.keyId, scope.suspect.*.
  // YOUR TURN end
}

// Runs the steps this repository can run on the emulator. The others are listed as "for a person".
export async function execute(plan, iam) {
  const done = [];
  for (const step of plan) {
    if (step.api === 'iam:UpdateAccessKey') await iam.send(new UpdateAccessKeyCommand(step.params));
    else if (step.api === 'iam:PutUserPolicy') await iam.send(new PutUserPolicyCommand(step.params));
    else {
      done.push({ order: step.order, ran: false });
      continue;
    }
    done.push({ order: step.order, ran: true });
  }
  return done;
}

// STEP 4: the runbook entry, in plain markdown, one heading per phase (your turn).
// It must carry the numbers a tired person at 3am needs: the key, the owner, first and last time, calls, notes read, servers started.
export function runbookEntry(scope, plan = buildPlan(scope)) {
  // YOUR TURN start
  // HINT: start with a title line, then for each phase in PHASES a "## Phase" heading and a list of what to do or know.
  // HINT: Detect describes what was seen; the other phases list the plan steps whose phase matches.
  // YOUR TURN end
}

// Which calls of the stranger would still go through if the deny policy and an allow-everything policy were both attached?
export function stillAllowed(events, scope) {
  const allowEverything = { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }] };
  const calls = events.filter((e) => e.userIdentity.accessKeyId === scope.keyId && !TRUSTED_IPS.includes(e.sourceIPAddress) && !e.errorCode);
  const action = (e) => `${e.eventSource.split('.')[0]}:${e.eventName}`;
  const stillOk = calls.filter((e) => evaluate({ action: action(e), resource: '*', context: {} }, [allowEverything, denyPolicy(scope)]).decision === 'Allow');
  return { calls: calls.length, stillOk: stillOk.length };
}

export async function run() {
  const events = loadEvents();
  const scope = scopeKey(events, LEAKED_KEY, TRUSTED_IPS);
  const plan = buildPlan(scope);

  // Practise on the emulator: a user with a key, then the first two steps of the plan.
  const iam = makeIam();
  await resetEmulator();
  await iam.send(new CreateUserCommand({ UserName: scope.owner }));
  const { AccessKey } = await iam.send(new CreateAccessKeyCommand({ UserName: scope.owner }));
  const practice = buildPlan({ ...scope, keyId: AccessKey.AccessKeyId });
  const ran = await execute(practice, iam);
  const key = (await iam.send(new ListAccessKeysCommand({ UserName: scope.owner }))).AccessKeyMetadata[0];
  const attached = await iam.send(new GetUserPolicyCommand({ UserName: scope.owner, PolicyName: POLICY_NAME }));
  const after = stillAllowed(events, scope);

  return {
    facts: [
      ['Key status on the emulator after step 1', key.Status],
      ['Deny policy attached by step 2', attached.PolicyName],
      ['Steps run on the emulator', `${ran.filter((r) => r.ran).length} of ${ran.length}`],
      ['Stranger calls that succeeded in the log', String(after.calls)],
      ['Of those, still allowed after containment', String(after.stillOk)],
    ],
    head: ['Order', 'Phase', 'What to do', 'API', 'Run here?'],
    rows: plan.map((p) => [p.order, p.phase, p.action, p.api, ran.find((r) => r.order === p.order).ran ? 'yes' : 'for a person']),
    chart: {
      title: 'Stranger calls that would succeed',
      unit: 'calls',
      bars: [{ label: 'before containment', value: after.calls }, { label: 'after steps 1 and 2', value: after.stillOk }],
    },
  };
}

main(import.meta.url, run);
