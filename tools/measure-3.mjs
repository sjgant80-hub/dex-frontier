#!/usr/bin/env node
// tools/measure-3.mjs — organ 3, BREEDING (μ ⋈κ f 𝟙). In each domain, every silo organ 2 found live gets a founding
// population of six nodes from six contributors (founder 1 is organ 2's own node). Four generations of gated breeding:
// six breedings a generation between parents picked by fitness; a child is born only if it beats both parents on GATE;
// the population keeps its six best. Then, on TEST: the best bred node of each silo against the best founder, and the
// mesh of bred champions against organ 2's mesh. Deterministic:  node tools/measure-3.mjs [--check] → data/organ-3/record.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { contributor, sealNode, growNode, scores } from '../src/node.mjs';
import { member, evolve } from '../src/population.mjs';
import { lead } from '../src/stats.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf, mesh, testAuc } from './mesh.mjs';
import { scrambleTest } from './measure-1.mjs';

export const FOUNDERS = 6, GENERATIONS = 4, ATTEMPTS = 6, SEED = 3;
const ROOT = new URL('../', import.meta.url);

async function population(view) {
  const pop = [];
  for (let s = 1; s <= FOUNDERS; s++) {
    const keys = await contributor(s === 1 ? view.name.split('-').slice(1).join('-') : view.name.split('-').slice(1).join('-') + '-' + s), g = await sealNode(view, keys, { seed: s }), n = await growNode(g.text, view);
    if (n.organ.state === 'live') pop.push(member(g, n));
  }
  return pop;
}

async function domain(ds) {
  const first = liveOf(await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)))), base = mesh(ds, first), testY = ds.testRows.map((i) => ds.y[i]);
  const silos = [], champions = [];
  for (const n of first) {
    const pop = await population(n.view), breeder = await contributor(n.view.name + '-breeder');
    const out = await evolve(pop, n.view, breeder, { generations: GENERATIONS, attempts: ATTEMPTS, seed: SEED });
    const bestFounder = pop.reduce((a, b) => (b.gateAuc > a.gateAuc ? b : a)), champ = out.pop[0];
    const tf = round6(auc(scores(bestFounder.organism, n.view, ds.testRows), testY)), tc = round6(auc(scores(champ.organism, n.view, ds.testRows), testY));
    silos.push({ silo: n.name, founders: pop.length, born: out.born, refused: out.refused, gateHistory: out.history, bestFounder: { gateAuc: bestFounder.gateAuc, testAuc: tf }, champion: { gateAuc: champ.gateAuc, testAuc: tc, bred: out.lineage.some((l) => l.child === champ.id) }, lineage: out.lineage, everyChildBeatBoth: out.lineage.every((l) => l.childGate > Math.max(...l.parentGates) && l.parents.length === 2) });
    champions.push({ ...n, organism: champ.organism, organ: champ.organ });
  }
  const bred = mesh(ds, champions), s0 = base.score(ds.testRows), s1 = bred.score(ds.testRows);
  return { silos, firstMeshAuc: testAuc(ds, s0), bredMeshAuc: testAuc(ds, s1), vsFirst: lead(s1, s0, testY), monotone: silos.every((x) => x.gateHistory.every((h, k) => k === 0 || h >= x.gateHistory[k - 1])) };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.organ-3.record', v: 1, settings: { founders: FOUNDERS, generations: GENERATIONS, attempts: ATTEMPTS, seed: SEED } };
  for (const d of ['telco', 'shop']) out[d] = await domain(D[d]);
  const again = await domain(D.telco), blind = await domain(scrambleTest(D.telco));
  out.deterministic = JSON.stringify(again.silos.map((s) => s.lineage)) === JSON.stringify(out.telco.silos.map((s) => s.lineage));
  out.testNeverRead = JSON.stringify(blind.silos.map((s) => [s.lineage, s.gateHistory])) === JSON.stringify(out.telco.silos.map((s) => [s.lineage, s.gateHistory]));
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-3.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-3/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-3/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-3/record.json', ROOT), text); console.log('wrote data/organ-3/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
