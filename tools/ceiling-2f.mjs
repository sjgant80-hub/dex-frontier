#!/usr/bin/env node
// tools/ceiling-2f.mjs — AFTER organ 2f was judged, NOT sealed: could any model here have passed its frontier test? The
// pooled models (every column of every department in one place, organ 2f's own rivals) against the frontier model on the
// same 300 cases, judged by N3's own bar (bound above −0.02). If even they cannot, the test asks for more than "within
// 0.02": with 300 cases its noise band is about ±0.025, so it needs a tie or better. Kept beside the result, not instead.
// Deterministic:  node tools/ceiling-2f.mjs [--check] → data/organ-2f/ceiling.json
import { writeFileSync } from 'node:fs';
import { pooled } from '../src/silos.mjs';
import { lead } from '../src/stats.mjs';
import { logistic, boosted } from '../vendor/living-seed/src/baseline.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read } from './mesh.mjs';
import { load, sampleOf } from './contest-fresh.mjs';

export function measure() {
  const out = { kind: 'dex-frontier.organ-2f.ceiling', v: 1, when: 'after organ 2f was judged; not sealed', bar: -0.02 };
  for (const d of ['bank', 'adult']) {
    const { ds } = load(d), rows = sampleOf(ds), y = rows.map((i) => ds.y[i]), P = pooled(ds), b = boosted(P, P.rows), l = logistic(P, P.rows);
    const a = JSON.parse(read('data/llm/frontier-' + d + '.json')), m = new Map(a.calls.map((c) => [c.row, c.p])), f = rows.map((i) => m.get(i) ?? 0.5);
    const vs = { boosted: lead(rows.map((i) => b.score(i)), f, y), logistic: lead(rows.map((i) => l.score(i)), f, y) };
    out[d] = { ...vs, anyPasses: Object.values(vs).some((x) => x.low95 > out.bar) };
  }
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/ceiling-2f.mjs');
if (isMain) {
  const text = JSON.stringify(measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-2f/ceiling.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/organ-2f/ceiling.json', import.meta.url), text); console.log('wrote data/organ-2f/ceiling.json · ' + sha256Hex(text).slice(0, 16)); }
}
