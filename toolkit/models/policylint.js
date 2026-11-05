// A policy-text lint. The emulator applies bucket policies only for Principal "*" and ignores conditions, so it cannot tell you
// that a policy is too wide. This reads the policy text and reports what a careful reviewer would circle.
// Each finding: { sid, rule, message }. Rules: wildcard-principal, wildcard-action, wildcard-resource, no-tls-deny.
import { toArray } from './policy.js';

export function lintPolicy(policy, { requireTlsDeny = false } = {}) {
  const findings = [];
  const add = (st, rule, message) => findings.push({ sid: st.Sid ?? '(no Sid)', rule, message });
  let hasTlsDeny = false;
  for (const st of toArray(policy.Statement)) {
    const principals = st.Principal === '*' ? ['*'] : toArray(st.Principal?.AWS ?? st.Principal?.Service ?? []);
    const actions = toArray(st.Action);
    const resources = toArray(st.Resource);
    if (st.Effect === 'Deny' && JSON.stringify(st.Condition ?? {}).toLowerCase().includes('securetransport')) hasTlsDeny = true;
    if (st.Effect !== 'Allow') continue;
    if (principals.includes('*') && !st.Condition) add(st, 'wildcard-principal', 'Allows everyone, with no condition.');
    if (actions.some((a) => a === '*' || a.endsWith(':*'))) add(st, 'wildcard-action', 'Allows every action of a service.');
    if (resources.includes('*')) add(st, 'wildcard-resource', 'Applies to every resource.');
  }
  if (requireTlsDeny && !hasTlsDeny) findings.push({ sid: '(missing)', rule: 'no-tls-deny', message: 'No statement denies requests that do not use TLS (aws:SecureTransport is false).' });
  return findings;
}
