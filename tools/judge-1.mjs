#!/usr/bin/env node
// tools/judge-1.mjs — organ 1, judged by the rules sealed before any contestant was asked.
//   --write → data/organ-1/verdict.json      --check → refuse on drift. A failed prediction is kept.
import { readFileSync, writeFileSync } from 'node:fs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

export const RULES = {
  A1: (r) => ({ pass: r.genome.bytes <= 400 && r.grown.state === 'live' && r.grown.gateAuc >= r.grown.bar && r.deterministic === true && r.testNeverRead === true && r.test.answered === r.test.cases && r.columns.length === 7,
    saw: 'a ' + r.genome.bytes + '-byte genome for the ' + r.columns.length + ' account columns grew ' + r.grown.rules + ' rules (' + r.grown.numbers + ' numbers) and is ' + r.grown.state + ' at gate AUC ' + r.grown.gateAuc + ' (bar ' + r.grown.bar + '); the same organism twice: ' + r.deterministic + '; TEST never read while growing: ' + r.testNeverRead + '; it answered ' + r.test.answered + ' of ' + r.test.cases + ' test customers' }),
  A2: (r) => ({ pass: r.local.vs.low95 > 0 && r.local.answered === 300 && r.local.longestPrompt < r.local.numCtx,
    saw: 'on the 300: the node ' + r.local.vs.a + ', ' + r.local.model.name + ' shown 24 examples and all 20 columns ' + r.local.vs.b + '; the node’s lead ' + r.local.vs.lead + ', its 95% lower bound ' + r.local.vs.low95 + ' (' + r.local.answered + ' answered, ' + r.local.unreadable + ' unreadable, longest prompt ' + r.local.longestPrompt + ' of ' + r.local.numCtx + ' tokens)' }),
  A3: (r) => ({ pass: r.frontier.vs.low95 > -0.02 && r.frontier.answered === 300,
    saw: 'on the 300: the node ' + r.frontier.vs.a + ', ' + r.frontier.model.name + ' (cold, all 300 at once, all 20 columns) ' + r.frontier.vs.b + '; the node’s lead ' + r.frontier.vs.lead + ', its 95% lower bound ' + r.frontier.vs.low95 + ' against −0.02 (' + r.frontier.unreadable + ' unreadable)' }),
};

export function judge(prereg, record) {
  return prereg.rules.map((rule) => {
    let v;
    try { v = RULES[rule.id] ? RULES[rule.id](record) : { pass: false, saw: 'no such rule in the judge' }; } catch (e) { v = { pass: false, saw: 'the record could not be read: ' + e.message }; }
    return { id: rule.id, kind: rule.kind, claim: rule.claim, pass: v.pass === true, saw: v.saw };
  });
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/judge-1.mjs');
if (isMain) {
  const pre = read('data/organ-1/prereg.json'), rec = read('data/organ-1/record.json'), verdicts = judge(JSON.parse(pre), JSON.parse(rec));
  const text = JSON.stringify({ kind: 'dex-frontier.organ-1.verdict', v: 1, prereg: sha256Hex(pre).slice(0, 16), record: sha256Hex(rec).slice(0, 16), verdicts }, null, 1) + '\n';
  let red = 0;
  for (const v of verdicts) { console.log((v.pass ? 'PASS ' : 'FAIL ') + v.id + (v.kind === 'prediction' ? ' (prediction)' : '') + ' · ' + v.saw); if (!v.pass && v.kind !== 'prediction') red++; }
  const failed = verdicts.filter((v) => !v.pass).map((v) => v.id);
  if (process.argv.includes('--write')) writeFileSync(new URL('data/organ-1/verdict.json', ROOT), text);
  if (process.argv.includes('--check') && read('data/organ-1/verdict.json') !== text) { console.log('VERDICT DRIFT · the committed verdict is not what the sealed rules give'); red++; }
  console.log((red ? 'RED · ' : 'JUDGED · ') + (failed.length ? failed.join(', ') + ' failed as sealed — kept' : 'every rule passed as sealed'));
  process.exit(red ? 1 : 0);
}
