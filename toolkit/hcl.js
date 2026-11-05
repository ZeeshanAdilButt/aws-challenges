// A very small reader for OpenTofu / Terraform files, enough for the static checks in challenges 14 and 16.
// It does NOT understand the language. It finds `resource "type" "name" { ... }` blocks, the simple `key = "text"`, `key = 123` and `key = aws_x.y.id` lines
// inside them, and the references to other resources (aws_vpc.main). Static tests use it because OpenTofu is not run here.
import fs from 'node:fs';
import path from 'node:path';

export function tfText(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.tf')).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
}

const stripComments = (text) => text.split('\n').map((line) => line.replace(/^\s*#.*$/, '')).join('\n');

export function parseResources(text) {
  const clean = stripComments(text);
  const out = [];
  const head = /^\s*resource\s+"([\w-]+)"\s+"([\w-]+)"\s*\{/gm;
  let match;
  while ((match = head.exec(clean))) {
    let depth = 1;
    let i = head.lastIndex;
    while (i < clean.length && depth > 0) {
      if (clean[i] === '{') depth += 1;
      else if (clean[i] === '}') depth -= 1;
      i += 1;
    }
    const body = clean.slice(head.lastIndex, i - 1);
    const id = `${match[1]}.${match[2]}`;
    const attrs = {};
    for (const line of body.matchAll(/^\s*([a-z_0-9]+)\s*=\s*(?:"([^"]*)"|([\w.]+))\s*$/gm)) attrs[line[1]] = line[2] ?? line[3];
    const refs = [...new Set([...body.matchAll(/\b(aws_[a-z0-9_]+\.[a-z0-9_]+)\b/g)].map((m) => m[1]))].filter((r) => r !== id);
    out.push({ id, type: match[1], attrs, dependsOn: refs, body });
  }
  return out;
}

export const hasVariable = (text, name) => new RegExp(`variable\\s+"${name}"`).test(text);
