#!/usr/bin/env node
// tools/diagnose-7.mjs — after organ 2i: the mesh beat the frontier model on both fresh domains, yet on the news articles
// the sixth department to join lowered TEST (R4 failed, so the gate did). The candidate fix is a join rule
// (src/join.mjs): a department enters the mesh only if the mesh's out-of-fold score on GATE, coupled with it, is at least
// the score without it. Before any seal, this asks only what the rule would do, on FIT and GATE alone: on organ 2i's own
// departments and relay (built exactly as tools/measure-2i.mjs builds them), the out-of-fold GATE score of every prefix of
// the relay (the mesh 2i grew) and the departments the rule admits. TEST is never read: scrambling every news TEST record leaves
// this record unchanged, and it says so. These domains' TEST scores were seen in organ 2i, so nothing here can be a fresh
// test of the rule — a seal on them would predict what is already known; that needs a domain no organ has scored.
// Deterministic:  node tools/diagnose-7.mjs [--check] → data/diagnose-7.json
import { writeFileSync } from 'node:fs';
import { linear, trees, oofAuc } from '../src/select.mjs';
import { admit } from '../src/join.mjs';
import { round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { departments, relayOf, FOLDS } from './measure-2i.mjs';
import { DOMAINS, load } from './contest-2i.mjs';

const COUPLERS = [linear, trees(TREES)];
/** the mesh's out-of-fold score on GATE: the better coupling's, as src/select.mjs choose() picks it */
export const gateOof = (cols, y) => Math.max(...COUPLERS.map((c) => oofAuc(c, cols, y, FOLDS)));
/** measure-2i's live departments, strongest on GATE first (a tie alphabetical) — the same order its relay runs */
const liveOf = (deps) => deps.filter((d) => d.state === 'live').sort((a, b) => b.fielded.gateAuc - a.fielded.gateAuc || (a.name < b.name ? -1 : 1));

async function domain(ds) {
  const deps = await departments(ds), live = liveOf(deps), r = live.length ? relayOf(ds, live) : { ok: true, departments: [] };
  if (!r.ok) throw new Error(r.error);
  const gy = ds.gateRows.map((i) => ds.y[i]), cols = r.departments.map((d) => ds.gateRows.map((i) => d.col[i]));
  const prefixes = cols.map((_, k) => ({ departments: k + 1, added: r.departments[k].name, gateOof: round6(gateOof(cols.slice(0, k + 1), gy)) }));
  const a = admit(cols, gy, gateOof);
  return {
    relay: r.departments.map((d) => d.name),
    allJoin: prefixes,
    rule: { admitted: a.admitted.map((k) => r.departments[k].name), keptOut: r.departments.filter((_, k) => !a.admitted.includes(k)).map((d) => d.name), steps: a.steps.map((s) => ({ department: r.departments[s.k].name, before: round6(s.before), with: s.oof === null ? null : round6(s.oof), joins: s.joins })), gateOof: round6(a.oof) },
    changes: a.admitted.length !== cols.length,
  };
}

export async function diagnose() {
  const out = { kind: 'dex-frontier.diagnose-7', v: 1, rule: 'a department joins only if the mesh’s out-of-fold GATE score with it is at least the score without it (src/join.mjs); FIT and GATE only', folds: FOLDS };
  for (const d of DOMAINS) out[d] = await domain(load(d).ds);
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(load('news').ds))) === JSON.stringify(out.news);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/diagnose-7.mjs');
if (isMain) {
  const t0 = Date.now(), text = JSON.stringify(await diagnose(), null, 1) + '\n';
  if (process.argv.includes('--check')) { if (read('data/diagnose-7.json') !== text) { console.log('DIAGNOSE-7 MISMATCH'); process.exit(1); } console.log('DIAGNOSE-7 REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/diagnose-7.json', import.meta.url), text); console.log('wrote data/diagnose-7.json · ' + sha256Hex(text).slice(0, 16) + ' · ' + Math.round((Date.now() - t0) / 1000) + ' s'); }
}
