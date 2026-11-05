// tools/explain.mjs — two parts of the page that explain it, written from the repository itself, never by hand:
//   grownTrace(R)  how the mesh that held the gate grew (organs 2j and 2k), drawn and told step by step from each
//                  record's own steps: who was offered, in what order, what each read, the lead it showed on GATE and
//                  its bound, and whether it took a seat — then what the seated mesh scored on TEST
//   blueprint()    every kernel, what it does (its own header comment's first sentence), the tests that gate it, and how
//                  many mutants witness v0.6 makes of it (computed from the source now, so it cannot go stale)
// tools/words.mjs writes both into the page; CI's words --check refuses a page that drifts from them.
import { readFileSync } from 'node:fs';
import { mutants } from '../.witness/witness.mjs';
import { PAIRS } from '../witness-all.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f3 = (x) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(3) : '…');
const sg = (x) => (typeof x === 'number' && Number.isFinite(x) ? (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(Math.abs(x) < 0.001 ? 4 : 3) : '…');   // a bound under 0.001 keeps its sign readable
const short = (name) => name.split('-').slice(1).join(' ');
const BODY = { boosted: 'boosted trees', 'deep-quantile': 'staged rules', 'deep-values': 'staged rules, cut at values', 'pairs-quantile': 'paired rules', 'pairs-values': 'paired rules, cut at values' };

export const TRACED = [['2j', 'health', 'the CDC health survey answers', 'has diabetes or prediabetes'], ['2k', 'dropout', 'the student records', 'drops out']];

/** one domain's growth, as a diagram: departments in the order offered, each joined or refused with its bound, the seated
 *  ones sending their scores to the mesh. Every number is the record's. */
export function svgOf(x, label) {
  const rows = [...x.steps, ...x.departments.filter((d) => d.state !== 'live').map((d) => ({ department: d.department, cut: true, bound: d.joinBound }))];
  const H = 34 + rows.length * 60 + 10, mid = 34 + (rows.length * 60) / 2 - 30;
  const box = (r, k) => {
    const y = 34 + k * 60, cls = r.cut ? 'dg-box dg-cut' : r.joins ? 'dg-box dg-live' : 'dg-box dg-ref';
    const line2 = r.cut ? 'cut at the door: it does not beat a coin beyond the noise (bound ' + sg(r.bound) + ')'
      : (BODY[r.fielded] || r.fielded) + ' on ' + r.columns + ' columns' + (r.took.length ? ' (' + r.took.length + ' sent score' + (r.took.length === 1 ? '' : 's') + ')' : '') + ' · mesh ' + f3(r.before) + ' → ' + f3(r.with) + ', bound ' + sg(r.bound);
    return '<g><rect class="' + cls + '" x="20" y="' + y + '" width="560" height="50" rx="9"/><text class="dg-t" x="34" y="' + (y + 21) + '">' + (r.cut ? '' : (k + 1) + ' · ') + esc(short(r.department)) + '</text>'
      + '<text class="dg-s" x="34" y="' + (y + 40) + '">' + esc(line2) + '</text>'
      + '<text class="' + (r.joins ? 'dg-m' : 'dg-s') + '" x="596" y="' + (y + 30) + '">' + (r.cut ? 'not offered' : r.joins ? 'takes a seat' : 'refused, sends nothing') + '</text></g>'
      + (r.joins ? '<path class="dg-a" d="M700 ' + (y + 25) + 'C740 ' + (y + 25) + ' 740 ' + (mid + 30) + ' 768 ' + (mid + 30) + '"/>' : '');
  };
  return '<div class="diagram" role="img" aria-label="' + esc(label) + '"><svg viewBox="0 0 900 ' + H + '" xmlns="http://www.w3.org/2000/svg">'
    + '<text class="dg-s" x="20" y="22">offered strongest first; each joins only if the mesh with it leads the mesh without it on GATE beyond the noise</text>'
    + rows.map(box).join('')
    + '<g><rect class="dg-box dg-live" x="770" y="' + mid + '" width="116" height="60" rx="9"/><text class="dg-t" x="782" y="' + (mid + 26) + '">The mesh</text><text class="dg-s" x="782" y="' + (mid + 46) + '">' + x.admitted.length + ' seats, ' + esc(x.chosen) + '</text></g>'
    + '</svg></div>';
}

/** how the mesh that held the gate grew, traced from organs 2j's and 2k's records */
export function grownTrace(R) {
  const have = TRACED.filter(([k, d]) => R[k] && R[k].r[d]);
  if (!have.length) return '<p class="dim">The trace of the mesh that holds the gate is written from its record once it is measured.</p>';
  return have.map(([k, d, name, outcome]) => {
    const x = R[k].r[d], first = x.steps[0], refused = x.steps.filter((s) => !s.joins), cut = x.departments.filter((s) => s.state !== 'live');
    return '<h4>Organ ' + k + ', ' + esc(name) + ' (' + x.cases.toLocaleString('en-GB') + ' held-out cases; the outcome: whether a person ' + outcome + ')</h4>'
      + svgOf(x, 'Organ ' + k + ': ' + x.steps.length + ' departments offered in turn, ' + x.admitted.length + ' took a seat')
      + '<ol class="steps">'
      + '<li><b>Each department is held to the door alone.</b> ' + (cut.length ? cut.map((c) => esc(short(c.department))).join(', ') + ' did not beat a coin beyond the noise on GATE, so ' + (cut.length === 1 ? 'it was' : 'they were') + ' never offered; the other ' + x.steps.length + ' were.' : 'All ' + x.steps.length + ' beat a coin beyond the noise on GATE, so all were offered.') + '</li>'
      + '<li><b>Offered strongest first.</b> ' + esc(short(first.department)) + ' went first and took the first seat against a coin (bound ' + sg(first.bound) + '). Each one after it grew on its own columns plus the scores the seated departments sent it, and fielded whichever of five bodies did best on GATE.</li>'
      + '<li><b>A seat only beyond the noise.</b> ' + x.steps.slice(1).map((s) => esc(short(s.department)) + ' ' + (s.joins ? 'took one' : 'was refused') + ' (' + f3(s.before) + ' → ' + f3(s.with) + ', bound ' + sg(s.bound) + ')').join('; ') + '. ' + (refused.length ? 'A refused department sends no score and holds no seat.' : '') + '</li>'
      + '<li><b>The coupling chose itself.</b> Out of fold on GATE, the ' + esc(x.chosen) + ' coupling. Only scores crossed between departments; no record did.</li>'
      + '<li><b>Then, and only then, TEST.</b> The seated mesh scored ' + f3(x.composedAuc) + ' against ' + f3(x.vsBest.b) + ' for its best department (bound ' + sg(x.vsBest.low95) + '), growing ' + x.growth.map((g) => f3(g.testAuc)).join(' → ') + ' as the seats filled, and ' + f3(x.frontier.vs.a) + ' against ' + f3(x.frontier.vs.b) + ' for the frontier model on its 1,200 cases.</li>'
      + '</ol>';
  }).join('');
}

/** a kernel's own first sentence, from the header comment it opens with */
export function purposeOf(src) {
  const head = String(src).split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/\s?/, '')).join(' ');
  const after = head.includes(' — ') ? head.slice(head.indexOf(' — ') + 3) : head, end = after.search(/\.(\s|$)/);
  return (end === -1 ? after : after.slice(0, end + 1)).trim();
}

