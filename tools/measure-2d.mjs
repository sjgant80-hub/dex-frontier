#!/usr/bin/env node
// tools/measure-2d.mjs — organ 2d, A DIFFERENT COMPOSITION MECHANISM (the fourth take at the gate). Every additive mesh so
// far (organs 2, 2b, 2c) trailed the model that pools every record by 0.02–0.03 AUC: what pooling has that a weighted sum
// of scores does not is interactions across silos. Here the coupling itself is nonlinear: small gradient-boosted trees
// (living-seed's baseline kernel, mutation-gated) learn, on GATE, how organ 2's live nodes' SCORES combine — interactions
// included. Its only inputs are the nodes' scores: it holds no record column. Then on TEST: against the best single
// node, organ 2's linear mesh, and every record pooled; and a sham, the same trees taught shuffled outcomes.
// Deterministic:  node tools/measure-2d.mjs [--check] → data/organ-2d/record.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { silo, pooled } from '../src/silos.mjs';
import { scores } from '../src/node.mjs';
import { shuffled } from '../src/compose.mjs';
import { lead } from '../src/stats.mjs';
import { boosted, size } from '../vendor/living-seed/src/baseline.mjs';
import { auc } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf, mesh, testAuc } from './mesh.mjs';
import { scrambleTest } from './measure-1.mjs';

export const TREES = { rounds: 100, rate: 0.1, bins: 16, lambda: 1, minHess: 1 }, SHUFFLE_SEED = 13;
const ROOT = new URL('../', import.meta.url);

/** the nodes' scores as a table the trees can learn from: one column per live node, on GATE and TEST rows only */
function scoreTable(ds, live, y = ds.y) {
  const cols = Object.fromEntries(live.map((n) => [n.name, new Float64Array(ds.n)]));
  for (const n of live) { const rows = [...ds.gateRows, ...ds.testRows], s = scores(n.organism, n.view, rows); rows.forEach((i, k) => { cols[n.name][i] = s[k]; }); }
  return { features: live.map((n) => n.name), cols, y };
}

async function domain(ds) {
  const live = liveOf(await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)))), testY = ds.testRows.map((i) => ds.y[i]);
  const table = scoreTable(ds, live), trees = boosted(table, ds.gateRows, TREES), S = ds.testRows.map((i) => trees.score(i));
  const shamY = Uint8Array.from(ds.y); shuffled(ds.gateRows.map((i) => ds.y[i]), SHUFFLE_SEED).forEach((v, k) => { shamY[ds.gateRows[k]] = v; });
  const sham = boosted({ ...table, y: shamY }, ds.gateRows, TREES), shamS = ds.testRows.map((i) => sham.score(i));
  const linear = mesh(ds, live).score(ds.testRows), singles = live.map((n) => ({ node: n.name, s: scores(n.organism, n.view, ds.testRows) }));
  const best = singles.reduce((b, x) => (auc(x.s, testY) > auc(b.s, testY) ? x : b));
  const P = pooled(ds), mono = boosted(P, P.rows), bS = ds.testRows.map((i) => mono.score(i));
  const usesOnly = [...new Set(trees.trees.flatMap((t) => [t.f, ...t.kids.filter((k) => 'f' in k).map((k) => k.f)]))].sort();
  return { nodes: live.map((n) => n.name), coupling: { trees: trees.rounds, numbers: size(trees), reads: usesOnly },
    auc: testAuc(ds, S), best: { node: best.node, testAuc: testAuc(ds, best.s) }, linear: testAuc(ds, linear), sham: testAuc(ds, shamS),
    vsBest: lead(S, best.s, testY), vsLinear: lead(S, linear, testY), vsMonolith: lead(S, bS, testY), onlyScores: usesOnly.every((f) => live.some((n) => n.name === f)) };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.organ-2d.record', v: 1, settings: { trees: TREES, shuffleSeed: SHUFFLE_SEED } };
  for (const d of ['telco', 'shop']) out[d] = await domain(D[d]);
  out.deterministic = JSON.stringify(await domain(D.shop)) === JSON.stringify(out.shop);
  const blind = await domain(scrambleTest(D.telco));
  out.testNeverRead = JSON.stringify(blind.coupling) === JSON.stringify(out.telco.coupling) && blind.nodes.join() === out.telco.nodes.join();
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-2d.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-2d/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-2d/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-2d/record.json', ROOT), text); console.log('wrote data/organ-2d/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
