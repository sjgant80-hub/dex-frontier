#!/usr/bin/env node
// tools/measure-2f.mjs — organ 2f, THE GATE RETAKEN IN FULL, on cases no attempt has touched. The spec's gate has three
// tests, and all three must hold before anything scales: the composed mesh beats any single specialist; it approaches a
// frontier model; adding a specialist measurably raises it. Organs 2b to 2e re-tested only the first, all on the same
// telco and shop test cases. Here all three are sealed together, on two datasets downloaded after organ 2e was judged
// (src/fresh.mjs), with the mechanism fixed beforehand from the telco and shop diagnosis on FIT and GATE alone
// (data/diagnose.json):
//   · each department grows two bodies from its own sealed seed (the seed library's six-rule scorecard, and the deep
//     staged body of src/deep.mjs) and fields the one that scores better on GATE; a tie fields the six-rule one. A
//     department whose fielded body scores under 0.6 on GATE is cut;
//   · the mesh chooses its coupling, linear or trees, out of fold on GATE alone, then learns it on all of GATE (2e);
//   · departments join in GATE order.
// Rivals on TEST: the best single department (the best on TEST, the strictest rival), a coupling taught shuffled
// outcomes, random routing, boosted trees and logistic regression on every column pooled in one place, and a frontier
// model (Claude Opus 5.5, cold) on 300 cases per domain (tools/contest-fresh.mjs). Telco and the shop are measured the
// same way, for the record only: their test cases are not fresh, so no sealed rule reads them.
// Deterministic:  node tools/measure-2f.mjs [--check] → data/organ-2f/record.json
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { silo, pooled } from '../src/silos.mjs';
import { growNode, scores, BAR } from '../src/node.mjs';
import { calibrate, randomRoute, shuffled } from '../src/compose.mjs';
import { growDeep, scoreDeep } from '../src/deep.mjs';
import { linear, trees, choose } from '../src/select.mjs';
import { lead } from '../src/stats.mjs';
import { logistic, boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { fileHash } from './order.mjs';
import { load, sampleOf, frontierPrompt } from './contest-fresh.mjs';
import { sampleOf as sampleOf2 } from './contest.mjs';

export const FOLDS = 4, SEED = 1, ROUTE_SEED = 7, SHUFFLE_SEED = 13, NOISE_SEED = 17;
const ROOT = new URL('../', import.meta.url);
const COUPLERS = [linear, trees(TREES)];

/** every department of a domain: both bodies grown from its sealed seed, the better on GATE fielded */
async function departments(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), grown = await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)), { seed: SEED });
  return grown.map((n) => {
    const deep = growDeep(n.view, ds.fitRows, SEED), deepGate = round6(auc(ds.gateRows.map((i) => scoreDeep(deep, n.view, i)), gy));
    const fielded = deepGate > n.advert.gateAuc ? 'deep' : 'six', gate = fielded === 'deep' ? deepGate : n.advert.gateAuc;
    const live = fielded === 'deep' ? deepGate >= BAR : n.advert.state === 'live';
    const score = (rows) => (fielded === 'deep' ? rows.map((i) => scoreDeep(deep, n.view, i)) : scores(n.organism, n.view, rows));
    return { name: n.name, view: n.view, genome: n.genome, six: { gateAuc: n.advert.gateAuc, rules: n.advert.rules }, deep: { gateAuc: deepGate, stages: deep.stages.length, rules: deep.rules }, fielded, gateAuc: gate, state: live ? 'live' : 'cut', score };
  });
}
const liveOf = (deps) => deps.filter((d) => d.state === 'live').sort((a, b) => b.gateAuc - a.gateAuc || (a.name < b.name ? -1 : 1));
const gateSide = (deps) => deps.map((d) => [d.name, d.fielded, d.six.gateAuc, d.deep.gateAuc, d.state].join(':')).join();

/** the mesh over these live departments: the coupling chosen out of fold on GATE, learned on all of GATE */
function meshOf(live, ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), gateCols = live.map((d) => d.score(ds.gateRows)), pick = choose(COUPLERS, gateCols, gy, FOLDS);
  const testCols = live.map((d) => d.score(ds.testRows)), composed = ds.testRows.map((_, r) => pick.model.predict(testCols.map((c) => c[r])));
  return { pick, gateCols, testCols, composed, gy };
}

