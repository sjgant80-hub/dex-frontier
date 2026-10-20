#!/usr/bin/env node
// tools/measure-2b.mjs — organ 2b, THE COMPOSITION FIX (taken only if organ 2 found composition does not net). Nodes grown
// on their own each find what predicts best BY ITSELF, so a weaker silo can mostly repeat what the strongest already
// knows. Here the mesh grows one complementary node at a time: the node with the best GATE score grows on its own (as in
// organ 2); every next silo's node is CO-GROWN (src/cogrow.mjs) — its recipe search scored by the coupled AUC it adds on
// its own FIT rows, given the scores the nodes already in the mesh give those same cases (scores cross, records never) —
// and it joins only if it adds on GATE out of fold (the gate on composition: a silo that adds nothing stays out, however
// good it is alone; one that adds stays in, however weak alone). Then on TEST, as organ 2: against the best single node,
// against organ 2's mesh, and against every record pooled.
// Deterministic:  node tools/measure-2b.mjs [--check] → data/organ-2b/record.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { silo, pooled } from '../src/silos.mjs';
import { contributor, growNode, scores } from '../src/node.mjs';
import { cogrow } from '../src/cogrow.mjs';
import { fixedRecipe } from '../src/population.mjs';
import { contribution } from '../src/wisp.mjs';
import { lead } from '../src/stats.mjs';
import { GROW } from '../src/node.mjs';
import { seal } from '../vendor/living-seed/src/genome.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf, mesh, testAuc } from './mesh.mjs';
import { scrambleTest } from './measure-1.mjs';

export const SEED = 1, JOIN_BAR = 0.5;   // a co-grown node carries the lowest bar a genome may: its real gate is what it adds
const ROOT = new URL('../', import.meta.url);

async function domain(ds) {
  const solo = await nodes(Object.keys(ds.silos).map((s) => silo(ds, s))), soloLive = liveOf(solo), testY = ds.testRows.map((i) => ds.y[i]);
  const order = [...solo].sort((a, b) => b.advert.gateAuc - a.advert.gateAuc || (a.name < b.name ? -1 : 1));
  const inMesh = [order[0]], steps = [{ silo: order[0].name, how: 'grown on its own', joined: true }];
  for (const n of order.slice(1)) {
    const fitScores = inMesh.map((m) => new Map(ds.fitRows.map((i, r) => [i, scores(m.organism, m.view, [i])[0]])));
    const others = (i) => fitScores.map((m) => m.get(i));
    const g = cogrow(n.view, ds.fitRows, SEED, GROW, others), keys = await contributor(n.name.split('-').slice(1).join('-'));
    const sealed = await seal({ name: 'node-' + n.view.name, parents: [], gate: { auc: JOIN_BAR }, organs: [fixedRecipe(n.view.name, SEED, g.champion)] }, keys);
    const grown = await growNode(sealed.text, n.view), candidate = { ...n, genome: sealed, grown, organism: grown.organism, organ: grown.organ };
    const gateCols = [...inMesh, candidate].map((m) => scores(m.organism, m.view, ds.gateRows)), gateY = ds.gateRows.map((i) => ds.y[i]);
    const adds = grown.organ.state === 'live' ? round6(contribution(gateCols, gateCols.length - 1, gateY)) : null;
    const joined = adds !== null && adds > 0;
    if (joined) inMesh.push(candidate);
    steps.push({ silo: n.name, how: 'co-grown', innerFitness: g.fitness, gateAlone: grown.organ.heldAuc, addsOnGate: adds, joined, rules: grown.organ.body ? grown.organ.body.rules.length : 0 });
  }
  const co = mesh(ds, inMesh), coS = co.score(ds.testRows), soloS = mesh(ds, soloLive).score(ds.testRows);
  const singles = inMesh.map((m) => ({ node: m.name, s: scores(m.organism, m.view, ds.testRows) })), bestK = singles.reduce((b, x, k) => (auc(x.s, testY) > auc(singles[b].s, testY) ? k : b), 0);
  const allSingles = solo.filter((m) => m.advert.state === 'live').map((m) => scores(m.organism, m.view, ds.testRows)).concat(singles.map((x) => x.s));
  const bestAny = allSingles.reduce((b, s) => (auc(s, testY) > auc(b, testY) ? s : b));
  const P = pooled(ds), b = boosted(P, P.rows), bS = ds.testRows.map((i) => b.score(i));
  return { steps, mesh: inMesh.map((m) => m.name), coAuc: testAuc(ds, coS), soloAuc: testAuc(ds, soloS), vsBest: lead(coS, bestAny, testY), vsSolo: lead(coS, soloS, testY), vsMonolith: lead(coS, bS, testY), bestInMesh: singles[bestK].node };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.organ-2b.record', v: 1, settings: { seed: SEED, joinBar: JOIN_BAR } };
  for (const d of ['telco', 'shop']) out[d] = await domain(D[d]);
  out.deterministic = JSON.stringify((await domain(D.shop)).steps) === JSON.stringify(out.shop.steps);
  out.testNeverRead = JSON.stringify((await domain(scrambleTest(D.shop))).steps) === JSON.stringify(out.shop.steps);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-2b.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-2b/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-2b/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-2b/record.json', ROOT), text); console.log('wrote data/organ-2b/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
