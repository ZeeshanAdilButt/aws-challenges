// The shape every part script follows, so tools/make-results.mjs can run them all the same way.
//
//   export const title = 'Challenge 2, part 1: the evaluator';
//   export async function run() { return { facts: [['label', 'value']], head: [...], rows: [[...]], chart: {...} }; }
//   main(import.meta.url, run);        // runs and prints the result only when the file is started directly
//
// facts  : short "label: value" lines shown above the table
// head   : table column names        rows: table rows
// extra  : optional second table { head, rows }
// chart  : optional { title, unit, bars: [{ label, value }], format } drawn by toolkit/bars.js
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { barsSvg } from './bars.js';
import { markdownTable, textTable } from './table.js';

export const COST_LINE = 'Cost: 0 dollars, runs on the emulator.';

export function printResult(result) {
  for (const [label, value] of result.facts ?? []) console.log(`${label}: ${value}`);
  if (result.head) console.log(`\n${textTable(result.head, result.rows)}`);
  if (result.extra) console.log(`\n${textTable(result.extra.head, result.extra.rows)}`);
}

export function main(metaUrl, run) {
  if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === metaUrl) {
    run().then(printResult, (error) => {
      console.error(error);
      process.exit(1);
    });
  }
}

// The body shared by results.md and the README results block (no heading, no cost line).
export function resultBody(result) {
  const parts = [];
  if (result.facts?.length) parts.push(result.facts.map(([label, value]) => `- ${label}: **${value}**`).join('\n'));
  if (result.head) parts.push(markdownTable(result.head, result.rows));
  if (result.extra) parts.push(markdownTable(result.extra.head, result.extra.rows));
  if (result.chart) parts.push('![chart](chart.svg)');
  return parts.join('\n\n');
}

export const chartSvg = (result) => (result.chart ? barsSvg(result.chart) : null);
