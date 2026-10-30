#!/usr/bin/env node
// tools/diagnose-8.mjs — after diagnose-7 found that a join on any gain at all admits every department of organ 2i (so it
// would not have changed the news articles' mesh, whose sixth department rose GATE by 0.0013 and lowered TEST by 0.0011),
// the next candidate: the relay and the join as one step, a department joining only on a lead beyond the noise
// (src/grow.mjs: the paired bootstrap's 95% lower bound of the mesh's out-of-fold GATE lead, with it against without it,
// above 0; a department refused sends no score and holds no seat). Before any seal, this asks only what that rule does,
// on FIT and GATE alone: on organ 2i's own departments, fielded and ordered exactly as tools/measure-2i.mjs fields and
// orders them, which departments it admits, and each one's lead and bound. TEST is never read: no TEST case is scored,
// scrambling every TEST record leaves this record unchanged, and it says so. These domains' TEST scores were seen in
// organ 2i, so nothing here is a fresh test of the rule; that needs a domain no organ has scored.
// Deterministic:  node tools/diagnose-8.mjs [--check] → data/diagnose-8.json
import { writeFileSync } from 'node:fs';
import { linear, trees } from '../src/select.mjs';
import { grow, chosenOof, BEYOND } from '../src/grow.mjs';
import { growKind, scoreKind } from '../src/bodies.mjs';
import { round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { departments, fieldOn, FOLDS, RELAY_FOLDS, SEED } from './measure-2i.mjs';
import { DOMAINS, load } from './contest-2i.mjs';

const COUPLERS = [linear, trees(TREES)];
const liveOf = (deps) => deps.filter((d) => d.state === 'live').sort((a, b) => b.fielded.gateAuc - a.fielded.gateAuc || (a.name < b.name ? -1 : 1));

/** the rule on one domain's live departments, strongest first; a department sent no score fields what it fielded alone */
export function grown(ds, live) {
  const alone = new Map(live.map((d) => [d.view.features.join(), d.fielded]));
  return grow({ order: live.map((d) => d.name), viewOf: (name) => live.find((d) => d.name === name).view, field: (view) => alone.get(view.features.join()) || fieldOn(ds, view),
    grow: (view, rows, f) => growKind(f.kind, view, rows, SEED), score: scoreKind, mesh: (cols, gy) => chosenOof(COUPLERS, cols, gy, FOLDS),
    y: ds.y, fitRows: ds.fitRows, gateRows: ds.gateRows, otherRows: [], n: ds.n, folds: RELAY_FOLDS, max: Number.MAX_SAFE_INTEGER });
}

async function domain(ds) {
  const live = liveOf(await departments(ds)), g = live.length ? grown(ds, live) : { ok: true, departments: [], admitted: [] };
  if (!g.ok) throw new Error(g.error);
  return {
    offered: live.map((d) => d.name),
    steps: g.departments.map((d) => ({ department: d.name, took: d.took, fielded: d.fielded.kind, gateAlone: d.fielded.gateAuc, before: d.before, with: d.with, lead: d.with === null ? null : round6(d.with - d.before), bound: d.bound, joins: d.joins })),
    admitted: g.admitted, refused: g.departments.filter((d) => !d.joins).map((d) => d.name),
    changes: g.admitted.length !== live.length,
  };
}

export async function diagnose() {
  const out = { kind: 'dex-frontier.diagnose-8', v: 1, rule: 'the relay and the join as one step: a department joins only if the mesh’s out-of-fold GATE predictions with it lead those without it (at first, a coin) beyond the noise, the paired bootstrap’s 95% lower bound above ' + BEYOND + ' (src/grow.mjs); a department refused sends no score and holds no seat; FIT and GATE only', folds: FOLDS, relayFolds: RELAY_FOLDS };
  for (const d of DOMAINS) out[d] = await domain(load(d).ds);
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(load('news').ds))) === JSON.stringify(out.news);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/diagnose-8.mjs');
if (isMain) {
  const t0 = Date.now(), text = JSON.stringify(await diagnose(), null, 1) + '\n';
  if (process.argv.includes('--check')) { if (read('data/diagnose-8.json') !== text) { console.log('DIAGNOSE-8 MISMATCH'); process.exit(1); } console.log('DIAGNOSE-8 REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/diagnose-8.json', import.meta.url), text); console.log('wrote data/diagnose-8.json · ' + sha256Hex(text).slice(0, 16) + ' · ' + Math.round((Date.now() - t0) / 1000) + ' s'); }
}
