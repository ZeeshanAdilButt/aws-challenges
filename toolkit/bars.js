// Horizontal bar chart as a standalone SVG string. Black and white, readable in light and dark pages.
const esc = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function barsSvg({ title, unit = '', bars, width = 720, format = (v) => String(v) }) {
  const rowHeight = 34;
  const left = 230;
  const right = 110;
  const top = 46;
  const height = top + bars.length * rowHeight + 16;
  const max = Math.max(...bars.map((b) => b.value), 1e-9);
  const plot = width - left - right;
  const rows = bars.map((bar, i) => {
    const y = top + i * rowHeight;
    const w = Math.max(2, Math.round((bar.value / max) * plot));
    return `  <text x="${left - 10}" y="${y + 17}" text-anchor="end" class="label">${esc(bar.label)}</text>
  <rect x="${left}" y="${y}" width="${w}" height="22" class="bar"/>
  <text x="${left + w + 8}" y="${y + 17}" class="value">${esc(format(bar.value))}${unit ? ' ' + esc(unit) : ''}</text>`;
  });
  const desc = bars.map((b) => `${b.label}: ${format(b.value)} ${unit}`.trim()).join('; ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="t d">
  <title id="t">${esc(title)}</title>
  <desc id="d">${esc(desc)}</desc>
  <style>
    .bg { fill: #ffffff; } .bar { fill: #111111; } .label, .value, .head { fill: #111111; font: 14px system-ui, sans-serif; } .head { font-weight: 700; font-size: 16px; }
    @media (prefers-color-scheme: dark) { .bg { fill: #0d0d0d; } .bar { fill: #f2f2f2; } .label, .value, .head { fill: #f2f2f2; } }
  </style>
  <rect class="bg" width="${width}" height="${height}"/>
  <text x="16" y="28" class="head">${esc(title)}</text>
${rows.join('\n')}
</svg>
`;
}