/** every gated kernel: what it does, its tests, and how many mutants witness v0.6 makes of it */
export function blueprint() {
  const rows = PAIRS.map(([src, tests]) => { const s = read(src); return [src, purposeOf(s), tests, mutants(s).length]; });
  const n = rows.reduce((a, r) => a + r[3], 0);
  return '<div class="tw"><table><thead><tr><th>Kernel</th><th>What it does</th><th>Gate</th></tr></thead><tbody>'
    + rows.map(([src, what, tests, m]) => '<tr><td><code>' + esc(src) + '</code></td><td>' + esc(what) + '</td><td class="dim">' + tests.map((t) => '<code>' + esc(t) + '</code>').join(' ') + ' · ' + m + ' mutants</td></tr>').join('')
    + '</tbody></table></div><p class="dim">' + rows.length + ' kernels, ' + n + ' mutants in all. CI’s mutation gate (witness v0.6, pinned to its tag and compared byte for byte) breaks every one of them, one at a time, and fails the push if any break goes unnoticed by the tests; no survivor is excused. The counts are computed from the sources as this page was written.</p>';
}

/** organ 3 redesigned on the mechanism that held the gate, as the design check found it (data/diagnose-9.json, FIT and
 *  GATE only): every number is the check's, and the conclusion follows from them whichever way they fall */
