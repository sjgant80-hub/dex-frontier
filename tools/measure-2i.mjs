#!/usr/bin/env node
// tools/measure-2i.mjs — organ 2i, THE GATE TAKEN AGAIN, with a relay. In organ 2h every department joined in both domains,
// the mesh beat its parts and grew, yet it trailed every record pooled by about 0.03 in both and the frontier model on the
// coupon offers. On FIT and GATE alone (data/diagnose-4.json) one boosted model per department, one score each, trailed
// pooled by the same: the gap is what one score per department can carry, since a pattern that needs one department's
// columns crossed with another's is invisible to both. A relay won most of it back while still only scores crossed:
// departments grow in turn, strongest first, each on its own columns and the scores the stronger ones send it. With grown
// rule bodies the relay added almost nothing (data/diagnose-5.json): a body of threshold rules keeps only a coarse step of
// a score it is sent. Boosted trees carry it (data/diagnose-6.json). So here: each department grows the four rule bodies
// of organ 2h and depth-2 boosted trees (src/bodies.mjs; the Living Seed's own baseline kernel) on FIT and fields the best
// on GATE; it joins if that body beats a coin on GATE beyond the noise (organ 2h's rule); the departments that join form a
// relay in GATE order (src/relay.mjs), each sent every stronger department's score (a rule body reads its own columns
// first and the senders that fit a genome's 16); the mesh couples every department's relayed score, its coupling chosen
// out of fold on GATE. Every rival of organ 2h, and one more: the mesh of organ 2h's kind (the same departments, alone,
// one score each, the same choice of body), which the relay must beat for the relay to count. The frontier model on
// 1,200 cases a domain.
// Deterministic:  node tools/measure-2i.mjs [--check] → data/organ-2i/record.json
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { silo, pooled } from '../src/silos.mjs';
import { growNode } from '../src/node.mjs';
import { calibrate, randomRoute, shuffled } from '../src/compose.mjs';
import { field, growKind, scoreKind, KINDS } from '../src/bodies.mjs';
import { linear, trees, choose } from '../src/select.mjs';
import { relay } from '../src/relay.mjs';
import { lead } from '../src/stats.mjs';
import { logistic, boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6, MAXFEATS } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, nodes } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { fileHash } from './order.mjs';
import { DOMAINS, load, sampleOf, BATCH, batchPrompt } from './contest-2i.mjs';

export const FOLDS = 4, RELAY_FOLDS = 4, SEED = 1, ROUTE_SEED = 7, SHUFFLE_SEED = 13, NOISE_SEED = 17;
/** the bodies a department may field (src/bodies.mjs): organ 2h's four grown rule bodies and boosted trees; its six-rule
 *  organism, fielded there once and only on a tie, is not grown */
export const BODIES = KINDS;
const ROOT = new URL('../', import.meta.url);
const COUPLERS = [linear, trees(TREES)];
const short = (name) => name.split('-').slice(1).join('-');

/** grow every kind of body on FIT; field the best on GATE (a tie fields the earlier); its size: rule stages or trees */
export function fieldOn(ds, view) {
  const f = field(view, ds.fitRows, ds.gateRows, { kinds: BODIES, seed: SEED });
  if (f.error) throw new Error(f.error);
  return { ...f, size: f.kind === 'boosted' ? f.body.model.rounds + ' trees' : f.body.deep.stages.length + ' stages' };
}

/** every department alone: its signed seed grown and checked, its bodies grown, one fielded; it joins if it beats a coin on GATE beyond the noise */
export async function departments(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), grown = await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)), { seed: SEED });
  return grown.map((n) => {
    const f = fieldOn(ds, n.view), score = (rows) => rows.map((i) => scoreKind(f.body, n.view, i)), join = lead(score(ds.gateRows), gy.map(() => 0.5), gy);
    return { name: n.name, view: n.view, genome: n.genome, fielded: f, join: join.low95, state: join.low95 > 0 ? 'live' : 'cut', score };
  });
}
const liveOf = (deps) => deps.filter((d) => d.state === 'live').sort((a, b) => b.fielded.gateAuc - a.fielded.gateAuc || (a.name < b.name ? -1 : 1));

/** the relay over the live departments, strongest first, each sent every stronger one's score (a rule body reads its own
 *  columns first and the senders that fit its genome); a department that takes no score fields what it fielded alone */
