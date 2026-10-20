#!/usr/bin/env node
// tools/convert-credit.mjs — the credit clients, read once from the publisher's .xls (data/credit-default.xls, byte for
// byte as UCI ships it) by tools/xls.mjs and written as plain CSV (data/credit-default.csv): its column names and every
// client's 25 numbers, in the file's order. CI re-derives the CSV byte for byte on every push, so the CSV is the .xls.
//   node tools/convert-credit.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { readXls } from './xls.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';

export function convert(bytes) {
  const x = readXls(bytes);
  if (!x.ok) return x;
  const head = x.rows[1], body = x.rows.slice(2);
  if (!head || !body.length || !body.every((r) => r.length === head.length && r.every((v) => typeof v === 'number'))) return { ok: false, error: 'not the 25-column all-number sheet the publisher ships' };
  return { ok: true, csv: [head.join(','), ...body.map((r) => r.join(','))].join('\n') + '\n' };
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/convert-credit.mjs');
if (isMain) {
  const c = convert(new Uint8Array(readFileSync(new URL('../data/credit-default.xls', import.meta.url))));
  if (!c.ok) { console.log('REFUSED · ' + c.error); process.exit(1); }
  const out = new URL('../data/credit-default.csv', import.meta.url);
  if (process.argv.includes('--check')) { const now = readFileSync(out, 'utf8'); if (now !== c.csv) { console.log('CSV MISMATCH · committed ' + sha256Hex(now).slice(0, 16) + ' vs re-derived ' + sha256Hex(c.csv).slice(0, 16)); process.exit(1); } console.log('CSV RE-DERIVED · ' + sha256Hex(c.csv).slice(0, 16)); }
  else { writeFileSync(out, c.csv); console.log('wrote data/credit-default.csv · ' + sha256Hex(c.csv).slice(0, 16)); }
}