export function breedDesign(d) {
  if (!d) return '';
  const doms = [['health', 'the CDC health survey answers (organ 2j’s domain)'], ['dropout', 'the student records (organ 2k’s domain)']].filter(([k]) => d[k]);
  const steps = doms.flatMap(([k]) => d[k].steps), born = steps.reduce((a, s) => a + s.born, 0), refused = steps.reduce((a, s) => a + s.refused, 0);
  const fields = steps.filter((s) => s.fieldsBred), up = steps.filter((s) => s.championVsFounderOnGate), held = up.filter((s) => s.championVsFounderOnGate.low95 > 0);
  const mesh = doms.map(([k, name]) => { const m = d[k].meshOnGate; return name + ': ' + (m.identical ? 'the same mesh as organ 2j’s rule grows, case for case (' + f3(m.bred) + ' on GATE out of fold)' : f3(m.bred) + ' against ' + f3(m.asIn2j) + ' on GATE out of fold, bound ' + sg(m.lead.low95)); }).join('; ');
  const lifted = doms.filter(([k]) => d[k].meshOnGate.lead && d[k].meshOnGate.lead.low95 > 0);
  return '<p class="answer"><b>Redesigned, and asked first on FIT and GATE alone.</b> In <code>tools/diagnose-9.mjs</code> each department, at its turn in organ 2j’s mechanism, also bred (<code>src/breed.mjs</code>): ' + d.breed.founders.length + ' founders of its best rule kind, grown from ' + d.breed.founders.length + ' contributors’ seeds on ' + Math.round((1 - d.breed.check) * 100) + '% of FIT; ' + d.breed.generations + ' generations of ' + d.breed.attempts + ' breedings; a child born only if it leads its better parent beyond the noise on the other ' + Math.round(d.breed.check * 100) + '% of FIT, which no founder and no child grew on, so birth never spends GATE. '
    + 'Across ' + steps.length + ' department turns, ' + born + ' child' + (born === 1 ? ' was' : 'ren were') + ' born and ' + refused + ' refused. '
    + (up.length ? 'Where a child became its department’s champion (' + up.length + ' turn' + (up.length === 1 ? '' : 's') + '), it led its best founder on GATE, which birth never saw, beyond the noise in ' + held.length + ' (' + up.map((s) => short(s.department) + ' ' + f3(s.championGate) + ' against ' + f3(s.bestFounderGate) + ', bound ' + sg(s.championVsFounderOnGate.low95)).join('; ') + '). ' : 'No child became its department’s champion. ')
    + (fields.length ? fields.length + ' department turn' + (fields.length === 1 ? '' : 's') + ' fielded the population’s champion over its five bodies (' + fields.map((s) => short(s.department) + (/^c/.test(s.champion) ? ', a bred child' : ', a founder from another contributor’s seed, not a child') + ', and ' + (s.joins ? 'it took a seat' : 'it was refused a seat')).join('; ') + '); everywhere else one of the five did better on GATE. ' : 'No department fielded its population’s champion: in every turn one of its five bodies did better on GATE (' + [...new Set(steps.map((s) => (BODY[s.fieldedAlone] || s.fieldedAlone)))].join(', ') + '). ')
    + 'The mesh: ' + mesh + '. '
    + (lifted.length ? 'Breeding raised the mesh beyond the noise there. These domains’ test cases were scored in organs 2j and 2k, so this is a design check, not a result: organ 3 is sealed in this form on a dataset no organ has touched, before any of it is measured.'
      : doms.every(([k]) => d[k].meshOnGate.identical) ? 'So on ' + (doms.length === 2 ? 'both domains' : 'this domain') + ' breeding, as designed here, changes nothing the mesh answers with: ' + (born ? '' : 'no child led its better parent beyond the noise on rows no parent grew on, and ') + 'the departments that take a seat field bodies that beat the bred ones on GATE. Organ 3 is not sealed in this form: by the spec a breeding population must grow a better mesh, and here it grows the same one. What it breeds next has to be what the mesh fields.'
        : 'Breeding changed the mesh, but not beyond the noise on GATE. By the rule the mechanism keeps, a change that cannot be told from noise is not a gain, so organ 3 is not sealed in this form; what it breeds next has to be what the mesh fields.')
    + ' Every dataset in the repository has been scored by an earlier organ, so organ 3’s sealed test also waits for a fresh one.</p>';
}

