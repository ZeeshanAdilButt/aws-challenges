// A plan differ: the wanted resources against the recorded state, in apply order.
// Mirrors what `terraform plan` and `tofu plan` do. The wording of the line is the course's own "plan line".
// Left out on purpose: cascading replacement, "known after apply" values, and the provider's own list of
// attributes that force replacement (you pass that list in `replaceOn`).

const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
  return value;
}

// Dependency order of a list of { id, dependsOn }: dependencies first, ties by id.
function order(items) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const done = new Set();
  const busy = [];
  const out = [];
  const visit = (id, from) => {
    if (busy.includes(id)) throw new Error(`Cycle: ${[...busy.slice(busy.indexOf(id)), id].join(' -> ')}`);
    if (done.has(id)) return;
    const item = byId.get(id);
    if (!item) throw new Error(`Unknown dependency: ${from} needs ${id}`);
    busy.push(id);
    for (const dep of [...(item.dependsOn ?? [])].sort()) visit(dep, id);
    busy.pop();
    done.add(id);
    out.push(item);
  };
  for (const id of [...byId.keys()].sort()) visit(id, id);
  return out;
}

export function planDiff(desired, state, replaceOn = {}) {
  const stateById = new Map(state.map((item) => [item.id, item]));
  const desiredIds = new Set(desired.map((item) => item.id));
  const counts = { create: 0, update: 0, replace: 0, delete: 0, noop: 0 };
  const steps = [];
  for (const item of order(desired)) {
    const current = stateById.get(item.id);
    if (!current) {
      counts.create += 1;
      steps.push({ id: item.id, action: 'create', changed: Object.keys(item.attrs ?? {}).sort() });
      continue;
    }
    const a = item.attrs ?? {};
    const b = current.attrs ?? {};
    const changed = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((key) => !same(a[key], b[key])).sort();
    if (!changed.length) {
      counts.noop += 1;
      continue;
    }
    const replace = changed.some((key) => (replaceOn[item.type] ?? []).includes(key));
    counts[replace ? 'replace' : 'update'] += 1;
    steps.push({ id: item.id, action: replace ? 'replace' : 'update', changed });
  }
  const gone = state.filter((item) => !desiredIds.has(item.id));
  const goneIds = new Set(gone.map((item) => item.id));
  const trimmed = gone.map((item) => ({ ...item, dependsOn: (item.dependsOn ?? []).filter((dep) => goneIds.has(dep)) }));
  for (const item of order(trimmed).reverse()) {
    counts.delete += 1;
    steps.push({ id: item.id, action: 'delete', changed: [] });
  }
  const add = counts.create + counts.replace;
  const destroy = counts.delete + counts.replace;
  const line = steps.length ? `Plan: ${add} to add, ${counts.update} to change, ${destroy} to destroy.` : 'No changes.';
  return { steps, counts, line };
}
