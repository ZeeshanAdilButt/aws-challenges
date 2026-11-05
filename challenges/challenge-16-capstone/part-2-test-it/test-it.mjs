// STEP 1: this part never calls AWS. The emulator keeps the settings but cannot say what traffic would pass or what a policy
// would allow, so the reachability model (challenge 5) and the policy model (challenge 2) judge the design from part 1.
// Applying the code to the emulator is a separate hand step (README).
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { evaluate } from '../../../toolkit/models/policy.js';
import { checkPath } from '../../../toolkit/models/reach.js';
import { main } from '../../../toolkit/part.js';
import { networkFromCode, policyFile } from '../shared.mjs';

export const title = 'Challenge 16, part 2: test it';

// STEP 2: the paths that must work and the paths that must not (your turn). The network is read from the code in part 1.
// Each probe: { from, to, port, expect } with expect 'ok' or a fault code (see challenge 5). Names: alb, app, db, 'internet:<address>'.
// Write at least 8 probes: at least 4 that must work and at least 4 that must stay closed.
export const pathProbes = [
  // YOUR TURN start
  // HINT: fault codes: sg-egress-denied, sg-ingress-denied, no-route, no-public-ip, blackhole, no-igw, nat-missing, nat-not-public.
  // YOUR TURN end
];

export function runPaths(network, list = pathProbes) {
  return list.map((p) => {
    const result = checkPath(network, { from: p.from, to: p.to, port: p.port });
    const got = result.reachable ? 'ok' : result.fault.code;
    return { ...p, got, match: got === p.expect };
  });
}

// STEP 3: the policy requests that must be allowed and refused (your turn).
// Each probe: { policy: 'task-role' | 'execution-role' | 'worker-function-role', action, resource, context?, expect: 'Allow' | 'Deny' }.
// Write at least 12 probes: at least 5 Allow and at least 7 Deny. Include a plain-HTTP request and a wrong-folder request.
const NOTES = 'arn:aws:s3:::daftar-capstone-notes';
const JOBS = 'arn:aws:sqs:us-east-1:123456789012:daftar-jobs';
const TLS = { 'aws:SecureTransport': 'true' };
export const policyProbes = [
  // YOUR TURN start
  // YOUR TURN end
];

export function runPolicies(list = policyProbes) {
  return list.map((p) => {
    const got = evaluate({ action: p.action, resource: p.resource, context: p.context ?? {} }, [policyFile(p.policy)]);
    const decision = got.decision === 'Allow' ? 'Allow' : 'Deny';
    return { ...p, got: decision, reason: got.reason, match: decision === p.expect };
  });
}

export const EVIDENCE_FILE = new URL('./evidence.md', import.meta.url);

export async function run() {
  const paths = runPaths(networkFromCode());
  const policies = runPolicies();
  const ok = [...paths, ...policies].every((r) => r.match);
  const md = [
    '# Evidence: the capstone design is tested', '', 'Cost: 0 dollars, runs on the emulator.', '',
    `All ${paths.length + policies.length} checks as expected: ${ok ? 'yes' : 'NO'}.`, '',
    '## Paths (reachability model, challenge 5)', '', '| Path | Port | Expected | Got |', '|---|---|---|---|',
    ...paths.map((r) => `| ${r.from} to ${r.to} | ${r.port} | ${r.expect} | ${r.got} |`), '',
    '## Policies (policy model, challenge 2)', '', '| Policy | Action | Expected | Got | Why |', '|---|---|---|---|---|',
    ...policies.map((r) => `| ${r.policy} | ${r.action} | ${r.expect} | ${r.got} | ${r.reason} |`), '',
  ].join('\n');
  fs.writeFileSync(EVIDENCE_FILE, md);
  return {
    facts: [
      ['Paths tested', `${paths.length}, all as expected: ${paths.every((r) => r.match) ? 'yes' : 'NO'}`],
      ['Policy requests tested', `${policies.length} (${policies.filter((p) => p.expect === 'Allow').length} allowed, ${policies.filter((p) => p.expect === 'Deny').length} refused), all as expected: ${policies.every((r) => r.match) ? 'yes' : 'NO'}`],
      ['Apply to the emulator', 'Apply complete! Resources: 40 added, 0 changed, 0 destroyed. (the 3 alarms left out with -exclude: moto 5.2.4 refuses aws_cloudwatch_metric_alarm)'],
    ],
    head: ['Policy', 'Action', 'Expected', 'Got', 'Reason'],
    rows: policies.map((r) => [r.policy, r.action, r.expect, r.got, r.reason]),
    extra: { head: ['Path', 'Port', 'Expected', 'Model says'], rows: paths.map((r) => [`${r.from} to ${r.to}`, r.port, r.expect, r.got]) },
  };
}

main(import.meta.url, run);
