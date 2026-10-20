#!/usr/bin/env node
// tools/words.mjs — every number and every result-dependent sentence on the page, written from the committed records,
// never by hand (one kernel: a fact lives in its record, the page reads it). A span <span data-r="2:telco.composedAuc|3">
// gets organ 2's record value at that path, to 3 places; |n groups a whole number (en-GB); data-v="2:B2" gets "held" or
// "failed"; <!-- w:name --> … <!-- /w:name --> blocks get a generated paragraph. An organ not yet measured reads "…".
//   node tools/words.mjs [--write|--check]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { copy } from './copy.mjs';
import { format } from './format.mjs';
export { format };

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const has = (p) => existsSync(new URL(p, ROOT));
export const ORGANS = ['1', '2', '2b', '2c', '2d', '2e', '3', '4', '5', '6', '7'];

/** every judged organ's record and verdict */
export function records() {
  return Object.fromEntries(ORGANS.filter((k) => has('data/organ-' + k + '/verdict.json')).map((k) => [k, { r: JSON.parse(read('data/organ-' + k + '/record.json')), v: JSON.parse(read('data/organ-' + k + '/verdict.json')).verdicts }]));
}

/** a record value at a dotted path */
export function at(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }

/** the tally across every judged organ */
export function tally(R = records()) {
  const vs = Object.values(R).flatMap((x) => x.v);
  const sealed = Object.keys(JSON.parse(has('data/organs.json') ? read('data/organs.json') : '{}')).length, n = Object.keys(R).length, failed = vs.filter((v) => !v.pass && v.kind === 'prediction').length;
  return { line: n ? vs.filter((v) => v.pass).length + ' of ' + vs.length + ' sealed rules held across ' + n + ' measured organ' + (n === 1 ? '' : 's') : sealed + ' organs sealed before a single test case was scored · being measured',
    fails: n ? failed + ' prediction' + (failed === 1 ? '' : 's') + ' failed · every one kept' : 'every prediction may fail, and is kept if it does',
    held: vs.filter((v) => v.pass).length + ' of ' + vs.length, tests: String(Object.keys(R).length), failed: String(failed), red: String(vs.filter((v) => !v.pass && v.kind !== 'prediction').length) };
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
    out.verdict1 = '<p class="answer"><b>The verdict.</b> The billing department’s node, seeing 7 of the 20 columns, ' + (pass(R, '1', 'A2') ? 'beat' : 'did not beat') + ' the 14B that saw all 20 beyond the noise (' + format(r.local.vs.a, 3) + ' against ' + format(r.local.vs.b, 3) + ', bound ' + format(r.local.vs.low95, 's') + '), and it ' + (pass(R, '1', 'A3') ? 'held within 0.02 of' : 'fell more than 0.02 behind') + ' the frontier model (' + format(r.frontier.vs.b, 3) + ', bound ' + format(r.frontier.vs.low95, 's') + '). ' + (R['1'].v.every((v) => v.pass) ? 'Every sealed rule held.' : R['1'].v.filter((v) => !v.pass).map((v) => v.id).join(', ') + ' failed as sealed, and ' + (R['1'].v.filter((v) => !v.pass).length > 1 ? 'are' : 'is') + ' kept.') + '</p>';
  } else out.verdict1 = '<p class="answer"><b>Sealed, being measured.</b> This fills in from the record when it is judged.</p>';
  return { ...out, trace: traced(), ...later(R), ...copy(R, { pass, format }) };
}

/** how it works, traced from a real run (data/trace.json, written after organ 2 is measured) */
export function traced() {
  if (!has('data/trace.json')) return '<p class="dim">The trace of a real case through the mesh is written from the run once organ 2 is measured.</p>';
  const t = JSON.parse(read('data/trace.json')), esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const one = (d, x) => '<h4>' + (d === 'telco' ? 'One real telecom customer' : 'One real shop session') + ', from the test cases</h4><ol class="steps">'
    + x.steps.map((s) => '<li><b>' + esc(s.silo) + '</b> sees only ' + Object.entries(s.sees).map(([k, v]) => esc(k) + ' ' + v).join(', ') + '. ' + (s.state !== 'live' ? 'It was cut at its gate, so it says nothing.' : (s.fired.length ? 'Its rules that fire: ' + s.fired.map(esc).join('; ') + '.' : 'None of its rules fire.') + ' Its score: <b>' + s.score + '</b>.') + '</li>').join('')
    + '<li><b>The coupling</b> weighs the scores (standardised): ' + x.weights.map((w) => esc(w.silo) + ' × ' + w.weight).join(', ') + '. Only the ' + esc(x.crossed) + ' crossed.</li>'
    + '<li><b>The answer:</b> ' + Math.round(x.probability * 100) + '% likely ' + (d === 'telco' ? 'to leave' : 'to buy') + '. What really happened: ' + (x.outcome ? (d === 'telco' ? 'they left' : 'they bought') : (d === 'telco' ? 'they stayed' : 'they did not buy')) + '.</li></ol>';
  return one('telco', t.telco) + one('shop', t.shop);
}

/** the verdict paragraphs of the organs after the gate */
function later(R) {
  const f = (x) => format(x, 3), held = (k) => R[k].v.filter((v) => !v.pass).map((v) => v.id), tail = (k) => (held(k).length ? ' ' + held(k).join(', ') + ' failed as sealed, and ' + (held(k).length > 1 ? 'are' : 'is') + ' kept.' : ' Every sealed rule held.');
  const P = (k, s) => '<p class="answer"><b>The verdict.</b> ' + s + tail(k) + '</p>';
  const wait = (k) => '<p class="dim">' + (k === '2b' ? 'Not taken: it runs only if organ 2 finds that composition does not net.' : 'Built and waiting: by the spec’s order it is sealed only after organ 2 is judged.') + '</p>';
  const out = {};
  out.verdict2b = R['2b'] ? P('2b', 'The fixed mesh (co-grown nodes joining only if they add, coupled so no node counts against its own evidence) scored ' + f(R['2b'].r.telco.C.auc) + ' on the telecom customers and ' + f(R['2b'].r.shop.C.auc) + ' on the shop sessions, against ' + f(R['2b'].r.telco.best.testAuc) + ' and ' + f(R['2b'].r.shop.best.testAuc) + ' for the best single node. ' + ['telco', 'shop'].filter((d) => R['2b'].r[d].C.vsBest.low95 > 0).map((d) => (d === 'telco' ? 'On the telecom customers' : 'On the shop sessions') + ' it beat the best node beyond the noise.').join(' ') + ' The non-negative coupling alone took organ 2’s shop mesh from ' + f(R['2b'].r.shop.A.auc) + ' to ' + f(R['2b'].r.shop.B.auc) + ': it stopped the harm.') : wait('2b');
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
