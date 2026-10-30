#!/usr/bin/env node
// tools/measure-2k.mjs — organ 2k, organ 2j taken again, UNCHANGED, on a second fresh domain. Organ 2j held the gate on one
// domain (the CDC's health survey), on its tenth sealed attempt; a buyer walk said, fairly, that one domain after nine
// attempts that asked for two is a narrower pass, so the organs below the gate wait until it is repeated. Here it is:
// the mechanism is organ 2j's exactly — the mesh grown by tools/measure-2j.mjs grownOf (src/grow.mjs: departments offered
// strongest first, each seated only if the mesh with it leads the mesh without it on GATE beyond the noise, a department
// refused sending no score), the same bodies, the same coupling, every rival — on the students of UCI's dropout data
// (src/fresh6.mjs), no organ having scored them, and the frontier model on 1,200 of them. Also recorded, and not a sealed
// rule: the mesh organ 2i's rule would have grown here.
// Deterministic:  node tools/measure-2k.mjs [--check] → data/organ-2k/record.json
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { silo, pooled } from '../src/silos.mjs';
import { growNode } from '../src/node.mjs';
import { calibrate, randomRoute, shuffled } from '../src/compose.mjs';
import { scoreKind } from '../src/bodies.mjs';
import { linear, trees } from '../src/select.mjs';
import { BEYOND } from '../src/grow.mjs';
import { lead } from '../src/stats.mjs';
import { logistic, boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6, MAXFEATS } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { fileHash } from './order.mjs';
import { departments, relayOf, meshOf, FOLDS, RELAY_FOLDS, SEED, ROUTE_SEED, SHUFFLE_SEED, NOISE_SEED, BODIES } from './measure-2i.mjs';
import { DOMAINS, load, sampleOf, BATCH, batchPrompt, sameColumns } from './contest-2k.mjs';
import { grownOf } from './measure-2j.mjs';

const ROOT = new URL('../', import.meta.url);
const COUPLERS = [linear, trees(TREES)];
const short = (name) => name.split('-').slice(1).join('-');
const liveOf = (deps) => deps.filter((d) => d.state === 'live').sort((a, b) => b.fielded.gateAuc - a.fielded.gateAuc || (a.name < b.name ? -1 : 1));

const NONE = { ok: true, departments: [], admitted: [] };
const aloneCol = (ds, d) => { const c = new Float64Array(ds.n); for (const i of [...ds.gateRows, ...ds.testRows]) c[i] = scoreKind(d.fielded.body, d.view, i); return c; };
const gateSide = (deps, g) => deps.map((d) => [d.name, d.fielded.kind, ...BODIES.map((k) => d.fielded.gate[k]), d.join, d.state].join(':')).join() + '|' + (g.ok ? g.departments.map((d) => [d.name, d.took.join('+'), d.fielded.kind, ...BODIES.map((k) => d.fielded.gate[k]), d.before, d.with, d.bound, d.joins].join(':')).join() : g.error);

