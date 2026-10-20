#!/usr/bin/env node
// tools/judge-2.mjs — organ 2, the composition proof, judged by the rules sealed before any TEST case was scored.
//   --write → data/organ-2/verdict.json      --check → refuse on drift. A failed prediction is kept.
import { readFileSync, writeFileSync } from 'node:fs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const both = (r, f) => ['telco', 'shop'].every((d) => f(r[d], d));
const say = (r, f) => ['telco', 'shop'].map((d) => d + ': ' + f(r[d])).join('; ');
const L = (x) => x.a + ' vs ' + x.b + ', lead ' + x.lead + ', bound ' + x.low95;

export const RULES = {
  B1: (r) => ({ pass: both(r, (d) => d.testNeverRead === true && d.viewsOwnColumnsOnly === true && d.deterministic === true && d.answered === d.cases && d.noiseMeshLive.length === 0 && d.live.length >= 2),
    saw: say(r, (d) => d.live.length + ' of ' + d.nodes.length + ' nodes live (' + d.live.join(', ') + '); TEST never read while growing or coupling: ' + d.testNeverRead + '; each node held only its own silo’s columns: ' + d.viewsOwnColumnsOnly + '; the same mesh twice: ' + d.deterministic + '; ' + d.answered + ' of ' + d.cases + ' answered; nodes grown on shuffled outcomes that went live: ' + d.noiseMeshLive.length) }),
  B2: (r) => ({ pass: both(r, (d) => d.vsBest.low95 > 0), saw: say(r, (d) => 'composed against its best node on TEST (' + d.best.node + '): ' + L(d.vsBest)) }),
  B3: (r) => ({ pass: both(r, (d) => d.vsRoute.low95 > 0 && d.vsShuffled.low95 > 0), saw: say(r, (d) => 'against random routing ' + L(d.vsRoute) + '; against a coupling taught shuffled outcomes ' + L(d.vsShuffled)) }),
  B4: (r) => ({ pass: both(r, (d) => d.growth.every((g, k) => k === 0 || g.testAuc >= d.growth[k - 1].testAuc) && d.growth[d.growth.length - 1].testAuc - d.growth[0].testAuc >= 0.01),
    saw: say(r, (d) => d.growth.map((g) => g.nodes + ' node' + (g.nodes > 1 ? 's' : '') + ' ' + g.testAuc).join(' → ')) }),
  B5: (r) => ({ pass: both(r, (d) => d.monolith.boosted.vs.low95 > -0.02), saw: say(r, (d) => 'composed (' + d.meshNumbers + ' numbers) against the pooled boosted trees (' + d.monolith.boosted.numbers + ' numbers, every column in one place): ' + L(d.monolith.boosted.vs) + ' against −0.02') }),
  B6: (r) => ({ pass: both(r, (d) => d.local.vs.low95 > 0 && d.local.answered === 300 && d.local.longestPrompt < d.local.numCtx), saw: say(r, (d) => 'on the 300, composed against ' + d.local.model.name + ' shown 24 examples and every column: ' + L(d.local.vs) + ' (' + d.local.unreadable + ' unreadable)') }),
  B7: (r) => ({ pass: both(r, (d) => d.frontier.vs.low95 > -0.02 && d.frontier.answered === 300), saw: say(r, (d) => 'on the 300, composed against ' + d.frontier.model.name + ' (cold, all 300 at once): ' + L(d.frontier.vs) + ' against −0.02 (' + d.frontier.unreadable + ' unreadable)') }),
  B8: (r) => ({ pass: r.breadth.everyCaseReachesAllItsOwnLiveNodes === true && r.breadth.casesReachingTheOtherDomain === 0 && r.breadth.domainsPerNode === 1 && r.breadth.domainsCovered === 2,
    saw: r.breadth.cases + ' TEST cases of both domains in one unlabelled stream, ' + r.breadth.liveNodes + ' live nodes: every case reached all its own domain’s live nodes: ' + r.breadth.everyCaseReachesAllItsOwnLiveNodes + '; cases that reached the other domain’s: ' + r.breadth.casesReachingTheOtherDomain + '; domains any one node covers: ' + r.breadth.domainsPerNode + '; domains the mesh covers: ' + r.breadth.domainsCovered }),
};

export function judge(prereg, record) {
  return prereg.rules.map((rule) => {
    let v;
    try { v = RULES[rule.id] ? RULES[rule.id](record) : { pass: false, saw: 'no such rule in the judge' }; } catch (e) { v = { pass: false, saw: 'the record could not be read: ' + e.message }; }
    return { id: rule.id, kind: rule.kind, claim: rule.claim, pass: v.pass === true, saw: v.saw };
  });
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/judge-2.mjs');
if (isMain) {
  const pre = read('data/organ-2/prereg.json'), rec = read('data/organ-2/record.json'), verdicts = judge(JSON.parse(pre), JSON.parse(rec));
  const text = JSON.stringify({ kind: 'dex-frontier.organ-2.verdict', v: 1, prereg: sha256Hex(pre).slice(0, 16), record: sha256Hex(rec).slice(0, 16), verdicts }, null, 1) + '\n';
  let red = 0;
  for (const v of verdicts) { console.log((v.pass ? 'PASS ' : 'FAIL ') + v.id + (v.kind === 'prediction' ? ' (prediction)' : '') + ' · ' + v.saw); if (!v.pass && v.kind !== 'prediction') red++; }
  const failed = verdicts.filter((v) => !v.pass).map((v) => v.id);
  if (process.argv.includes('--write')) writeFileSync(new URL('data/organ-2/verdict.json', ROOT), text);
  if (process.argv.includes('--check') && read('data/organ-2/verdict.json') !== text) { console.log('VERDICT DRIFT · the committed verdict is not what the sealed rules give'); red++; }
  console.log((red ? 'RED · ' : 'JUDGED · ') + (failed.length ? failed.join(', ') + ' failed as sealed — kept' : 'every rule passed as sealed'));
  process.exit(red ? 1 : 0);
}
