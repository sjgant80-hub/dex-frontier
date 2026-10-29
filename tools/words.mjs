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
export const ORGANS = ['1', '2', '2b', '2c', '2d', '2e', '2f', '2g', '2h', '2i', '3', '4', '5', '6', '7'];

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
  return { ...out, gate: gate(R), trace: traced(), ...later(R), ...copy(R, { pass, format }) };
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

/** the gate, taken as many times as it took: every sealed attempt at composition, side by side */
export const ATTEMPTS = [
  ['2', 'nodes grown alone, a linear coupling (organ 2)', (r, d) => [r[d].composedAuc, r[d].vsBest]],
  ['2b', 'a coupling that counts no node against its own evidence; nodes co-grown to complement; a gate on what a node adds', (r, d) => [r[d].C.auc, r[d].C.vsBest]],
  ['2c', 'as 2b, with co-growth coupled the way the mesh is, and each silo offering both its nodes', (r, d) => [r[d].auc, r[d].vsBest]],
  ['2d', 'a nonlinear coupling: small boosted trees over the nodes’ scores (interactions)', (r, d) => [r[d].auc, r[d].vsBest]],
  ['2e', 'the mesh chooses its own coupling, linear or trees, out of fold on the cases it may learn from', (r, d) => [r[d].auc, r[d].vsBest]],
];
export function gate(R) {
  const tried = ATTEMPTS.filter(([k]) => R[k]);
  if (!tried.length) return '';
  const cell = (k, get, d) => { const [a, v] = get(R[k].r, d); return format(a, 3) + ' vs ' + format(v.b, 3) + ' <span class="dim">(bound ' + format(v.low95, 's') + ')</span>'; };
  const passes = (k, get) => ['telco', 'shop'].every((d) => get(R[k].r, d)[1].low95 > 0);
  const first = tried.find(([k, , get]) => passes(k, get)), f2 = R['2f'], g2 = R['2g'], h2 = R['2h'], i2 = R['2i'], wonBy = (x) => x && x.v.find((v) => v.id === 'GATE').pass, won = wonBy(f2) || wonBy(g2) || wonBy(h2) || wonBy(i2), times = tried.length + (f2 ? 1 : 0) + (g2 ? 1 : 0) + (h2 ? 1 : 0) + (i2 ? 1 : 0);
  return '<h3 id="gate">The gate, taken ' + times + ' time' + (times === 1 ? '' : 's') + ', every attempt sealed first: ' + (won ? 'won' : 'not yet won') + '</h3><p>The spec’s gate has three tests, and all three must hold before anything scales: the composed mesh beats any single specialist; it approaches a frontier model; adding a specialist measurably raises it. ' + (first
    ? 'The first test first held in both domains in organ ' + first[0] + ': ' + first[1] + '. The other two were sealed in organ 2, and failed there; organs 2b to 2e did not re-test them. On the telecom customers the mesh organ ' + first[0] + ' chose is organ 2’s exactly, which trails the frontier model and does not compound as nodes join. So the gate is not won. Every attempt is kept with its failures. That the first test took ' + tried.length + ' sealed attempts on the same test cases is itself a reason to read even that pass with care.'
    : 'Composition has not yet beaten its best node in both domains. Every attempt is kept with its failures.')
    + '</p><div class="tw"><table><thead><tr><th>Organ</th><th>How the nodes were composed</th><th>Telco: mesh vs best node</th><th>Shop: mesh vs best node</th><th>Beats the best node in both?</th></tr></thead><tbody>'
    + tried.map(([k, how, get]) => '<tr><td><a href="#fix">' + k + '</a></td><td>' + how + '</td><td class="num">' + cell(k, get, 'telco') + '</td><td class="num">' + cell(k, get, 'shop') + '</td><td>' + (passes(k, get) ? '<span class="chip pass">yes</span>' : '<span class="chip fail">no</span>') + '</td></tr>').join('') + '</tbody></table></div>'
    + (f2 ? '<p>The ' + (times === 6 ? 'sixth' : 'latest') + ' attempt, <a href="#retake">organ 2f</a>, took all three tests at once on two datasets none of these had touched: ' + ['N2', 'N3', 'N4'].map((id) => ({ N2: 'beats its parts', N3: 'approaches the frontier model', N4: 'grows as departments join' })[id] + ' ' + (f2.v.find((v) => v.id === id).pass ? 'held' : 'failed')).join(', ') + '. ' + (wonBy(f2) ? 'The gate is won.' : 'The gate is not won.') + '</p>' : '')
    + (g2 ? '<p>The ' + (times === 7 ? 'seventh' : 'latest') + ', <a href="#retake2">organ 2g</a>, took them again on two more fresh datasets, with 2f’s two measurement faults fixed. ' + ((r) => { const all3 = (x) => x.live.length >= 2 && x.vsBest.low95 > 0 && x.frontier.vs.low95 > -0.02 && x.growth.every((g, k) => k === 0 || g.testAuc >= x.growth[k - 1].testAuc) && x.fullVsFirst.low95 > 0; return ['credit', 'hospital'].map((d) => (d === 'credit' ? 'On the credit clients ' : 'on the hospital stays ') + (r[d].live.length ? (all3(r[d]) ? 'all three held' : 'not all three held') : 'every department was cut at its bar on its own, so no mesh formed and none could hold')).join('; ') + '. '; })(g2.r) + (wonBy(g2) ? 'The gate is won.' : 'The gate asks for both, so it is not won.') + '</p>' : '')
    + (h2 ? '<p>The ' + (times === 8 ? 'eighth' : 'latest') + ', <a href="#retake3">organ 2h</a>, took them again on two more fresh datasets with the join rule fixed: a department joins when it beats a coin beyond the noise, not when it clears a fixed bar alone. ' + ((r) => { const all3 = (x) => x.live.length >= 2 && x.vsBest.low95 > 0 && x.frontier.vs.low95 > -0.02 && x.growth.every((g, k) => k === 0 || g.testAuc >= x.growth[k - 1].testAuc) && x.fullVsFirst.low95 > 0; return ['coupon', 'cover'].map((d, k) => (k ? 'on the ' : 'On the ') + (d === 'coupon' ? 'coupon offers ' : 'forest cells ') + (r[d].live.length ? (all3(r[d]) ? 'all three held' : 'not all three held') : 'no department joined, so no mesh formed')).join('; ') + '. '; })(h2.r) + (wonBy(h2) ? 'The gate is won.' : 'The gate asks for both, so it is not won.') + '</p>' : '')
    + (i2 ? '<p>The ' + (times === 9 ? 'ninth' : 'latest') + ', <a href="#retake4">organ 2i</a>, took them again on two more fresh datasets with a relay: departments grow in turn, each on its own columns and the scores the stronger ones send it. ' + ((r) => { const all3 = (x) => x.live.length >= 2 && x.vsBest.low95 > 0 && x.frontier.vs.low95 > -0.02 && x.growth.every((g, k) => k === 0 || g.testAuc >= x.growth[k - 1].testAuc) && x.fullVsFirst.low95 > 0; return ['hotel', 'news'].map((d, k) => (k ? 'on the ' : 'On the ') + (d === 'hotel' ? 'hotel bookings ' : 'news articles ') + (r[d].live.length ? (all3(r[d]) ? 'all three held' : 'not all three held') : 'no department joined, so no mesh formed')).join('; ') + '. '; })(i2.r) + (wonBy(i2) ? 'The gate is won.' : 'The gate asks for both, so it is not won.') + '</p>' : '');
}

