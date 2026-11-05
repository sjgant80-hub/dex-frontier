#!/usr/bin/env node
// tools/diagnose-9.mjs — organ 3 (breeding) redesigned on the mechanism that held the gate, asked before any seal what it
// would do, on FIT and GATE alone. Organ 3 was built for the telecom and shop data (src/population.mjs: six-rule nodes,
// a child born if it beats both parents on GATE), whose test cases have been scored many times since; the mechanism that
// held the gate on two fresh domains (organs 2j and 2k, src/grow.mjs) fields one of five bodies per department and seats
// a department only beyond the noise. Here each department, at its turn in the relay, also breeds (src/breed.mjs): four
// founders of the rule kind that did best for it on GATE, grown from four contributors' seeds on three quarters of FIT;
// three generations of four breedings; a child born only if it leads its better parent beyond the noise on the last
// quarter of FIT, which no founder and no child grew on, so birth never spends GATE. The champion, re-expressed on all of
// FIT, is fielded only if it beats the department's five bodies on GATE, as any body must. Asked, on organ 2j's and
// 2k's own domains: how many children are born; whether a champion's lead over its best founder survives on GATE, which
// birth never saw; whether any department fields it; and whether the mesh grown this way leads organ 2j's mesh on GATE
// out of fold. TEST is never read: no TEST case is scored, scrambling every TEST record leaves the record unchanged, and
// it says so. These domains' TEST scores were seen in organs 2j and 2k, so nothing here is a fresh test of breeding:
// that needs a dataset no organ has scored, and it is sealed before it is measured.
// Deterministic:  node tools/diagnose-9.mjs [--check] → data/diagnose-9.json
import { writeFileSync } from 'node:fs';
import { linear, trees } from '../src/select.mjs';
import { grow, chosenOof, BEYOND } from '../src/grow.mjs';
import { growKind, scoreKind, RULE_KINDS } from '../src/bodies.mjs';
import { evolve, express, BEYOND as BIRTH } from '../src/breed.mjs';
import { lead } from '../src/stats.mjs';
import { auc, round6, splitRows } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { departments, fieldOn, FOLDS, RELAY_FOLDS, SEED } from './measure-2i.mjs';
import { load as load2j } from './contest-2j.mjs';
import { load as load2k } from './contest-2k.mjs';

export const BREED = { founders: [1, 2, 3, 4], generations: 3, attempts: 4, check: 1 / 4, resamples: 2000, splitSeed: SEED + 8 };
const COUPLERS = [linear, trees(TREES)], KINDS = Object.keys(RULE_KINDS);
const liveOf = (deps) => deps.filter((d) => d.state === 'live').sort((a, b) => b.fielded.gateAuc - a.fielded.gateAuc || (a.name < b.name ? -1 : 1));

/** a department's turn, with breeding: its five bodies as organ 2j fields them, plus the champion its population breeds */
export function fieldBred(ds, view, log) {
  const base = fieldOn(ds, view), kind = KINDS.reduce((b, k) => (base.gate[k] > base.gate[b] ? k : b), KINDS[0]);
  const { rest, held } = splitRows(view, ds.fitRows, BREED.check, BREED.splitSeed);
  const e = evolve({ kind, view, growRows: rest, checkRows: held, founders: BREED.founders, generations: BREED.generations, attempts: BREED.attempts, resamples: BREED.resamples, seed: SEED });
  if (!e.ok) throw new Error(e.error);
  const gy = ds.gateRows.map((i) => ds.y[i]), on = (b) => ds.gateRows.map((i) => scoreKind(b, view, i));
  const champ = express(kind, e.champion.genomes, view, ds.fitRows), founder = express(kind, e.bestFounder.genomes, view, ds.fitRows);
  const cs = on(champ), fs = on(founder), champGate = round6(auc(cs, gy)), bred = champGate > base.gateAuc;
  log.set(view.features.join(), { bred: kind, founders: e.founders, born: e.born, refused: e.refused, checkHistory: e.history, lineage: e.lineage.map((l) => ({ child: l.child, parents: l.parents, check: l.check, bound: l.bound })),
    champion: e.champion.id, bestFounder: e.bestFounder.id, championGate: champGate, bestFounderGate: round6(auc(fs, gy)), championVsFounderOnGate: e.champion.id === e.bestFounder.id ? null : lead(cs, fs, gy),
    fiveBodies: base.gate, fieldedAlone: base.kind, fieldedAloneGate: base.gateAuc, fieldsBred: bred });
  return bred ? { kind: 'bred', rule: kind, genomes: e.champion.genomes, body: champ, gate: { ...base.gate, bred: champGate }, gateAuc: champGate } : base;
}

