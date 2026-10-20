#!/usr/bin/env node
// tools/measure-5.mjs — organ 5, THE WISP: routing that learns from outcomes. Each domain's TEST cases arrive as a
// stream (telco: a seeded order, no dates; shop: the file's order, November then December), answered in windows of 300;
// after each window its outcomes come in. Four meshes run the same stream from organ 2's live nodes: the coupling
// FROZEN at GATE; LEARNING (re-learned before each window from GATE and every outcome so far); and the same two again
// when the domain's strongest node goes bad half-way (its scores turn to noise: a failure, or a node taken over) — the
// learning mesh may also PRUNE a node whose out-of-fold contribution to the recent outcomes has fallen to nothing.
// Deterministic:  node tools/measure-5.mjs [--check] → data/organ-5/record.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { scores } from '../src/node.mjs';
import { order, run, breakAt } from '../src/wisp.mjs';
import { lead } from '../src/stats.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf } from './mesh.mjs';

export const WINDOW = 300, ORDER_SEED = 5005, BREAK_SEED = 55;
const ROOT = new URL('../', import.meta.url);

async function domain(ds) {
  const live = liveOf(await nodes(Object.keys(ds.silos).map((s) => silo(ds, s))));
  const stream = ds.name === 'telco' ? order(ds.testRows, ORDER_SEED) : ds.testRows;
  const gate = { cols: live.map((n) => scores(n.organism, n.view, ds.gateRows)), y: ds.gateRows.map((i) => ds.y[i]) };
  const S = { cols: live.map((n) => scores(n.organism, n.view, stream)), y: stream.map((i) => ds.y[i]) }, half = Math.floor(stream.length / 2);
  const broken = { cols: S.cols.map((c, k) => (k === 0 ? breakAt(c, half, BREAK_SEED) : c)), y: S.y };
  const late = (s) => s.slice(half), yLate = S.y.slice(half);
  const frozen = run(gate, S, { size: WINDOW }), learning = run(gate, S, { size: WINDOW, learn: true });
  const bFrozen = run(gate, broken, { size: WINDOW }), bWisp = run(gate, broken, { size: WINDOW, learn: true, prune: true });
  const firstWindow = (r) => r.scores.slice(0, WINDOW).join();
  const prunedAt = bWisp.live.findIndex((l, w) => w * WINDOW >= half && !l.includes(0));
  return {
    nodes: live.map((n) => n.name), cases: stream.length, windows: frozen.live.length, brokenNode: live[0].name, breakAt: half,
    calm: { frozenLate: round6(auc(late(frozen.scores), yLate)), learningLate: round6(auc(late(learning.scores), yLate)), vs: lead(late(learning.scores), late(frozen.scores), yLate) },
    broken: { frozenLate: round6(auc(late(bFrozen.scores), yLate)), wispLate: round6(auc(late(bWisp.scores), yLate)), vs: lead(late(bWisp.scores), late(bFrozen.scores), yLate),
      liveByWindow: bWisp.live.map((l) => l.map((k) => live[k].name)), prunedInWindow: prunedAt < 0 ? null : prunedAt + 1, windowsAfterBreak: prunedAt < 0 ? null : prunedAt - Math.floor(half / WINDOW) },
    firstWindowAgrees: firstWindow(frozen) === firstWindow(learning) && firstWindow(bFrozen) === firstWindow(bWisp),
    untouchedBeforeBreak: broken.cols[0].slice(0, half).join() === S.cols[0].slice(0, half).join(),
  };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.organ-5.record', v: 1, settings: { window: WINDOW, orderSeed: ORDER_SEED, breakSeed: BREAK_SEED } };
  for (const d of ['telco', 'shop']) out[d] = await domain(D[d]);
  out.deterministic = JSON.stringify(await domain(D.telco)) === JSON.stringify(out.telco);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-5.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-5/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-5/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-5/record.json', ROOT), text); console.log('wrote data/organ-5/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