/** the verdict paragraphs of the organs after the gate */
function later(R) {
  const f = (x) => format(x, 3), held = (k) => R[k].v.filter((v) => !v.pass).map((v) => v.id), tail = (k) => (held(k).length ? ' ' + held(k).join(', ') + ' failed as sealed, and ' + (held(k).length > 1 ? 'are' : 'is') + ' kept.' : ' Every sealed rule held.');
  const P = (k, s) => '<p class="answer"><b>The verdict.</b> ' + s + tail(k) + '</p>';
  const wait = (k) => '<p class="dim">' + (/^2[f-i]$/.test(k) ? 'Sealed before it was measured: the verdict fills in from the record.' : /^2[b-e]$/.test(k) ? 'Not taken: it runs only if the attempt before it finds that composition does not net.' : 'Built and held. By the spec, nothing below the gate is sealed until composition wins all three of the gate’s tests, and it has won one.') + '</p>';
  const out = {};
  out.verdict2b = R['2b'] ? P('2b', 'The fixed mesh (co-grown nodes joining only if they add, coupled so no node counts against its own evidence) scored ' + f(R['2b'].r.telco.C.auc) + ' on the telecom customers and ' + f(R['2b'].r.shop.C.auc) + ' on the shop sessions, against ' + f(R['2b'].r.telco.best.testAuc) + ' and ' + f(R['2b'].r.shop.best.testAuc) + ' for the best single node. ' + ['telco', 'shop'].filter((d) => R['2b'].r[d].C.vsBest.low95 > 0).map((d) => (d === 'telco' ? 'On the telecom customers' : 'On the shop sessions') + ' it beat the best node beyond the noise.').join(' ') + ' The non-negative coupling alone took organ 2’s shop mesh from ' + f(R['2b'].r.shop.A.auc) + ' to ' + f(R['2b'].r.shop.B.auc) + ': it stopped the harm.') : wait('2b');
  const vb = (r, d) => f(r[d].auc) + ' against ' + f(r[d].best.testAuc) + ' for the best node (bound ' + format(r[d].vsBest.low95, 's') + ')';
  out.verdict2c = R['2c'] ? P('2c', 'The mesh scored ' + vb(R['2c'].r, 'telco') + ' on the telecom customers and ' + vb(R['2c'].r, 'shop') + ' on the shop sessions. On the shop a co-grown browsing node joined on a gain of ' + f(R['2c'].r.shop.steps.find((s) => s.silo === 'shop-browsing').coGrown.adds) + ' on GATE, and the mesh fell just under its best node.') : wait('2c');
  out.verdict2d = R['2d'] ? P('2d', 'Trees over the scores scored ' + vb(R['2d'].r, 'telco') + ' on the telecom customers and ' + vb(R['2d'].r, 'shop') + ' on the shop sessions — where the two specialists, whose records never met, came level with every record pooled (' + f(R['2d'].r.shop.vsMonolith.b) + ').') : wait('2d');
  out.verdict2e = R['2e'] ? P('2e', 'Choosing out of fold on GATE alone, the telecom mesh took the ' + R['2e'].r.telco.chosen + ' coupling and the shop mesh the ' + R['2e'].r.shop.chosen + ' one. On the test cases the mesh scored ' + vb(R['2e'].r, 'telco') + ' and ' + vb(R['2e'].r, 'shop') + ': ' + (R['2e'].r.telco.vsBest.low95 > 0 && R['2e'].r.shop.vsBest.low95 > 0 ? 'composition beat the best single node beyond the noise in both domains, the first of the gate’s three tests. The other two still fail. The telecom mesh it chose is organ 2’s exactly, and that mesh neither approaches the frontier model (' + f(R['2'].r.telco.frontier.vs.a) + ' against ' + f(R['2'].r.telco.frontier.vs.b) + ' on the same 300 cases) nor compounds as nodes join (' + R['2'].r.telco.growth.map((g) => f(g.testAuc)).join(' → ') + '). The gate is not won, so nothing scales. Its sealed rule called that first test ‘the gate’: that label was too narrow, and is corrected here.' : 'composition did not beat the best node in both.')) : wait('2e');
  const g2f = R['2f'] && R['2f'].r, ok = (id) => R['2f'].v.find((v) => v.id === id).pass, held2f = (d, id) => ({ N2: g2f[d].vsBest.low95 > 0, N3: g2f[d].frontier.vs.low95 > -0.02, N5: g2f[d].monolith.boosted.low95 > -0.02 })[id];
  const grows = (x) => x.growth.every((g, k) => k === 0 || g.testAuc >= x.growth[k - 1].testAuc) && x.growth[x.growth.length - 1].testAuc >= x.growth[0].testAuc + 0.01;
  const dn = { bank: 'the bank calls', adult: 'the census people' }, test2f = (id, what, get) => what + ': ' + (ok(id) ? 'held in both' : ['bank', 'adult'].map((d) => (held2f(d, id) ? 'held' : 'failed') + ' on ' + dn[d] + ' (' + get(g2f[d]) + ')').join(', ')) + '.';
  out.verdict2f = g2f ? P('2f', 'On ' + dn.bank + ' and ' + dn.adult + ', which no attempt had touched, the mesh scored ' + f(g2f.bank.composedAuc) + ' and ' + f(g2f.adult.composedAuc) + '. '
    + test2f('N2', 'Beats its best department', (x) => f(x.vsBest.a) + ' against ' + f(x.vsBest.b) + ', bound ' + format(x.vsBest.low95, 's')) + ' '
    + test2f('N3', 'Approaches the frontier model', (x) => f(x.frontier.vs.a) + ' against ' + f(x.frontier.vs.b) + ' on 300 cases, bound ' + format(x.frontier.vs.low95, 's')) + ' '
    + 'Grows as departments join (never falling, and at least 0.01 above its first): ' + ['bank', 'adult'].map((d) => (grows(g2f[d]) ? 'held' : 'failed') + ' on ' + dn[d] + ' (' + g2f[d].growth.map((x) => f(x.testAuc)).join(' → ') + ')').join(', ') + '. '
    + (ok('GATE') ? 'All three of the gate’s tests held together, on fresh cases: the gate is won, and the organs below it may now be sealed in turn.' : 'The gate is not won, so nothing below it scales; every failed test is kept.')
    + (has('data/organ-2f/ceiling.json') ? ((c) => ' One check made after the seal, kept beside the result and not in place of it: on the same 300 cases even boosted trees with every record pooled trail the frontier model past that bar (bound ' + format(c.bank.boosted.low95, 's') + ' on ' + dn.bank + ', ' + format(c.adult.boosted.low95, 's') + ' on ' + dn.adult + '). With 300 cases the frontier test’s noise band is about ±0.025, so as sealed it asks for a tie or better; a fairer retest needs enough cases to tell “within 0.02” from “behind”.')(JSON.parse(read('data/organ-2f/ceiling.json'))) : '')) : wait('2f');
  const g2g = R['2g'] && R['2g'].r, ok2 = (id) => R['2g'].v.find((v) => v.id === id).pass, dn2 = { hospital: 'the hospital stays', credit: 'the credit clients' };
  const each2 = (what, held, get) => what + ': ' + ['hospital', 'credit'].map((d) => (held(g2g[d]) ? 'held' : 'failed') + ' on ' + dn2[d] + ' (' + get(g2g[d]) + ')').join(', ') + '.';
  const cutAll = (d) => 'On ' + dn2[d] + ' every department was cut at its bar of 0.6 on cases it never grew on (the best alone ' + f(Math.max(...g2g[d].departments.map((x) => x.gateAuc))) + '), so no mesh formed and it abstained on every case, while every record pooled scored ' + f(g2g[d].monolith.boosted.b) + ' and the frontier model ' + f(g2g[d].frontier.vs.b) + ': the signal is there, spread thin across departments, and a bar that judges each department alone cut all of it. ';
  out.verdict2g = g2g ? P('2g', ['hospital', 'credit'].filter((d) => !g2g[d].live.length).map(cutAll).join('') + 'On ' + dn2.hospital + ' and ' + dn2.credit + ', which no attempt had touched, the mesh scored ' + f(g2g.hospital.composedAuc) + ' and ' + f(g2g.credit.composedAuc) + '. '
    + each2('Beats its best department', (x) => x.vsBest.low95 > 0, (x) => f(x.vsBest.a) + ' against ' + f(x.vsBest.b) + ', bound ' + format(x.vsBest.low95, 's')) + ' '
    + each2('Approaches the frontier model, on 1,200 cases', (x) => x.frontier.vs.low95 > -0.02, (x) => f(x.frontier.vs.a) + ' against ' + f(x.frontier.vs.b) + ', bound ' + format(x.frontier.vs.low95, 's')) + ' '
    + each2('Growth measurably raises it', (x) => x.growth.every((g, k) => k === 0 || g.testAuc >= x.growth[k - 1].testAuc) && x.fullVsFirst.low95 > 0, (x) => x.growth.map((g) => f(g.testAuc)).join(' → ') + ', bound ' + format(x.fullVsFirst.low95, 's')) + ' '
    + (ok2('GATE') ? 'All three of the gate’s tests held together, on fresh cases: the gate is won, and the organs below it may now be sealed in turn.' : 'The gate is not won, so nothing below it scales; every failed test is kept.')
    + (has('data/organ-2g/nobar.json') ? ((x) => ' One check made after the seal, kept beside the result and not in place of it: with every hospital department kept despite its bar, the mesh did compose (' + f(x.composedAuc) + ' against ' + f(x.best.testAuc) + ' for its best department, bound ' + format(x.vsBest.low95, 's') + '; ' + x.growth.map((g) => f(g.testAuc)).join(' → ') + ' as they joined) but stayed behind the frontier model (' + f(x.vsFrontier.a) + ' against ' + f(x.vsFrontier.b) + ' on its 1,200) and every record pooled (' + f(x.vsPooled.b) + '). So on this hard outcome the bar is not the only shortfall: the grown bodies are.')(JSON.parse(read('data/organ-2g/nobar.json'))) : '')) : wait('2g');
  const g2h = R['2h'] && R['2h'].r, ok3 = (id) => R['2h'].v.find((v) => v.id === id).pass, dn3 = { coupon: 'the coupon offers', cover: 'the forest cells' };
  const each3 = (what, held, get) => what + ': ' + ['coupon', 'cover'].map((d) => (held(g2h[d]) ? 'held' : 'failed') + ' on ' + dn3[d] + (g2h[d].live.length ? ' (' + get(g2h[d]) + ')' : ' (no mesh)')).join(', ') + '.';
  const noneJoined = (d) => 'On ' + dn3[d] + ' no department beat a coin beyond the noise on cases it never grew on, so no mesh formed and it abstained on every case. ';
  out.verdict2h = g2h ? P('2h', ['coupon', 'cover'].filter((d) => !g2h[d].live.length).map(noneJoined).join('') + 'On ' + dn3.coupon + ' and ' + dn3.cover + ', which no attempt had touched, ' + ['coupon', 'cover'].map((d) => g2h[d].live.length + ' of ' + g2h[d].departments.length + ' departments joined').join(' and ') + ', and the mesh scored ' + f(g2h.coupon.composedAuc) + ' and ' + f(g2h.cover.composedAuc) + '. '
    + each3('Beats its best department', (x) => x.live.length >= 2 && x.vsBest.low95 > 0, (x) => f(x.vsBest.a) + ' against ' + f(x.vsBest.b) + ', bound ' + format(x.vsBest.low95, 's')) + ' '
    + each3('Approaches the frontier model, on 1,200 cases', (x) => x.frontier.vs.low95 > -0.02, (x) => f(x.frontier.vs.a) + ' against ' + f(x.frontier.vs.b) + ', bound ' + format(x.frontier.vs.low95, 's')) + ' '
    + each3('Growth measurably raises it', (x) => x.live.length >= 2 && x.growth.every((g, k) => k === 0 || g.testAuc >= x.growth[k - 1].testAuc) && x.fullVsFirst.low95 > 0, (x) => x.growth.map((g) => f(g.testAuc)).join(' → ') + ', bound ' + format(x.fullVsFirst.low95, 's')) + ' '
    + (ok3('GATE') ? 'All three of the gate’s tests held together in both, on fresh cases: the gate is won, and the organs below it may now be sealed in turn.' : 'The gate asks for all three in both, so it is not won, and nothing below it scales; every failed test is kept.')) : wait('2h');
  const g2i = R['2i'] && R['2i'].r, ok4 = (id) => R['2i'].v.find((v) => v.id === id).pass, dn4 = { hotel: 'the hotel bookings', news: 'the news articles' };
  const each4 = (what, held, get) => what + ': ' + ['hotel', 'news'].map((d) => (held(g2i[d]) ? 'held' : 'failed') + ' on ' + dn4[d] + (g2i[d].live.length ? ' (' + get(g2i[d]) + ')' : ' (no mesh)')).join(', ') + '.';
  out.verdict2i = g2i ? P('2i', ['hotel', 'news'].filter((d) => !g2i[d].live.length).map((d) => 'On ' + dn4[d] + ' no department beat a coin beyond the noise on cases it never grew on, so no relay formed and the mesh abstained on every case. ').join('') + 'On ' + dn4.hotel + ' and ' + dn4.news + ', which no attempt had touched, ' + ['hotel', 'news'].map((d) => g2i[d].live.length + ' of ' + g2i[d].departments.length + ' departments joined the relay').join(' and ') + ', and the mesh scored ' + f(g2i.hotel.composedAuc) + ' and ' + f(g2i.news.composedAuc) + '. '
    + each4('Beats its best department', (x) => x.live.length >= 2 && x.vsBest.low95 > 0, (x) => f(x.vsBest.a) + ' against ' + f(x.vsBest.b) + ', bound ' + format(x.vsBest.low95, 's')) + ' '
    + each4('Approaches the frontier model, on 1,200 cases', (x) => x.frontier.vs.low95 > -0.02, (x) => f(x.frontier.vs.a) + ' against ' + f(x.frontier.vs.b) + ', bound ' + format(x.frontier.vs.low95, 's')) + ' '
    + (['hotel', 'news'].every((d) => g2i[d].live.length && g2i[d].frontier.vs.low95 > 0) ? 'In plain words: on both, the mesh did more than come close. It scored higher than the frontier model, and its lead stays above zero even at the bottom of its 95% range (the bound). ' : '')
    + each4('Growth measurably raises it', (x) => x.live.length >= 2 && x.growth.every((g, k) => k === 0 || g.testAuc >= x.growth[k - 1].testAuc) && x.fullVsFirst.low95 > 0, (x) => x.growth.map((g) => f(g.testAuc)).join(' → ') + ', bound ' + format(x.fullVsFirst.low95, 's')) + ' '
    + each4('The relay beats the same departments answering alone', (x) => x.live.length >= 2 && x.vsOneScore.low95 > 0, (x) => f(x.vsOneScore.a) + ' against ' + f(x.vsOneScore.b) + ', bound ' + format(x.vsOneScore.low95, 's')) + ' '
    + (ok4('GATE') ? 'All three of the gate’s tests held together in both, on fresh cases: the gate is won, and the organs below it may now be sealed in turn.' : 'The gate asks for all three in both, so it is not won, and nothing below it scales; every failed test is kept.')) : wait('2i');
  out.verdict3 = R['3'] ? P('3', R['3'].r.telco.silos.concat(R['3'].r.shop.silos).reduce((a, s) => a + s.born, 0) + ' children were born through the gate and ' + R['3'].r.telco.silos.concat(R['3'].r.shop.silos).reduce((a, s) => a + s.refused, 0) + ' were refused. On TEST the bred mesh scored ' + f(R['3'].r.telco.bredMeshAuc) + ' and ' + f(R['3'].r.shop.bredMeshAuc) + ', against ' + f(R['3'].r.telco.firstMeshAuc) + ' and ' + f(R['3'].r.shop.firstMeshAuc) + ' for the founders’ mesh, coupled as organ 2e chose.') : wait('3');
  out.verdict4 = R['4'] ? P('4', 'As records arrived, the mesh went from ' + f(R['4'].r.telco.firstToLast.from) + ' to ' + f(R['4'].r.telco.firstToLast.to) + ' on the telecom test cases and from ' + f(R['4'].r.shop.firstToLast.from) + ' to ' + f(R['4'].r.shop.firstToLast.to) + ' on the shop’s.') : wait('4');
  out.verdict5 = R['5'] ? P('5', 'When the strongest node went bad half-way, the frozen mesh fell to ' + f(R['5'].r.telco.broken.frozenLate) + ' (telecom) and ' + f(R['5'].r.shop.broken.frozenLate) + ' (shop) on the rest of the stream; the wisp, learning and pruning, held ' + f(R['5'].r.telco.broken.wispLate) + ' and ' + f(R['5'].r.shop.broken.wispLate) + '. With no break, learning scored ' + f(R['5'].r.telco.calm.learningLate) + ' and ' + f(R['5'].r.shop.calm.learningLate) + ' against ' + f(R['5'].r.telco.calm.frozenLate) + ' and ' + f(R['5'].r.shop.calm.frozenLate) + ' frozen.') : wait('5');
  out.verdict6 = R['6'] ? P('6', 'Cut finer, ' + R['6'].r.telco.live.length + ' and ' + R['6'].r.shop.live.length + ' nodes went live. The fine mesh scored ' + f(R['6'].r.telco.fineAuc) + ' and ' + f(R['6'].r.shop.fineAuc) + ', against ' + f(R['6'].r.telco.coarseAuc) + ' and ' + f(R['6'].r.shop.coarseAuc) + ' for the coarse mesh and ' + f(R['6'].r.telco.vsMonolith.b) + ' and ' + f(R['6'].r.shop.vsMonolith.b) + ' for every record pooled.') : wait('6');
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