/** the mesh grown by organ 2j's rule over the live departments, each turn fielded by `field` */
function meshOf(ds, live, field) {
  return grow({ order: live.map((d) => d.name), viewOf: (name) => live.find((d) => d.name === name).view, field,
    grow: (view, rows, f) => (f.kind === 'bred' ? express(f.rule, f.genomes, view, rows) : growKind(f.kind, view, rows, SEED)), score: scoreKind, mesh: (cols, gy) => chosenOof(COUPLERS, cols, gy, FOLDS),
    y: ds.y, fitRows: ds.fitRows, gateRows: ds.gateRows, otherRows: [], n: ds.n, folds: RELAY_FOLDS, max: Number.MAX_SAFE_INTEGER });
}
const oofOf = (ds, g) => { const gy = ds.gateRows.map((i) => ds.y[i]), seats = g.departments.filter((d) => d.joins).map((d) => ds.gateRows.map((i) => d.col[i])); return seats.length ? chosenOof(COUPLERS, seats, gy, FOLDS) : gy.map(() => 0.5); };

export async function domain(ds) {
  const live = liveOf(await departments(ds)), alone = new Map(live.map((d) => [d.view.features.join(), d.fielded])), log = new Map();
  const asIn2j = meshOf(ds, live, (view) => alone.get(view.features.join()) || fieldOn(ds, view)), bred = meshOf(ds, live, (view) => fieldBred(ds, view, log));
  if (!asIn2j.ok || !bred.ok) throw new Error(asIn2j.error || bred.error);
  const gy = ds.gateRows.map((i) => ds.y[i]), a = oofOf(ds, bred), b = oofOf(ds, asIn2j), same = JSON.stringify(a) === JSON.stringify(b);
  return {
    offered: live.map((d) => d.name),
    steps: bred.departments.map((d) => ({ department: d.name, took: d.took, ...log.get(d.view.features.join()), fielded: d.fielded.kind === 'bred' ? 'bred ' + d.fielded.rule : d.fielded.kind, before: d.before, with: d.with, bound: d.bound, joins: d.joins })),
    admitted: { bred: bred.admitted, asIn2j: asIn2j.admitted },
    meshOnGate: { bred: round6(auc(a, gy)), asIn2j: round6(auc(b, gy)), identical: same, lead: same ? null : lead(a, b, gy) },
  };
}

export async function diagnose() {
  const out = { kind: 'dex-frontier.diagnose-9', v: 1, rule: 'organ 2j’s mechanism (src/grow.mjs, a seat only if the mesh leads beyond the noise, bound above ' + BEYOND + '), each department also breeding at its turn (src/breed.mjs): ' + BREED.founders.length + ' founders of its best rule kind on GATE, grown on ' + (1 - BREED.check) * 100 + '% of FIT; ' + BREED.generations + ' generations of ' + BREED.attempts + ' breedings; a child born only if it leads its better parent beyond the noise (bound above ' + BIRTH + ', ' + BREED.resamples + ' resamples) on the other ' + BREED.check * 100 + '% of FIT; the champion, re-expressed on all of FIT, fielded only if it beats the five bodies on GATE; FIT and GATE only', breed: BREED, folds: FOLDS, relayFolds: RELAY_FOLDS };
  out.health = await domain(load2j('health').ds);
  out.dropout = await domain(load2k('dropout').ds);
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(load2k('dropout').ds))) === JSON.stringify(out.dropout);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/diagnose-9.mjs');
if (isMain) {
  const t0 = Date.now(), text = JSON.stringify(await diagnose(), null, 1) + '\n';
  if (process.argv.includes('--check')) { if (read('data/diagnose-9.json') !== text) { console.log('DIAGNOSE-9 MISMATCH'); process.exit(1); } console.log('DIAGNOSE-9 REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/diagnose-9.json', import.meta.url), text); console.log('wrote data/diagnose-9.json · ' + sha256Hex(text).slice(0, 16) + ' · ' + Math.round((Date.now() - t0) / 1000) + ' s'); }
}