async function domain(name) {
  const { ds, raw } = load(name), testY = ds.testRows.map((i) => ds.y[i]), deps = await departments(ds), live = liveOf(deps), g = live.length ? grownOf(ds, live) : NONE;
  if (!g.ok) throw new Error(g.error);
  const joined = g.departments.filter((d) => d.joins), relayed = joined.map((d) => d.col), m = meshOf(relayed, ds);
  const byName = new Map(deps.map((d) => [d.name, d])), alone = meshOf(live.map((d) => aloneCol(ds, d)), ds), one = meshOf(joined.map((d) => aloneCol(ds, byName.get(d.name))), ds);
  const singles = live.map((d, k) => ({ department: d.name, fielded: d.fielded.kind, gateAuc: d.fielded.gateAuc, testAuc: round6(auc(alone.testCols[k], testY)) }));
  const bestK = singles.reduce((b, s, k) => (s.testAuc > singles[b].testAuc ? k : b), 0), none = { department: 'none', fielded: 'none', gateAuc: 0, testAuc: 0.5 };
  const sham = joined.length ? COUPLERS.find((c) => c.name === m.pick.chosen).learn(m.gateCols, shuffled(m.gy, SHUFFLE_SEED)) : m.pick.model, shamS = ds.testRows.map((_, k) => sham.predict(m.testCols.map((c) => c[k])));
  const routed = joined.length ? randomRoute(m.gateCols.map((c) => calibrate(c, m.gy)), m.testCols, ROUTE_SEED) : m.composed;
  const growth = relayed.map((_, k) => { const s = meshOf(relayed.slice(0, k + 1), ds); return { departments: k + 1, added: joined[k].name, took: joined[k].took.length, chosen: s.pick.chosen, testAuc: round6(auc(s.composed, testY)), composed: s.composed }; });
  const P = pooled(ds), boost = boosted(P, P.rows), logit = logistic(P, P.rows), boostS = ds.testRows.map((i) => boost.score(i));
  // organ 2i's rule, recorded beside it and not sealed: every live department joined, in the same relay order
  const r2i = live.length ? relayOf(ds, live) : { ok: true, departments: [] };
  if (!r2i.ok) throw new Error(r2i.error);
  const m2i = meshOf(r2i.departments.map((d) => d.col), ds);
  const growth2i = r2i.departments.map((d, k) => ({ departments: k + 1, added: d.name, testAuc: round6(auc(meshOf(r2i.departments.slice(0, k + 1).map((x) => x.col), ds).composed, testY)) }));
  // the frontier test: 1,200 cases in four batches; a missing or unreadable answer is scored as a coin (0.5)
  const at = new Map(ds.testRows.map((i, k) => [i, k])), rows = sampleOf(ds), y = rows.map((i) => ds.y[i]), meshS = rows.map((i) => m.composed[at.get(i)]);
  const answered = new Map(), files = [];
  for (let b = 0; b * BATCH < rows.length; b++) {
    const a = JSON.parse(read('data/llm/frontier-' + name + '-' + (b + 1) + '.json'));
    files.push({ batch: b + 1, promptMatches: a.prompt === sha256Hex(batchPrompt(ds, raw, b)).slice(0, 16), answered: a.calls.length, unreadable: a.calls.filter((c) => c.p === null).length });
    for (const c of a.calls) answered.set(c.row, c.p);
  }
  const front = rows.map((i) => (answered.get(i) ?? null) === null ? 0.5 : answered.get(i));
  const B = scrambleTest(ds), blind = await departments(B), bl = liveOf(blind), bg = bl.length ? grownOf(B, bl) : NONE, bm = meshOf(bg.ok ? bg.departments.filter((d) => d.joins).map((d) => d.col) : [], B);
  const known = [...ds.fitRows, ...ds.gateRows], ys = shuffled(known.map((i) => ds.y[i]), NOISE_SEED), yNoise = Uint8Array.from(ds.y);
  known.forEach((i, k) => { yNoise[i] = ys[k]; });
  const d0 = deps[0], bad = d0.genome.text.replace(/auc=0\.(\d)/, (_, x) => 'auc=0.' + (x === '6' ? '7' : '6'));
  const admitted = g.admitted;
  return {
    departments: deps.map((d) => ({ department: d.name, columns: d.view.features.length, gate: d.fielded.gate, fielded: d.fielded.kind, size: d.fielded.size, gateAuc: d.fielded.gateAuc, joinBound: d.join, state: d.state })),
    live: live.map((d) => d.name),
    steps: g.departments.map((d) => ({ department: d.name, took: d.took, columns: d.view.features.length, read: d.fielded.read, fielded: d.fielded.kind, size: d.fielded.size, gateAuc: d.fielded.gateAuc, before: d.before, with: d.with, lead: d.with === null ? null : round6(d.with - d.before), bound: d.bound, joins: d.joins })),
    admitted, refused: g.departments.filter((d) => !d.joins).map((d) => d.name),
    chosen: m.pick.chosen, outOfFold: m.pick.scored.map((s) => ({ coupling: s.name, gateAuc: round6(s.oof) })),
    cases: ds.testRows.length, outcomes: testY.reduce((a, v) => a + v, 0),
    composedAuc: round6(auc(m.composed, testY)), singles, best: singles[bestK] || none,
    vsBest: lead(m.composed, alone.testCols[bestK] || m.composed, testY), vsOneScore: lead(m.composed, one.composed, testY), oneScore: { chosen: one.pick.chosen, testAuc: round6(auc(one.composed, testY)) },
    vsShuffled: lead(m.composed, shamS, testY), vsRoute: lead(m.composed, routed, testY),
    growth: growth.map(({ composed, ...s }) => s), fullVsFirst: lead(m.composed, (growth[0] || m).composed, testY),
    monolith: { boosted: lead(m.composed, boostS, testY), logistic: lead(m.composed, ds.testRows.map((i) => logit.score(i)), testY) },
    asIn2i: { note: 'recorded beside the rule, not sealed: the mesh of organ 2i’s rule, every live department joined, in the same relay order', growth: growth2i, chosen: m2i.pick.chosen, composedAuc: round6(auc(m2i.composed, testY)), vs: lead(m.composed, m2i.composed, testY) },
    frontier: { model: JSON.parse(read('data/llm/frontier-' + name + '-1.json')).model, cases: rows.length, outcomes: y.reduce((a, v) => a + v, 0), sha: sha256Hex(JSON.stringify(rows)).slice(0, 16), batches: files, sameColumns: sameColumns(), vs: lead(meshS, front, y), pooledVs: lead(rows.map((i) => boostS[at.get(i)]), front, y) },
    ownColumnsOnly: deps.every((d) => Object.keys(d.view.cols).every((f) => ds.silos[short(d.name)].includes(f)))
      && g.departments.every((d, k) => d.view.features.every((f) => ds.silos[short(d.name)].includes(f) || (f.startsWith('sent_') && g.departments.slice(0, k).some((x) => x.joins && x.name === f.slice(5))))),
    testNeverRead: gateSide(blind, bg) === gateSide(deps, g) && bm.pick.chosen === m.pick.chosen && JSON.stringify(bm.pick.scored) === JSON.stringify(m.pick.scored),
    noiseLive: liveOf(await departments({ ...ds, y: yNoise })).map((d) => d.name),
    tamperRefused: bad !== d0.genome.text && !(await growNode(bad, d0.view)).ok,
  };
}

