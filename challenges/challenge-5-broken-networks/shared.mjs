// Helpers shared by the three parts. Provided: the learner's work is the fixes and the runbook lines in each part.
import '../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { checkPath } from '../../toolkit/models/reach.js';

export const loadSet = (url) => JSON.parse(fs.readFileSync(url, 'utf8'));

// Run the probe of one configuration through the reachability model.
export function diagnose(config) {
  const result = checkPath(config.network, config.probe);
  return {
    reachable: result.reachable,
    code: result.fault?.code ?? null,
    where: result.fault?.where ?? null,
    message: result.fault?.message ?? 'reachable',
  };
}

// Count the ingress rules that are open to the whole internet on something other than web ports.
// A fix that adds one of these "works" but is the wrong fix.
function wideOpenRules(network) {
  let count = 0;
  for (const group of Object.values(network.securityGroups)) {
    for (const rule of group.ingress) {
      const everyone = rule.peer === '0.0.0.0/0';
      const webOnly = rule.protocol === 'tcp' && rule.from >= 80 && rule.to <= 443 && (rule.from === rule.to);
      if (everyone && (rule.protocol === '-1' || !webOnly)) count++;
    }
  }
  return count;
}

export const isLazyFix = (before, after) => wideOpenRules(after) > wideOpenRules(before);

// Apply the learner's fix to a copy and probe again.
export function tryFix(config, fix) {
  const copy = structuredClone(config.network);
  if (typeof fix === 'function') fix(copy);
  const result = checkPath(copy, config.probe);
  return { reachable: result.reachable, lazy: isLazyFix(config.network, copy), network: copy };
}

// The whole part: for each configuration, what is wrong, did the fix work, and what is the runbook line?
export function runSet(set, fixes, runbook) {
  return set.configs.map((config) => {
    const before = diagnose(config);
    const after = tryFix(config, fixes[config.id]);
    return { config, before, after, line: runbook[config.id] ?? '' };
  });
}

export function resultFor(set, rows, label) {
  const fixed = rows.filter((r) => r.after.reachable && !r.after.lazy).length;
  return {
    facts: [
      ['Broken networks', String(rows.length)],
      ['Fault found as expected', `${rows.filter((r) => r.before.code === r.config.expect.code && r.before.where === r.config.expect.where).length} of ${rows.length}`],
      ['Fixed without opening the world', `${fixed} of ${rows.length}`],
    ],
    head: ['Configuration', 'What the model reports', 'Where', 'After the fix', 'Runbook line'],
    rows: rows.map((r) => [r.config.id, r.before.code, r.before.where, r.after.reachable ? (r.after.lazy ? 'works but too open' : 'reachable') : 'STILL BROKEN', r.line]),
    chart: {
      title: `${label}: probes that work`,
      unit: 'of ' + rows.length,
      bars: [
        { label: 'before the fixes', value: rows.filter((r) => r.before.reachable).length },
        { label: 'after the fixes', value: fixed },
      ],
    },
  };
}
