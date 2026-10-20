#!/usr/bin/env node
// tools/words.mjs — every number and every result-dependent sentence on the page, written from the committed records,
// never by hand (one kernel: a fact lives in its record, the page reads it). A span <span data-r="2:telco.composedAuc|3">
// gets organ 2's record value at that path, to 3 places; |n groups a whole number (en-GB); data-v="2:B2" gets "held" or
// "failed"; <!-- w:name --> … <!-- /w:name --> blocks get a generated paragraph. An organ not yet measured reads "…".
//   node tools/words.mjs [--write|--check]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { copy } from './copy.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const has = (p) => existsSync(new URL(p, ROOT));
export const ORGANS = ['1', '2', '2b', '3', '4', '5', '6', '7'];

/** every judged organ's record and verdict */
export function records() {
  return Object.fromEntries(ORGANS.filter((k) => has('data/organ-' + k + '/verdict.json')).map((k) => [k, { r: JSON.parse(read('data/organ-' + k + '/record.json')), v: JSON.parse(read('data/organ-' + k + '/verdict.json')).verdicts }]));
}

/** a record value at a dotted path */
export function at(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }

/** a value as the page prints it */
export function format(v, f) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return typeof v === 'string' ? v : '…';
  if (f === 'n') return v.toLocaleString('en-GB');
  if (f === 's') return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(3);
  const d = Number(f);
  return Number.isInteger(d) ? v.toFixed(d) : String(v);
}

/** the tally across every judged organ */
export function tally(R = records()) {
  const vs = Object.values(R).flatMap((x) => x.v);
  return { held: vs.filter((v) => v.pass).length + ' of ' + vs.length, tests: String(Object.keys(R).length), failed: String(vs.filter((v) => !v.pass && v.kind === 'prediction').length), red: String(vs.filter((v) => !v.pass && v.kind !== 'prediction').length) };
}

const pass = (R, k, id) => { const x = R[k] && R[k].v.find((v) => v.id === id); return x ? x.pass : null; };

/** the generated paragraphs */
export function blocks(R = records()) {
  const out = {};
  if (R['2']) {
    const r = R['2'].r, b2 = (d) => r[d].vsBest.low95 > 0;
    const where = ['telco', 'shop'].filter(b2), name = { telco: 'the telco customers', shop: 'the shop sessions' };
    out.verdict2 = '<p class="answer"><b>The verdict on the gate.</b> ' + (where.length === 2 ? 'Composition held in both domains: the coupled mesh beat its best single node beyond the noise on ' + name.telco + ' and on ' + name.shop + '. By the spec’s own rule, the build may scale.'
      : where.length === 1 ? 'Composition held on ' + name[where[0]] + ' and did not on ' + name[where[0] === 'telco' ? 'shop' : 'telco'] + ': there, the coupled mesh did not beat its best single node beyond the noise. The sealed prediction (B2) failed and is kept. By the spec’s own rule, the next organ fixes composition before anything scales.'
        : 'Composition did not hold: in neither domain did the coupled mesh beat its best single node beyond the noise. The sealed prediction (B2) failed and is kept. By the spec’s own rule, nothing scales; the next organ fixes composition.') + '</p>';
  } else out.verdict2 = '<p class="answer"><b>Sealed, being measured.</b> The rules were committed before a single TEST case was scored. The 14B is answering on this laptop’s processor, one case at a time; the frontier model has answered. This fills in from the record when it is judged.</p>';
  if (R['1']) {
    const r = R['1'].r;
    out.verdict1 = '<p class="answer"><b>The verdict.</b> The billing department’s node, seeing 7 of the 20 columns, ' + (pass(R, '1', 'A2') ? 'beat' : 'did not beat') + ' the 14B that saw all 20 beyond the noise (' + format(r.local.vs.a, 3) + ' against ' + format(r.local.vs.b, 3) + ', bound ' + format(r.local.vs.low95, 3) + '), and it ' + (pass(R, '1', 'A3') ? 'held within 0.02 of' : 'fell more than 0.02 behind') + ' the frontier model (' + format(r.frontier.vs.b, 3) + ', bound ' + format(r.frontier.vs.low95, 3) + '). ' + (R['1'].v.every((v) => v.pass) ? 'Every sealed rule held.' : R['1'].v.filter((v) => !v.pass).map((v) => v.id).join(', ') + ' failed as sealed, and is kept.') + '</p>';
  } else out.verdict1 = '<p class="answer"><b>Sealed, being measured.</b> This fills in from the record when it is judged.</p>';
  return { ...out, ...later(R), ...copy(R, { pass, format }) };
}