export function relayOf(ds, live) {
  const alone = new Map(live.map((d) => [d.view.features.join(), d.fielded]));
  return relay({ order: live.map((d) => d.name), viewOf: (name) => live.find((d) => d.name === name).view, field: (view) => alone.get(view.features.join()) || fieldOn(ds, view),
    grow: (view, rows, f) => growKind(f.kind, view, rows, SEED), score: scoreKind, fitRows: ds.fitRows, otherRows: [...ds.gateRows, ...ds.testRows], n: ds.n, folds: RELAY_FOLDS, max: Number.MAX_SAFE_INTEGER });
}

/** with no live department the mesh abstains on every case: a coin (0.5), so every rule that compares it fails as it should */
const ABSTAIN = { chosen: 'none (no department live)', scored: [], model: { predict: () => 0.5 } };
export function meshOf(cols, ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), gateCols = cols.map((c) => ds.gateRows.map((i) => c[i])), pick = cols.length ? choose(COUPLERS, gateCols, gy, FOLDS) : ABSTAIN;
  const testCols = cols.map((c) => ds.testRows.map((i) => c[i])), composed = ds.testRows.map((_, r) => pick.model.predict(testCols.map((c) => c[r])));
  return { pick, gateCols, testCols, composed, gy };
}
const aloneCol = (ds, d) => { const c = new Float64Array(ds.n); for (const i of [...ds.gateRows, ...ds.testRows]) c[i] = scoreKind(d.fielded.body, d.view, i); return c; };
const gateSide = (deps, r) => deps.map((d) => [d.name, d.fielded.kind, ...BODIES.map((k) => d.fielded.gate[k]), d.join, d.state].join(':')).join() + '|' + (r.ok ? r.departments.map((d) => [d.name, d.took.join('+'), d.fielded.kind, ...BODIES.map((k) => d.fielded.gate[k])].join(':')).join() : r.error);

