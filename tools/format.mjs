// tools/format.mjs — how the page prints a record value.
/** a value as the page prints it */
export function format(v, f) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return typeof v === 'string' ? v : '…';
  if (f === 'n') return v.toLocaleString('en-GB');
  if (f === 's') return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(3);
  const d = Number(f);
  return Number.isInteger(d) ? v.toFixed(d) : String(v);
}

