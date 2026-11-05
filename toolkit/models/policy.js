// IAM policy evaluation, as a small pure model. The same rules the course's pictures use.
//
// What it covers: Allow and Deny statements, Action and NotAction, Resource and NotResource, wildcards
// (* and ?), conditions on any key in the request context, an optional permissions boundary.
// What it leaves out on purpose: policy variables like ${aws:username}, resource policies, SCPs,
// session policies and the "IfExists" operators. Real IAM has them; the rules below are the core.
//
// The rules (a request starts denied, "implicit deny"):
//   1. Any matching Deny statement, in any policy, ends it: Deny (explicit deny always wins).
//   2. Otherwise some identity policy must have a matching Allow, or the answer is Deny (no allow).
//   3. If there is a boundary, it must also have a matching Allow, or the answer is Deny (outside boundary).
//   4. Otherwise: Allow.
import { ipInCidr } from './subnets.js';

export const toArray = (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

// STEP R1: wildcards. * matches any run of characters (including none), ? matches exactly one.
export function wildcardMatch(pattern, value, ignoreCase = false) {
  const p = ignoreCase ? pattern.toLowerCase() : pattern;
  const v = ignoreCase ? value.toLowerCase() : value;
  const source = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*').replaceAll('?', '.');
  return new RegExp(`^${source}$`, 's').test(v);
}

const lookup = (context, key) => {
  const found = Object.keys(context ?? {}).find((k) => k.toLowerCase() === key.toLowerCase());
  return found === undefined ? undefined : context[found];
};

function ipMatches(value, cidr) {
  try {
    return ipInCidr(value, cidr);
  } catch {
    return false;
  }
}

// Each operator answers "does this one request value match this one policy value?".
const OPERATORS = {
  StringEquals: (value, policy) => value === policy,
  StringLike: (value, policy) => wildcardMatch(policy, value),
  Bool: (value, policy) => String(value).toLowerCase() === String(policy).toLowerCase(),
  IpAddress: (value, policy) => ipMatches(value, policy),
};
// Negated operators are true when the key is missing from the request.
const NEGATED = {
  StringNotEquals: 'StringEquals',
  StringNotLike: 'StringLike',
  NotIpAddress: 'IpAddress',
};

// STEP R2: conditions. One Condition block: every operator and key must pass (AND); several policy values for a key are OR.
export function conditionMatches(condition, context) {
  for (const [operator, keys] of Object.entries(condition ?? {})) {
    const negated = operator in NEGATED;
    const test = OPERATORS[negated ? NEGATED[operator] : operator];
    if (!test) throw new Error(`Condition operator "${operator}" is not supported by this model`);
    for (const [key, wanted] of Object.entries(keys)) {
      const actual = lookup(context, key);
      if (actual === undefined) {
        if (!negated) return false;
        continue;
      }
      const any = toArray(wanted).some((policyValue) => test(String(actual), String(policyValue)));
      if (negated ? any : !any) return false;
    }
  }
  return true;
}

// STEP R3: does one statement apply to a request? (Effect is not looked at here.)
export function statementMatches(statement, request) {
  const actions = toArray(statement.Action ?? statement.NotAction);
  const actionHit = actions.some((a) => wildcardMatch(a, request.action, true));
  if (statement.NotAction ? actionHit : !actionHit) return false;
  const resources = toArray(statement.Resource ?? statement.NotResource);
  const resourceHit = resources.some((r) => wildcardMatch(r, request.resource));
  if (statement.NotResource ? resourceHit : !resourceHit) return false;
  return conditionMatches(statement.Condition, request.context);
}

function* statementsOf(document) {
  const list = toArray(document?.Statement);
  for (let index = 0; index < list.length; index++) yield { statement: list[index], index };
}

// STEP R4: the decision (your turn).  evaluate(request, policies, boundary?)
//   request:  { action: 's3:GetObject', resource: 'arn:aws:s3:::daftar/notes/1', context: { 'aws:SourceIp': '10.0.0.5' } }
//   policies: an array of policy documents ({ Version, Statement: [...] }) attached to the caller
//   boundary: one policy document or null
// returns { decision: 'Allow' | 'Deny', reason: 'allowed' | 'explicit-deny' | 'no-allow' | 'outside-boundary',
//           matched: { policy, statement, sid } | null }   (policy: index in `policies`, or 'boundary')
export function evaluate(request, policies, boundary = null) {
  // YOUR TURN start
  // HINT: loop over every statement of every policy and the boundary; a matching Deny returns first.
  // HINT: then look for a matching Allow in the policies; then, if there is a boundary, one in the boundary.
  // YOUR TURN end
}
