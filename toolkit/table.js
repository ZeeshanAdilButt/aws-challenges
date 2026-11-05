// Tiny table helpers. Every result in the repository is printed and saved with these.
const cell = (value) => String(value ?? '').replaceAll('|', '\|').replaceAll('\n', ' ');

// A markdown table, used in results.md and READMEs.
export function markdownTable(head, rows) {
  const lines = [`| ${head.map(cell).join(' | ')} |`, `|${head.map(() => '---').join('|')}|`];
  for (const row of rows) lines.push(`| ${row.map(cell).join(' | ')} |`);
  return lines.join('\n');
}

// Aligned plain text for the terminal.
export function textTable(head, rows) {
  const all = [head, ...rows].map((row) => row.map((v) => String(v ?? '')));
  const widths = head.map((_, i) => Math.max(...all.map((row) => row[i].length)));
  const line = (row) => row.map((v, i) => v.padEnd(widths[i])).join('  ').trimEnd();
  return [line(all[0]), widths.map((w) => '-'.repeat(w)).join('  '), ...all.slice(1).map(line)].join('\n');
}