/** organ 3's second redesign, breeding the body the mesh fields (data/diagnose-10.json, FIT and GATE only): every number
 *  is the check's, and the conclusion follows from them whichever way they fall */
export function breedTreesDesign(d) {
  if (!d) return '';
  const doms = [['health', 'the CDC health survey answers'], ['dropout', 'the student records']].filter(([k]) => d[k]);
  const steps = doms.flatMap(([k]) => d[k].steps), born = steps.reduce((a, s) => a + s.born, 0), refused = steps.reduce((a, s) => a + s.refused, 0);
  const past = steps.filter((s) => !s.championIsToday), held = past.filter((s) => s.championVsTodayOnGate.low95 > 0), fields = steps.filter((s) => s.fieldsBred);
  const mesh = doms.map(([k, name]) => { const m = d[k].meshOnGate; return name + ': ' + (m.identical ? 'the same mesh as organ 2j’s rule grows, case for case (' + f3(m.bred) + ' on GATE out of fold)' : f3(m.bred) + ' against ' + f3(m.asIn2j) + ' on GATE out of fold, bound ' + sg(m.lead.low95)); }).join('; ');
  const lifted = doms.filter(([k]) => d[k].meshOnGate.lead && d[k].meshOnGate.lead.low95 > 0), same = doms.every(([k]) => d[k].meshOnGate.identical);
  return '<p class="answer"><b>Redesigned again: breeding what the mesh fields.</b> In <code>tools/diagnose-10.mjs</code> each department, at its turn, bred boosted trees by their recipe (<code>src/breedtrees.mjs</code>: rounds, rate, how finely each column is cut, how hard a leaf is held back, which columns it reads), from ' + d.breed.founders.length + ' founders: the recipe it fields today and ' + (d.breed.founders.length - 1) + ' from contributors’ seeds, with the same split, generations and bound as the first redesign. '
    + 'Across ' + steps.length + ' department turns, ' + born + ' child' + (born === 1 ? ' was' : 'ren were') + ' born and ' + refused + ' refused. '
    + (past.length ? 'In ' + past.length + ' turn' + (past.length === 1 ? '' : 's') + ' the population’s champion was not today’s recipe' + (past.every((s) => /^f/.test(s.champion)) ? ' but a founder from another contributor’s seed, not a child' : '') + '; on GATE, which birth never saw, it led today’s recipe beyond the noise in ' + held.length + ' (' + past.map((s) => short(s.department) + ' ' + f3(s.championGate) + ' against ' + f3(s.todayGate) + ', bound ' + sg(s.championVsTodayOnGate.low95)).join('; ') + '). ' : 'In every turn the population’s champion was today’s recipe. ')
    + (fields.length ? fields.length + ' department turn' + (fields.length === 1 ? '' : 's') + ' fielded it over the five bodies (' + fields.map((s) => short(s.department) + ', ' + (s.joins ? 'which took a seat' : 'which was refused a seat')).join('; ') + '). ' : 'No department fielded it over its five bodies. ')
    + 'The mesh: ' + mesh + '. '
    + (lifted.length ? 'Breeding what the mesh fields raised the mesh beyond the noise on ' + lifted.map(([, n]) => n).join(' and ') + '. These domains’ test cases were scored in organs 2j and 2k, so this is a design check, not a result; it is the form organ 3 is sealed in, on a dataset no organ has touched, before any of it is measured.'
      : same ? 'So breeding what the mesh fields, as designed here, also changes nothing the mesh answers with. Two designs of breeding, asked on the two domains where the gate held, leave the mesh exactly as organ 2j’s rule grows it, so by the spec’s own question (does a breeding population grow a better mesh?) the answer here is no, and organ 3 is not sealed in either form.'
        : (born ? 'Breeding changed the mesh' : 'The mesh changed, by a founder’s recipe and not by any child') + ', but not beyond the noise on GATE; by the rule the mechanism keeps, that is not a gain. Neither design grows a better mesh on the two domains where the gate held, so by the spec’s own question (does a breeding population grow a better mesh?) the answer here is no, and organ 3 is not sealed in either form.')
    + (lifted.length ? '' : ' A third design is not tried on these domains, because each look at the same GATE cases makes the next one less telling. What comes next is decided before any fresh dataset is opened: organ 3 sealed in one of these forms, so the spec’s question meets a test that can fail, or set aside so that organ 4 goes next.')
    + '</p>';
}
