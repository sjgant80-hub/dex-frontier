#!/usr/bin/env node
// tools/trace.mjs — how it works, traced from a real run: one real telecom customer and one real shop session (the first
// case of each domain's 300), walked through the mesh exactly as it answers. For each node: the columns of its own silo
// (and only those), the rules that fired and their weights, its score; then the coupling's weight for each node, the
// composed answer as a probability, and what really happened. Deterministic:  node tools/trace.mjs [--check] → data/trace.json
import { writeFileSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { scores } from '../src/node.mjs';
import { coupled } from '../src/compose.mjs';
import { caseOf } from '../vendor/living-seed/src/germinate.mjs';
import { round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf, mesh } from './mesh.mjs';
import { sampleOf } from './contest.mjs';

const ROOT = new URL('../', import.meta.url);

async function one(ds) {
  const all = await nodes(Object.keys(ds.silos).map((s) => silo(ds, s))), live = liveOf(all), m = mesh(ds, live), i = sampleOf(ds)[0];
  const steps = all.map((n) => {
    const x = caseOf(n.view, i), live = n.advert.state === 'live', rules = live ? n.organ.body.rules : [];
    const fired = rules.filter((r) => (r.op === '>' ? x[r.feat] > r.v : x[r.feat] <= r.v));
    return { silo: n.name, sees: Object.fromEntries(Object.entries(x).map(([k, v]) => [k, round6(v)])), state: n.advert.state, fired: fired.map((r) => r.feat + ' ' + r.op + ' ' + r.v + ' → ' + r.w), score: live ? scores(n.organism, n.view, [i])[0] : null };
  });
  const s = live.map((n) => scores(n.organism, n.view, [i])[0]), z = coupled(m.c, s);
  return { case: i, steps, weights: live.map((n, k) => ({ silo: n.name, weight: round6(m.c.weights[k + 1]) })), intercept: round6(m.c.weights[0]), logOdds: round6(z), probability: round6(1 / (1 + Math.exp(-z))), outcome: ds.y[i] === 1, crossed: s.length + ' scores' };
}

export async function trace() {
  const D = datasets();
  return { kind: 'dex-frontier.trace', v: 1, telco: await one(D.telco), shop: await one(D.shop) };
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/trace.mjs');
if (isMain) {
  const text = JSON.stringify(await trace(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/trace.json'); if (c !== text) { console.log('TRACE MISMATCH'); process.exit(1); } console.log('TRACE REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('data/trace.json', ROOT), text); console.log('wrote data/trace.json · ' + sha256Hex(text).slice(0, 16)); }
}