/** the verdict paragraphs of the organs after the gate */
function later(R) {
  const f = (x) => format(x, 3), held = (k) => R[k].v.filter((v) => !v.pass).map((v) => v.id), tail = (k) => (held(k).length ? ' ' + held(k).join(', ') + ' failed as sealed, and is kept.' : ' Every sealed rule held.');
  const P = (k, s) => '<p class="answer"><b>The verdict.</b> ' + s + tail(k) + '</p>';
  const wait = (k) => '<p class="dim">' + (k === '2b' ? 'Not taken: it runs only if organ 2 finds that composition does not net.' : 'Built and waiting: by the spec’s order it is sealed only after organ 2 is judged.') + '</p>';
  const out = {};
  out.verdict2b = R['2b'] ? P('2b', 'Co-grown, the mesh scored ' + f(R['2b'].r.telco.coAuc) + ' (telecom) and ' + f(R['2b'].r.shop.coAuc) + ' (shop), against ' + f(R['2b'].r.telco.vsBest.b) + ' and ' + f(R['2b'].r.shop.vsBest.b) + ' for the best single node. It ' + (pass(R, '2b', 'H2') ? 'beat the best node beyond the noise in both domains: composition, retaken, holds.' : 'did not beat the best node beyond the noise in both domains.')) : wait('2b');
  out.verdict3 = R['3'] ? P('3', R['3'].r.telco.silos.concat(R['3'].r.shop.silos).reduce((a, s) => a + s.born, 0) + ' children were born through the gate and ' + R['3'].r.telco.silos.concat(R['3'].r.shop.silos).reduce((a, s) => a + s.refused, 0) + ' were refused. On TEST the bred mesh scored ' + f(R['3'].r.telco.bredMeshAuc) + ' and ' + f(R['3'].r.shop.bredMeshAuc) + ', against ' + f(R['3'].r.telco.firstMeshAuc) + ' and ' + f(R['3'].r.shop.firstMeshAuc) + ' for organ 2’s mesh.') : wait('3');
  out.verdict4 = R['4'] ? P('4', 'As records arrived, the mesh went from ' + f(R['4'].r.telco.firstToLast.from) + ' to ' + f(R['4'].r.telco.firstToLast.to) + ' on the telecom test cases and from ' + f(R['4'].r.shop.firstToLast.from) + ' to ' + f(R['4'].r.shop.firstToLast.to) + ' on the shop’s.') : wait('4');
  out.verdict5 = R['5'] ? P('5', 'When the strongest node went bad half-way, the frozen mesh fell to ' + f(R['5'].r.telco.broken.frozenLate) + ' (telecom) and ' + f(R['5'].r.shop.broken.frozenLate) + ' (shop) on the rest of the stream; the wisp, learning and pruning, held ' + f(R['5'].r.telco.broken.wispLate) + ' and ' + f(R['5'].r.shop.broken.wispLate) + '. With no break, learning scored ' + f(R['5'].r.telco.calm.learningLate) + ' and ' + f(R['5'].r.shop.calm.learningLate) + ' against ' + f(R['5'].r.telco.calm.frozenLate) + ' and ' + f(R['5'].r.shop.calm.frozenLate) + ' frozen.') : wait('5');
  out.verdict6 = R['6'] ? P('6', 'Cut finer, ' + R['6'].r.telco.live.length + ' and ' + R['6'].r.shop.live.length + ' nodes went live. The fine mesh scored ' + f(R['6'].r.telco.fineAuc) + ' and ' + f(R['6'].r.shop.fineAuc) + ', against ' + f(R['6'].r.telco.coarseAuc) + ' and ' + f(R['6'].r.shop.coarseAuc) + ' for organ 2’s coarse mesh and ' + f(R['6'].r.telco.vsMonolith.b) + ' and ' + f(R['6'].r.shop.vsMonolith.b) + ' for every record pooled.') : wait('6');
  out.verdict7 = R['7'] ? P('7', 'Every live node went out as a card and came back to grow the identical node; a card from an untrusted maker and a changed card were refused. One answer crosses as ' + R['7'].r.telco.answer.numbers + ' scores (' + R['7'].r.telco.answer.bytes + ' bytes) for the telecom mesh and ' + R['7'].r.shop.answer.numbers + ' (' + R['7'].r.shop.answer.bytes + ' bytes) for the shop’s.') : wait('7');
  return out;
}

/** the page with every generated number, word and block written in */
export function render(html, R = records()) {
  const t = tally(R);
  for (const [k, v] of Object.entries(t)) html = html.replace(new RegExp('(data-tally="' + k + '">)[^<]*(<)', 'g'), '$1' + v + '$2');
  html = html.replace(/(data-r="([0-9]+):([^"|]+)(?:\|([a-z0-9]+))?">)[^<]*(<)/g, (m, open, k, path, f, close) => open + (R[k] ? format(at(R[k].r, path), f) : '…') + close);
  html = html.replace(/(data-v="([0-9]+):([A-Z][0-9]+)">)[^<]*(<)/g, (m, open, k, id, close) => open + (pass(R, k, id) === null ? '…' : pass(R, k, id) ? 'held' : 'failed') + close);
  for (const [k, v] of Object.entries(blocks(R))) html = html.replace(new RegExp('(<!-- w:' + k + ' -->)[\\s\\S]*?(<!-- /w:' + k + ' -->)'), '$1' + v + '$2');
  return html.replace(/(<meta name="description" content="[^"]*?)[0-9]+ of [0-9]+( sealed rules held)/, '$1' + t.held + '$2');
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/words.mjs');
if (isMain) {
  const html = read('index.html'), out = render(html), t = tally();
  console.log('sealed rules held ' + t.held + ' across ' + t.tests + ' judged organs · ' + t.failed + ' predictions failed · ' + t.red + ' red');
  if (process.argv.includes('--write')) { writeFileSync(new URL('index.html', ROOT), out); console.log('wrote the words into index.html'); }
  if (process.argv.includes('--check') && out !== html) { console.log('WORDS DRIFT · the page does not say what the records say — run node tools/words.mjs --write'); process.exit(1); }
}
