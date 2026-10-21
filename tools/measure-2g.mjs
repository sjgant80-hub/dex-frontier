#!/usr/bin/env node
// tools/measure-2g.mjs — organ 2g, THE GATE TAKEN AGAIN, on cases no attempt has touched, with two measurement faults of
// organ 2f fixed before it runs. 2f's frontier test was asked on 300 cases, where its noise band (about ±0.025) is wider
// than its 0.02 bar: after the seal even the pooled models failed it (data/organ-2f/ceiling.json). Here the frontier model
// answers 1,200 cases a domain (400 with the outcome, 800 without), in four cold batches of 300. 2f's growth test asked
// for a fixed +0.01 over the first department; on the bank even the pooled model gains only 0.007 over its economy
// department on GATE (data/diagnose-2.json), so a fixed step can sit out of any model's reach. The spec asks that adding a
// specialist MEASURABLY raise the mesh: here, beyond the noise. The body each department fields is fixed beforehand on
// FIT and GATE alone (data/study-body*.json): the best on GATE of five grown from its own sealed seed — the six-rule
// scorecard, and the deep body (src/deep.mjs) cut on the quantile grid, cut between a coded column's values, and each of
// those with paired rules (a rule may hold two conditions: a slice of two columns, where an interaction lives). Everything else is organ 2f's: the coupling chosen out of fold on GATE, departments joining in
// GATE order, the same rivals. Deterministic:  node tools/measure-2g.mjs [--check] → data/organ-2g/record.json
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
import { read, nodes } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { fileHash } from './order.mjs';
import { DOMAINS, load, sampleOf, BATCH, batchPrompt } from './contest-2g.mjs';

export const FOLDS = 4, SEED = 1, ROUTE_SEED = 7, SHUFFLE_SEED = 13, NOISE_SEED = 17;
/** every grown body a department may field, and the settings it grows with (src/deep.mjs) */
export const DEEP_BODIES = { 'deep-quantile': { cuts: 'quantile' }, 'deep-values': { cuts: 'values' }, 'pairs-quantile': { cuts: 'quantile', pairs: true }, 'pairs-values': { cuts: 'values', pairs: true } };
/** the bodies each department grows here, chosen on FIT and GATE alone by the body studies (data/study-body-3.json) */
export const BODIES = ['six', 'deep-quantile', 'deep-values', 'pairs-quantile', 'pairs-values'];   // the best mean mesh there: 0.8635, against 0.8628 for the first three
const ROOT = new URL('../', import.meta.url);
const COUPLERS = [linear, trees(TREES)];

/** every department: three bodies grown from its sealed seed, the best on GATE fielded (a tie fields the earlier) */
async function departments(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), grown = await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)), { seed: SEED });
  return grown.map((n) => {
    const deep = Object.fromEntries(BODIES.filter((b) => b !== 'six').map((b) => [b, growDeep(n.view, ds.fitRows, SEED, DEEP_BODIES[b])]));
    const gate = { six: n.advert.gateAuc, ...Object.fromEntries(Object.entries(deep).map(([b, d]) => [b, round6(auc(ds.gateRows.map((i) => scoreDeep(d, n.view, i)), gy))])) };
    const fielded = BODIES.reduce((b, k) => (gate[k] > gate[b] ? k : b), 'six');
    const live = fielded === 'six' ? n.advert.state === 'live' : gate[fielded] >= BAR;
    const body = fielded === 'six' ? null : deep[fielded];
    const score = (rows) => (body ? rows.map((i) => scoreDeep(body, n.view, i)) : scores(n.organism, n.view, rows));
    return { name: n.name, view: n.view, genome: n.genome, gate, stages: Object.fromEntries(Object.entries(deep).map(([b, d]) => [b, d.stages.length])), fielded, gateAuc: gate[fielded], state: live ? 'live' : 'cut', score };
  });
}
const liveOf = (deps) => deps.filter((d) => d.state === 'live').sort((a, b) => b.gateAuc - a.gateAuc || (a.name < b.name ? -1 : 1));
const gateSide = (deps) => deps.map((d) => [d.name, d.fielded, ...BODIES.map((k) => d.gate[k]), d.state].join(':')).join();

/** with no live department the mesh abstains on every case: a coin (0.5), so every rule that compares it fails as it should */
const ABSTAIN = { chosen: 'none (no department live)', scored: [], model: { predict: () => 0.5 } };
function meshOf(live, ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), gateCols = live.map((d) => d.score(ds.gateRows)), pick = live.length ? choose(COUPLERS, gateCols, gy, FOLDS) : ABSTAIN;
  const testCols = live.map((d) => d.score(ds.testRows)), composed = ds.testRows.map((_, r) => pick.model.predict(testCols.map((c) => c[r])));
  return { pick, gateCols, testCols, composed, gy };
}

