#!/usr/bin/env node
// tools/measure-2c.mjs — organ 2c, THE COMPOSITION FIX, THIRD TAKE. Organ 2b's record showed what went wrong on telco:
// co-growth scored its candidates with a FREE coupling, so it grew a node that helped only by being counted against its
// own evidence (0.257 alone), which its gate then cut. Here everything is coupled the way the mesh is — non-negatively —
// and every silo offers both of its nodes: the one grown on its own (organ 2's) and the one co-grown to complement the
// mesh so far. Silos join in GATE order; each time, the candidate that adds more to the mesh on GATE, out of fold and
// non-negatively coupled, joins — if it adds at all. Then on TEST: against the best single node (any live node, alone-
// grown or co-grown), organ 2's mesh, and every record pooled.
// Deterministic:  node tools/measure-2c.mjs [--check] → data/organ-2c/record.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { silo, pooled } from '../src/silos.mjs';
import { contributor, growNode, scores, GROW } from '../src/node.mjs';
import { cogrow } from '../src/cogrow.mjs';
import { fixedRecipe } from '../src/population.mjs';
import { contribution } from '../src/wisp.mjs';
import { coupleNonNegative } from '../src/compose.mjs';
import { lead } from '../src/stats.mjs';
import { seal } from '../vendor/living-seed/src/genome.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf, mesh, testAuc } from './mesh.mjs';
import { scrambleTest } from './measure-1.mjs';

export const SEED = 1, JOIN_BAR = 0.5;
const ROOT = new URL('../', import.meta.url);

async function domain(ds) {
  const solo = await nodes(Object.keys(ds.silos).map((s) => silo(ds, s))), soloLive = liveOf(solo), testY = ds.testRows.map((i) => ds.y[i]), gateY = ds.gateRows.map((i) => ds.y[i]);
  const order = [...solo].sort((a, b) => b.advert.gateAuc - a.advert.gateAuc || (a.name < b.name ? -1 : 1));
  const inMesh = [order[0]], steps = [{ silo: order[0].name, joined: 'grown on its own' }], candidatesSeen = [];
  const gateCol = (m) => scores(m.organism, m.view, ds.gateRows);
  for (const n of order.slice(1)) {
    const fitScores = inMesh.map((m) => new Map(ds.fitRows.map((i) => [i, scores(m.organism, m.view, [i])[0]]))), others = (i) => fitScores.map((m) => m.get(i));
    const g = cogrow(n.view, ds.fitRows, SEED, GROW, others, { coupler: coupleNonNegative }), keys = await contributor(n.name.split('-').slice(1).join('-'));
    const sealed = await seal({ name: 'node-' + n.view.name, parents: [], gate: { auc: JOIN_BAR }, organs: [fixedRecipe(n.view.name, SEED, g.champion)] }, keys);
    const grown = await growNode(sealed.text, n.view), co = { ...n, genome: sealed, grown, organism: grown.organism, organ: grown.organ, how: 'co-grown' };
    const offer = [{ ...n, how: 'alone' }, co].map((c) => ({ c, live: c.organ && c.organ.state === 'live' }));
    const scored = offer.map(({ c, live }) => ({ c, live, adds: live ? round6(contribution([...inMesh, c].map(gateCol), inMesh.length, gateY, 2, coupleNonNegative)) : null }));
    candidatesSeen.push(scored.length);
    const pick = scored.filter((x) => x.adds !== null && x.adds > 0).sort((p, q) => q.adds - p.adds)[0];
    if (pick) inMesh.push(pick.c);
    steps.push({ silo: n.name, alone: { live: scored[0].live, adds: scored[0].adds }, coGrown: { live: scored[1].live, gateAlone: grown.organ ? grown.organ.heldAuc : null, adds: scored[1].adds }, joined: pick ? pick.c.how : 'neither' });
  }
  const m = mesh(ds, inMesh, coupleNonNegative), S = m.score(ds.testRows), A = mesh(ds, soloLive).score(ds.testRows);
  const pool = [...soloLive, ...inMesh.filter((x) => x.how === 'co-grown')].map((x) => ({ node: x.name, how: x.how || 'alone', s: scores(x.organism, x.view, ds.testRows) }));
  const best = pool.reduce((b, x) => (auc(x.s, testY) > auc(b.s, testY) ? x : b));
  const P = pooled(ds), b = boosted(P, P.rows), bS = ds.testRows.map((i) => b.score(i));
  return { steps, mesh: inMesh.map((x) => x.name + (x.how === 'co-grown' ? ' (co-grown)' : '')), weights: inMesh.map((x, k) => ({ node: x.name, weight: round6(m.c.weights[k + 1]) })),
    auc: testAuc(ds, S), best: { node: best.node, how: best.how, testAuc: testAuc(ds, best.s) }, organ2: testAuc(ds, A),
    vsBest: lead(S, best.s, testY), vsOrgan2: lead(S, A, testY), vsMonolith: lead(S, bS, testY),
    nonNegative: m.c.weights.slice(1).every((w) => w >= 0), bothOffered: candidatesSeen.every((k) => k === 2) };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.organ-2c.record', v: 1, settings: { seed: SEED, joinBar: JOIN_BAR } };
  for (const d of ['telco', 'shop']) out[d] = await domain(D[d]);
  out.deterministic = JSON.stringify((await domain(D.telco)).steps) === JSON.stringify(out.telco.steps);
  out.testNeverRead = JSON.stringify((await domain(scrambleTest(D.telco))).steps) === JSON.stringify(out.telco.steps);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-2c.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-2c/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-2c/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-2c/record.json', ROOT), text); console.log('wrote data/organ-2c/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