async function domain(ds, { fresh }) {
  const testY = ds.testRows.map((i) => ds.y[i]), deps = await departments(ds), live = liveOf(deps), m = meshOf(live, ds);
  const singles = live.map((d, k) => ({ department: d.name, fielded: d.fielded, gateAuc: d.gateAuc, testAuc: round6(auc(m.testCols[k], testY)) }));
  const bestK = singles.reduce((b, s, k) => (s.testAuc > singles[b].testAuc ? k : b), 0);
  const sham = COUPLERS.find((c) => c.name === m.pick.chosen).learn(m.gateCols, shuffled(m.gy, SHUFFLE_SEED)), shamS = ds.testRows.map((_, r) => sham.predict(m.testCols.map((c) => c[r])));
  const routed = randomRoute(m.gateCols.map((g) => calibrate(g, m.gy)), m.testCols, ROUTE_SEED);
  const growth = live.map((d, k) => { const g = meshOf(live.slice(0, k + 1), ds); return { departments: k + 1, added: d.name, chosen: g.pick.chosen, testAuc: round6(auc(g.composed, testY)) }; });
  const P = pooled(ds), boost = boosted(P, P.rows), logit = logistic(P, P.rows);
  const out = {
    departments: deps.map((d) => ({ department: d.name, columns: d.view.features.length, six: d.six, deep: d.deep, fielded: d.fielded, gateAuc: d.gateAuc, state: d.state })),
    live: live.map((d) => d.name), chosen: m.pick.chosen, outOfFold: m.pick.scored.map((s) => ({ coupling: s.name, gateAuc: round6(s.oof) })),
    cases: ds.testRows.length, outcomes: testY.reduce((a, v) => a + v, 0),
    composedAuc: round6(auc(m.composed, testY)), singles, best: singles[bestK],
    vsBest: lead(m.composed, m.testCols[bestK], testY), vsShuffled: lead(m.composed, shamS, testY), vsRoute: lead(m.composed, routed, testY),
    growth,
    monolith: { boosted: lead(m.composed, ds.testRows.map((i) => boost.score(i)), testY), logistic: lead(m.composed, ds.testRows.map((i) => logit.score(i)), testY) },
    ownColumnsOnly: deps.every((d) => Object.keys(d.view.cols).every((f) => ds.silos[d.name.split('-').slice(1).join('-')].includes(f))),
  };
  const at = new Map(ds.testRows.map((i, r) => [i, r])), answers = (file, rows) => { const a = JSON.parse(read(file)), byRow = new Map(a.calls.map((x) => [x.row, x])); return { a, p: rows.map((i) => (byRow.get(i) && byRow.get(i).p !== null ? byRow.get(i).p : 0.5)), unreadable: rows.filter((i) => !byRow.get(i) || byRow.get(i).p === null).length, answered: rows.filter((i) => byRow.has(i)).length }; };
  if (fresh) {
    const { raw } = load(ds.name), rows = sampleOf(ds), y300 = rows.map((i) => ds.y[i]), mesh300 = rows.map((i) => m.composed[at.get(i)]), f = answers('data/llm/frontier-' + ds.name + '.json', rows);
    out.sample = { cases: rows.length, outcomes: y300.reduce((a, v) => a + v, 0), sha: sha256Hex(JSON.stringify(rows)).slice(0, 16), composedAuc: round6(auc(mesh300, y300)) };
    out.frontier = { model: f.a.model, answered: f.answered, unreadable: f.unreadable, promptMatches: f.a.prompt === sha256Hex(frontierPrompt(ds, raw)).slice(0, 16), vs: lead(mesh300, f.p, y300) };
    const blind = await departments(scrambleTest(ds)), bl = liveOf(blind), bm = meshOf(bl, scrambleTest(ds));
    out.testNeverRead = gateSide(blind) === gateSide(deps) && bm.pick.chosen === m.pick.chosen && JSON.stringify(bm.pick.scored) === JSON.stringify(m.pick.scored);
    const known = [...ds.fitRows, ...ds.gateRows], ys = shuffled(known.map((i) => ds.y[i]), NOISE_SEED), y = Uint8Array.from(ds.y);
    known.forEach((i, k) => { y[i] = ys[k]; });
    out.noiseLive = liveOf(await departments({ ...ds, y })).map((d) => d.name);
    const d0 = deps[0], bad = d0.genome.text.replace(/auc=0\.(\d)/, (_, x) => 'auc=0.' + (x === '6' ? '7' : '6'));
    out.tamperRefused = bad !== d0.genome.text && !(await growNode(bad, d0.view)).ok;
  } else {
    const rows = sampleOf2(ds), y300 = rows.map((i) => ds.y[i]), mesh300 = rows.map((i) => m.composed[at.get(i)]), f = answers('data/llm/frontier-' + ds.name + '.json', rows);
    out.frontier = { model: f.a.model, answered: f.answered, unreadable: f.unreadable, vs: lead(mesh300, f.p, y300) };
  }
  return out;
}

/** each fresh data file is the one downloaded, byte for byte (data/fresh-sources.json; the seal pins that file) */
export const filesMatchSources = () => JSON.parse(read('data/fresh-sources.json')).files.every((f) => fileHash(readFileSync(new URL(f.path, ROOT))) === f.sha256);

export async function measure() {
  if (!filesMatchSources()) throw new Error('a fresh data file is not the one data/fresh-sources.json records');
  const out = { kind: 'dex-frontier.organ-2f.record', v: 1, settings: { bar: BAR, folds: FOLDS, trees: TREES, seed: SEED }, filesMatchSources: true };
  for (const d of ['bank', 'adult']) out[d] = await domain(load(d).ds, { fresh: true });
  const D = datasets();
  out.notFresh = { telco: await domain(D.telco, { fresh: false }), shop: await domain(D.shop, { fresh: false }) };
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-2f.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-2f/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-2f/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-2f/record.json', ROOT), text); console.log('wrote data/organ-2f/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