async function domain(name) {
  const { ds, raw } = load(name), testY = ds.testRows.map((i) => ds.y[i]), deps = await departments(ds), live = liveOf(deps), m = meshOf(live, ds);
  const singles = live.map((d, k) => ({ department: d.name, fielded: d.fielded, gateAuc: d.gateAuc, testAuc: round6(auc(m.testCols[k], testY)) }));
  const bestK = singles.reduce((b, s, k) => (s.testAuc > singles[b].testAuc ? k : b), 0), none = { department: 'none', fielded: 'none', gateAuc: 0, testAuc: 0.5 };
  const sham = live.length ? COUPLERS.find((c) => c.name === m.pick.chosen).learn(m.gateCols, shuffled(m.gy, SHUFFLE_SEED)) : ABSTAIN.model, shamS = ds.testRows.map((_, r) => sham.predict(m.testCols.map((c) => c[r])));
  const routed = live.length ? randomRoute(m.gateCols.map((g) => calibrate(g, m.gy)), m.testCols, ROUTE_SEED) : m.composed;
  const growth = live.map((d, k) => { const g = meshOf(live.slice(0, k + 1), ds); return { departments: k + 1, added: d.name, chosen: g.pick.chosen, testAuc: round6(auc(g.composed, testY)), composed: g.composed }; });
  const P = pooled(ds), boost = boosted(P, P.rows), logit = logistic(P, P.rows), boostS = ds.testRows.map((i) => boost.score(i));
  // the frontier test: 1,200 cases in four batches; a missing or unreadable answer is scored as a coin (0.5)
  const at = new Map(ds.testRows.map((i, r) => [i, r])), rows = sampleOf(ds), y = rows.map((i) => ds.y[i]), meshS = rows.map((i) => m.composed[at.get(i)]);
  const answered = new Map(), files = [];
  for (let b = 0; b * BATCH < rows.length; b++) {
    const a = JSON.parse(read('data/llm/frontier-' + name + '-' + (b + 1) + '.json'));
    files.push({ batch: b + 1, promptMatches: a.prompt === sha256Hex(batchPrompt(ds, raw, b)).slice(0, 16), answered: a.calls.length, unreadable: a.calls.filter((c) => c.p === null).length });
    for (const c of a.calls) answered.set(c.row, c.p);
  }
  const front = rows.map((i) => (answered.get(i) ?? null) === null ? 0.5 : answered.get(i));
  const blind = await departments(scrambleTest(ds)), bm = meshOf(liveOf(blind), scrambleTest(ds));
  const known = [...ds.fitRows, ...ds.gateRows], ys = shuffled(known.map((i) => ds.y[i]), NOISE_SEED), yNoise = Uint8Array.from(ds.y);
  known.forEach((i, k) => { yNoise[i] = ys[k]; });
  const d0 = deps[0], bad = d0.genome.text.replace(/auc=0\.(\d)/, (_, x) => 'auc=0.' + (x === '6' ? '7' : '6'));
  return {
    departments: deps.map((d) => ({ department: d.name, columns: d.view.features.length, gate: d.gate, stages: d.stages, fielded: d.fielded, gateAuc: d.gateAuc, state: d.state })),
    live: live.map((d) => d.name), chosen: m.pick.chosen, outOfFold: m.pick.scored.map((s) => ({ coupling: s.name, gateAuc: round6(s.oof) })),
    cases: ds.testRows.length, outcomes: testY.reduce((a, v) => a + v, 0),
    composedAuc: round6(auc(m.composed, testY)), singles, best: singles[bestK] || none,
    vsBest: lead(m.composed, m.testCols[bestK] || m.composed, testY), vsShuffled: lead(m.composed, shamS, testY), vsRoute: lead(m.composed, routed, testY),
    growth: growth.map(({ composed, ...g }) => g), fullVsFirst: lead(m.composed, (growth[0] || m).composed, testY),
    monolith: { boosted: lead(m.composed, boostS, testY), logistic: lead(m.composed, ds.testRows.map((i) => logit.score(i)), testY) },
    frontier: { model: JSON.parse(read('data/llm/frontier-' + name + '-1.json')).model, cases: rows.length, outcomes: y.reduce((a, v) => a + v, 0), sha: sha256Hex(JSON.stringify(rows)).slice(0, 16), batches: files, vs: lead(meshS, front, y), pooledVs: lead(rows.map((i) => boostS[at.get(i)]), front, y) },
    ownColumnsOnly: deps.every((d) => Object.keys(d.view.cols).every((f) => ds.silos[d.name.split('-').slice(1).join('-')].includes(f))),
    testNeverRead: gateSide(blind) === gateSide(deps) && bm.pick.chosen === m.pick.chosen && JSON.stringify(bm.pick.scored) === JSON.stringify(m.pick.scored),
    noiseLive: liveOf(await departments({ ...ds, y: yNoise })).map((d) => d.name),
    tamperRefused: bad !== d0.genome.text && !(await growNode(bad, d0.view)).ok,
  };
}

/** each fresh data file is the one downloaded, byte for byte (data/fresh2-sources.json; the seal pins that file) */
export const filesMatchSources = () => JSON.parse(read('data/fresh2-sources.json')).files.every((f) => fileHash(readFileSync(new URL(f.path, ROOT))) === f.sha256);

export async function measure() {
  if (!filesMatchSources()) throw new Error('a fresh data file is not the one data/fresh2-sources.json records');
  const out = { kind: 'dex-frontier.organ-2g.record', v: 1, settings: { bar: BAR, folds: FOLDS, trees: TREES, seed: SEED, bodies: BODIES, frontierCases: 1200, batch: BATCH }, filesMatchSources: true };
  for (const d of DOMAINS) out[d] = await domain(d);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-2g.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-2g/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-2g/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-2g/record.json', ROOT), text); console.log('wrote data/organ-2g/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
