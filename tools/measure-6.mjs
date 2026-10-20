#!/usr/bin/env node
// tools/measure-6.mjs — organ 6, SCALE: more silos, more nodes. Each domain cut finer (telco 7 silos, shop 6: src/scale.mjs),
// every fine silo grows its own node, the live ones join one at a time in GATE order, and the composed mesh is scored on
// TEST at every size — against organ 2's coarse mesh and the poured monolith (boosted trees on every column pooled).
// Deterministic:  node tools/measure-6.mjs [--check] → data/organ-6/record.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { silo, pooled } from '../src/silos.mjs';
import { fine, fineNames } from '../src/scale.mjs';
import { lead } from '../src/stats.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf, mesh, testAuc } from './mesh.mjs';
import { scrambleTest } from './measure-1.mjs';

const ROOT = new URL('../', import.meta.url);

async function domain(ds) {
  const testY = ds.testRows.map((i) => ds.y[i]);
  const fineNodes = await nodes(fineNames(ds).map((s) => fine(ds, s)), { maker: (v) => 'fine-' + v.name }), live = liveOf(fineNodes);
  const curve = live.map((_, k) => { const m = mesh(ds, live.slice(0, k + 1)); return { nodes: k + 1, added: live[k].name, testAuc: testAuc(ds, m.score(ds.testRows)) }; });
  const fineS = mesh(ds, live).score(ds.testRows), coarseS = mesh(ds, liveOf(await nodes(Object.keys(ds.silos).map((s) => silo(ds, s))))).score(ds.testRows);
  const P = pooled(ds), b = boosted(P, P.rows), bS = ds.testRows.map((i) => b.score(i));
  return { fine: fineNodes.map((n) => ({ silo: n.name, columns: n.view.features.length, state: n.advert.state, gateAuc: n.advert.gateAuc })), live: live.map((n) => n.name), curve,
    fineAuc: testAuc(ds, fineS), coarseAuc: testAuc(ds, coarseS), vsCoarse: lead(fineS, coarseS, testY), vsMonolith: lead(fineS, bS, testY), numbers: live.reduce((a, n) => a + n.organ.body.rules.length * 3 + 2, 0) + (live.length * 3 + 1) };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.organ-6.record', v: 1 };
  for (const d of ['telco', 'shop']) out[d] = await domain(D[d]);
  const ids = async (ds) => (await nodes(fineNames(ds).map((s) => fine(ds, s)), { maker: (v) => 'fine-' + v.name })).map((n) => n.organism.id).join();
  out.testNeverRead = (await ids(scrambleTest(D.telco))) === (await ids(D.telco));
  out.deterministic = (await ids(D.shop)) === (await ids(D.shop));
  out.ownColumnsOnly = ['telco', 'shop'].every((d) => fineNames(D[d]).every((s) => { const v = fine(D[d], s); return Object.keys(v.cols).every((f) => v.features.includes(f)); }));
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-6.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-6/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-6/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-6/record.json', ROOT), text); console.log('wrote data/organ-6/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
