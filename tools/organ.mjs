// tools/organ.mjs — the seal → judge plumbing every organ after the gate shares (organs 1 and 2 keep their own pinned copies):
// seal(k, prereg) writes data/organ-k/prereg.json with every pinned file's bytes; judgeMain(k, RULES) judges the record
// by the sealed rules, prints each verdict, and --write / --check the verdict. A failed prediction is kept; a failed
// property turns it red.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { pin } from './order.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const BASE = ['src/silos.mjs', 'src/node.mjs', 'src/compose.mjs', 'src/stats.mjs', 'vendor/living-seed/src/genome.mjs', 'vendor/living-seed/src/germinate.mjs', 'vendor/living-seed/vendor/seed-library/seedlib.mjs',
  'vendor/living-seed/vendor/seed-library/sha256.mjs', 'vendor/living-seed/vendor/keys/keys.mjs', 'vendor/living-seed/vendor/keys/canon.mjs', 'data/telco-churn.csv', 'data/online_shoppers_intention.csv',
  'tools/mesh.mjs', 'tools/organ.mjs', 'tools/order.mjs', 'tools/measure-1.mjs'];

export function seal(k, prereg, files) {   // k: an organ number, or '2b'
  const all = [...new Set([...BASE, ...files, 'tools/measure-' + k + '.mjs', 'tools/judge-' + k + '.mjs', 'tools/seal-' + k + '.mjs'])];
  const out = { kind: 'dex-frontier.organ-' + k + '.prereg', v: 1, ...prereg, judgedBy: 'tools/judge-' + k + '.mjs (pinned below)', files: pin(all) };
  mkdirSync(new URL('data/organ-' + k + '/', ROOT), { recursive: true });
  writeFileSync(new URL('data/organ-' + k + '/prereg.json', ROOT), JSON.stringify(out, null, 1) + '\n');
  console.log('sealed data/organ-' + k + '/prereg.json · ' + out.rules.length + ' rules (' + out.rules.filter((r) => r.kind === 'prediction').length + ' predictions) · ' + all.length + ' files pinned');
}

export function judge(prereg, record, RULES) {
  return prereg.rules.map((rule) => {
    let v;
    try { v = RULES[rule.id] ? RULES[rule.id](record) : { pass: false, saw: 'no such rule in the judge' }; } catch (e) { v = { pass: false, saw: 'the record could not be read: ' + e.message }; }
    return { id: rule.id, kind: rule.kind, claim: rule.claim, pass: v.pass === true, saw: v.saw };
  });
}

export function judgeMain(k, RULES) {
  const pre = read('data/organ-' + k + '/prereg.json'), rec = read('data/organ-' + k + '/record.json'), verdicts = judge(JSON.parse(pre), JSON.parse(rec), RULES);
  const text = JSON.stringify({ kind: 'dex-frontier.organ-' + k + '.verdict', v: 1, prereg: sha256Hex(pre).slice(0, 16), record: sha256Hex(rec).slice(0, 16), verdicts }, null, 1) + '\n';
  let red = 0;
  for (const v of verdicts) { console.log((v.pass ? 'PASS ' : 'FAIL ') + v.id + (v.kind === 'prediction' ? ' (prediction)' : '') + ' · ' + v.saw); if (!v.pass && v.kind !== 'prediction') red++; }
  const failed = verdicts.filter((v) => !v.pass).map((v) => v.id);
  if (process.argv.includes('--write')) writeFileSync(new URL('data/organ-' + k + '/verdict.json', ROOT), text);
  if (process.argv.includes('--check') && read('data/organ-' + k + '/verdict.json') !== text) { console.log('VERDICT DRIFT · the committed verdict is not what the sealed rules give'); red++; }
  console.log((red ? 'RED · ' : 'JUDGED · ') + (failed.length ? failed.join(', ') + ' failed as sealed — kept' : 'every rule passed as sealed'));
  process.exit(red ? 1 : 0);
}

export const isMain = (url, name) => process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/' + name);
export const both = (r, f) => ['telco', 'shop'].every((d) => f(r[d], d));
export const say = (r, f) => ['telco', 'shop'].map((d) => d + ': ' + f(r[d])).join('; ');
export const L = (x) => x.a + ' vs ' + x.b + ', lead ' + x.lead + ', bound ' + x.low95;