async function domain(name) {
  const { ds, raw } = load(name), testY = ds.testRows.map((i) => ds.y[i]), deps = await departments(ds), live = liveOf(deps), r = live.length ? relayOf(ds, live) : { ok: true, departments: [] };
  if (!r.ok) throw new Error(r.error);
  const relayed = r.departments.map((d) => d.col), m = meshOf(relayed, ds), one = meshOf(live.map((d) => aloneCol(ds, d)), ds);
  const singles = live.map((d, k) => ({ department: d.name, fielded: d.fielded.kind, gateAuc: d.fielded.gateAuc, testAuc: round6(auc(one.testCols[k], testY)) }));
  const bestK = singles.reduce((b, s, k) => (s.testAuc > singles[b].testAuc ? k : b), 0), none = { department: 'none', fielded: 'none', gateAuc: 0, testAuc: 0.5 };
  const sham = live.length ? COUPLERS.find((c) => c.name === m.pick.chosen).learn(m.gateCols, shuffled(m.gy, SHUFFLE_SEED)) : ABSTAIN.model, shamS = ds.testRows.map((_, k) => sham.predict(m.testCols.map((c) => c[k])));
  const routed = live.length ? randomRoute(m.gateCols.map((g) => calibrate(g, m.gy)), m.testCols, ROUTE_SEED) : m.composed;
  const growth = relayed.map((_, k) => { const g = meshOf(relayed.slice(0, k + 1), ds); return { departments: k + 1, added: r.departments[k].name, took: r.departments[k].took.length, chosen: g.pick.chosen, testAuc: round6(auc(g.composed, testY)), composed: g.composed }; });
  const P = pooled(ds), boost = boosted(P, P.rows), logit = logistic(P, P.rows), boostS = ds.testRows.map((i) => boost.score(i));
  // the frontier test: 1,200 cases in four batches; a missing or unreadable answer is scored as a coin (0.5)
  const at = new Map(ds.testRows.map((i, k) => [i, k])), rows = sampleOf(ds), y = rows.map((i) => ds.y[i]), meshS = rows.map((i) => m.composed[at.get(i)]);
  const answered = new Map(), files = [];
  for (let b = 0; b * BATCH < rows.length; b++) {
    const a = JSON.parse(read('data/llm/frontier-' + name + '-' + (b + 1) + '.json'));
    files.push({ batch: b + 1, promptMatches: a.prompt === sha256Hex(batchPrompt(ds, raw, b)).slice(0, 16), answered: a.calls.length, unreadable: a.calls.filter((c) => c.p === null).length });
    for (const c of a.calls) answered.set(c.row, c.p);
  }
  const front = rows.map((i) => (answered.get(i) ?? null) === null ? 0.5 : answered.get(i));
  const B = scrambleTest(ds), blind = await departments(B), bl = liveOf(blind), br = bl.length ? relayOf(B, bl) : { ok: true, departments: [] }, bm = meshOf(br.ok ? br.departments.map((d) => d.col) : [], B);
  const known = [...ds.fitRows, ...ds.gateRows], ys = shuffled(known.map((i) => ds.y[i]), NOISE_SEED), yNoise = Uint8Array.from(ds.y);
  known.forEach((i, k) => { yNoise[i] = ys[k]; });
  const d0 = deps[0], bad = d0.genome.text.replace(/auc=0\.(\d)/, (_, x) => 'auc=0.' + (x === '6' ? '7' : '6'));
  const order = r.departments.map((d) => d.name);
  return {
    departments: deps.map((d) => ({ department: d.name, columns: d.view.features.length, gate: d.fielded.gate, fielded: d.fielded.kind, size: d.fielded.size, gateAuc: d.fielded.gateAuc, joinBound: d.join, state: d.state })),
    live: live.map((d) => d.name),
    relay: r.departments.map((d, k) => ({ department: d.name, took: d.took, columns: d.view.features.length, read: d.fielded.read, fielded: d.fielded.kind, size: d.fielded.size, gate: d.fielded.gate, gateAuc: d.fielded.gateAuc, relayedGateAuc: round6(auc(m.gateCols[k], m.gy)) })),
    chosen: m.pick.chosen, outOfFold: m.pick.scored.map((s) => ({ coupling: s.name, gateAuc: round6(s.oof) })),
    cases: ds.testRows.length, outcomes: testY.reduce((a, v) => a + v, 0),
    composedAuc: round6(auc(m.composed, testY)), singles, best: singles[bestK] || none,
    vsBest: lead(m.composed, one.testCols[bestK] || m.composed, testY), vsOneScore: lead(m.composed, one.composed, testY), oneScore: { chosen: one.pick.chosen, testAuc: round6(auc(one.composed, testY)) },
    vsShuffled: lead(m.composed, shamS, testY), vsRoute: lead(m.composed, routed, testY),
    growth: growth.map(({ composed, ...g }) => g), fullVsFirst: lead(m.composed, (growth[0] || m).composed, testY),
    monolith: { boosted: lead(m.composed, boostS, testY), logistic: lead(m.composed, ds.testRows.map((i) => logit.score(i)), testY) },
    frontier: { model: JSON.parse(read('data/llm/frontier-' + name + '-1.json')).model, cases: rows.length, outcomes: y.reduce((a, v) => a + v, 0), sha: sha256Hex(JSON.stringify(rows)).slice(0, 16), batches: files, vs: lead(meshS, front, y), pooledVs: lead(rows.map((i) => boostS[at.get(i)]), front, y) },
    ownColumnsOnly: deps.every((d) => Object.keys(d.view.cols).every((f) => ds.silos[short(d.name)].includes(f)))
      && r.departments.every((d, k) => d.view.features.every((f) => ds.silos[short(d.name)].includes(f) || (f.startsWith('sent_') && order.slice(0, k).includes(f.slice(5))))),
    testNeverRead: gateSide(blind, br) === gateSide(deps, r) && bm.pick.chosen === m.pick.chosen && JSON.stringify(bm.pick.scored) === JSON.stringify(m.pick.scored),
    noiseLive: liveOf(await departments({ ...ds, y: yNoise })).map((d) => d.name),
    tamperRefused: bad !== d0.genome.text && !(await growNode(bad, d0.view)).ok,
  };
}

/** each fresh data file is the one downloaded, byte for byte (data/fresh4-sources.json; the seal pins that file) */
export const filesMatchSources = () => JSON.parse(read('data/fresh4-sources.json')).files.every((f) => fileHash(readFileSync(new URL(f.path, ROOT))) === f.sha256);

export async function measure() {
  if (!filesMatchSources()) throw new Error('a fresh data file is not the one data/fresh4-sources.json records');
  const out = { kind: 'dex-frontier.organ-2i.record', v: 1, settings: { join: 'beats a coin on GATE beyond the noise: the bound of its lead over 0.5 above 0', relay: 'strongest first on GATE; each is sent every stronger department’s score (a rule body reads its own columns first and the senders that fit ' + MAXFEATS + '); a FIT case’s score from a body that never grew on it (' + RELAY_FOLDS + ' folds)', folds: FOLDS, trees: TREES, seed: SEED, bodies: BODIES, frontierCases: 1200, batch: BATCH }, filesMatchSources: true };
  for (const d of DOMAINS) out[d] = await domain(d);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-2i.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-2i/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-2i/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-2i/record.json', ROOT), text); console.log('wrote data/organ-2i/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