/** each fresh data file is the one downloaded, byte for byte (data/fresh6-sources.json; the seal pins that file) */
export const filesMatchSources = () => JSON.parse(read('data/fresh6-sources.json')).files.every((f) => fileHash(readFileSync(new URL(f.path, ROOT))) === f.sha256);

export async function measure() {
  if (!filesMatchSources()) throw new Error('a fresh data file is not the one data/fresh6-sources.json records');
  const out = { kind: 'dex-frontier.organ-2k.record', v: 1, settings: { live: 'beats a coin on GATE beyond the noise: the bound of its lead over 0.5 above 0', join: 'offered strongest first on GATE; joins only if the mesh’s out-of-fold GATE predictions with it lead those without it beyond the noise (the bound above ' + BEYOND + '); a department refused sends no score and holds no seat', relay: 'each department is sent the scores of the departments admitted before it (a rule body reads its own columns first and the senders that fit ' + MAXFEATS + '); a FIT case’s score from a body that never grew on it (' + RELAY_FOLDS + ' folds)', folds: FOLDS, trees: TREES, seed: SEED, bodies: BODIES, frontierCases: 1200, batch: BATCH }, filesMatchSources: true };
  for (const d of DOMAINS) out[d] = await domain(d);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-2k.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-2k/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-2k/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-2k/record.json', ROOT), text); console.log('wrote data/organ-2k/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
