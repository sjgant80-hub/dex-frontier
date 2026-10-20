#!/usr/bin/env node
// tools/measure-2e.mjs — organ 2e, THE MESH CHOOSES ITS COUPLING (the fifth take at the gate). Organ 2 found a linear
// coupling composes the telco nodes (0.822 vs their best 0.813) and not the shop's; organ 2d found trees over the scores
// compose the shop nodes (0.830 vs 0.810) and not telco's. No domain should need a person to pick: here each domain's
// mesh judges both couplings out of fold on its own GATE cases (four folds; src/select.mjs) and takes the better one —
// never looking at TEST. Organ 2's live nodes, unchanged. Then on TEST: against the best single node and every record
// pooled. Deterministic:  node tools/measure-2e.mjs [--check] → data/organ-2e/record.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { silo, pooled } from '../src/silos.mjs';
import { scores } from '../src/node.mjs';
import { linear, trees, choose } from '../src/select.mjs';
import { lead } from '../src/stats.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf, testAuc } from './mesh.mjs';
import { scrambleTest } from './measure-1.mjs';
import { TREES } from './measure-2d.mjs';

export const FOLDS = 4;
const ROOT = new URL('../', import.meta.url);

async function domain(ds) {
  const live = liveOf(await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)))), testY = ds.testRows.map((i) => ds.y[i]), gateY = ds.gateRows.map((i) => ds.y[i]);
  const gateCols = live.map((n) => scores(n.organism, n.view, ds.gateRows)), testCols = live.map((n) => scores(n.organism, n.view, ds.testRows));
  const pick = choose([linear, trees(TREES)], gateCols, gateY, FOLDS), S = ds.testRows.map((_, r) => pick.model.predict(testCols.map((c) => c[r])));
  const singles = live.map((n, k) => ({ node: n.name, s: testCols[k] })), best = singles.reduce((b, x) => (auc(x.s, testY) > auc(b.s, testY) ? x : b));
  const P = pooled(ds), mono = boosted(P, P.rows), bS = ds.testRows.map((i) => mono.score(i));
  return { nodes: live.map((n) => n.name), chosen: pick.chosen, outOfFold: pick.scored.map((s) => ({ coupling: s.name, gateAuc: round6(s.oof) })),
    auc: testAuc(ds, S), best: { node: best.node, testAuc: testAuc(ds, best.s) }, vsBest: lead(S, best.s, testY), vsMonolith: lead(S, bS, testY) };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.organ-2e.record', v: 1, settings: { folds: FOLDS, trees: TREES } };
  for (const d of ['telco', 'shop']) out[d] = await domain(D[d]);
  out.deterministic = JSON.stringify(await domain(D.shop)) === JSON.stringify(out.shop);
  const blind = { telco: await domain(scrambleTest(D.telco)), shop: await domain(scrambleTest(D.shop)) };
  out.choiceNeverReadTest = ['telco', 'shop'].every((d) => blind[d].chosen === out[d].chosen && JSON.stringify(blind[d].outOfFold) === JSON.stringify(out[d].outOfFold));
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-2e.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-2e/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-2e/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-2e/record.json', ROOT), text); console.log('wrote data/organ-2e/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
