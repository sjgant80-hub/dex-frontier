// grow.test.mjs — the mesh grows only by a lead beyond the noise: a department whose gain sits inside it is refused where
// the join rule of src/join.mjs would admit it; one refused sends nothing and holds no seat; a FIT case's sent score
// comes from a body that never grew on it; the out-of-fold predictions are those src/select.mjs would judge; a mesh
// that fails refuses that department and says why; nonsense is refused, never thrown.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grow, oofPredict, chosenOof, BEYOND } from '../src/grow.mjs';
import { admit } from '../src/join.mjs';
import { linear, trees, oofAuc } from '../src/select.mjs';
import { rng, auc } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

const N = 400, r = rng(5), gauss = () => { let s = 0; for (let k = 0; k < 6; k++) s += r(); return s - 3; };
const y = Uint8Array.from({ length: N }, () => (r() < 0.4 ? 1 : 0));
const mk = (f) => Float64Array.from({ length: N }, (_, i) => f(i));
const A = mk((i) => y[i] + gauss()), B = mk((i) => y[i] + gauss()), NOISE = mk(() => gauss());
const INSIDE = mk((i) => 0.05 * (0.5 * y[i] + gauss())), FLAT = mk(() => 0), REAL = mk((i) => 0.2 * (y[i] + gauss()));
const FIT = [], GATE = [], TEST = [];
for (let i = 0; i < N; i++) (i % 4 === 0 ? GATE : i % 4 === 1 ? TEST : FIT).push(i);
const GY = GATE.map((i) => y[i]);
const COLS = { a: A, b: B, noise: NOISE, inside: INSIDE, flat: FLAT, real: REAL };
const VIEWS = Object.fromEntries(Object.entries(COLS).map(([k, c]) => [k, { features: [k], cols: { [k]: c }, y }]));
const sum = (cs) => cs[0].map((_, i) => cs.reduce((s, c) => s + c[i], 0));
function stubs(mesh = sum) {
  const grown = [], meshed = [];
  return {
    grown, meshed,
    args: (order, extra = {}) => ({ order, viewOf: (k) => VIEWS[k], field: (v) => ({ body: { rows: FIT }, kind: 'stub' }), grow: (v, rows) => { grown.push({ features: [...v.features], rows: [...rows] }); return { rows: [...rows] }; },
      score: (b, v, i) => v.cols[v.features[0]][i], mesh: (cs, gy) => { meshed.push(cs.length); return mesh(cs, gy); }, y, fitRows: FIT, gateRows: GATE, otherRows: TEST, n: N, ...extra }),
  };
}
const by = (g, name) => g.departments.find((d) => d.name === name);

test('oofPredict holds out exactly as src/select.mjs does: its AUC is oofAuc’s, for both couplings and any number of folds', () => {
  const cols = [GATE.map((i) => A[i]), GATE.map((i) => B[i])], tr = trees({ rounds: 5, rate: 0.3, bins: 8, lambda: 1, minHess: 1 });
  for (const c of [linear, tr]) for (const f of [2, 4]) assert.equal(auc(oofPredict(c, cols, GY, f), GY), oofAuc(c, cols, GY, f), c.name + ' ' + f);
  assert.equal(auc(oofPredict(linear, cols, GY), GY), oofAuc(linear, cols, GY, 4), 'four folds by default');
  const seen = [];
  const spy = { learn: (cs, yy) => { seen.push(yy.length); return { predict: (s) => s[0] }; } };
  const p = oofPredict(spy, [[1, 2, 3, 4, 5]], [0, 1, 0, 1, 1], 2);
  assert.deepEqual(seen, [2, 3], 'fold 0 learns on rows 1 and 3, fold 1 on rows 0, 2 and 4');
  assert.deepEqual(p, [1, 2, 3, 4, 5], 'every row predicted by the fold that held it out');
});

test('chosenOof: the predictions of the coupling with the better out-of-fold AUC; a tie keeps the first', () => {
  const up = { learn: () => ({ predict: (s) => s[0] }) }, down = { learn: () => ({ predict: (s) => -s[0] }) }, twice = { learn: () => ({ predict: (s) => 2 * s[0] }) };
  const cols = [GATE.map((i) => A[i])];
  assert.deepEqual(chosenOof([down, up], cols, GY), cols[0], 'the better one, wherever it stands');
  assert.deepEqual(chosenOof([up, down], cols, GY), cols[0]);
  assert.deepEqual(chosenOof([up, twice], cols, GY), cols[0], 'the same AUC: the first');
  assert.deepEqual(chosenOof([twice, up], cols, GY), cols[0].map((v) => 2 * v));
});

test('a department joins only on a lead beyond the noise: a gain inside it is refused where src/join.mjs would admit it', () => {
  const s = stubs(), g = grow(s.args(['a', 'inside']));
  assert.equal(g.ok, true);
  const d = by(g, 'inside');
  assert.ok(d.with > d.before, 'with it the mesh scores higher on GATE (' + d.before + ' → ' + d.with + ')');
  assert.ok(d.bound <= 0, 'but its bound is not above 0: ' + d.bound);
  assert.equal(d.joins, false); assert.match(d.why, /does not lead beyond the noise/);
  assert.deepEqual(g.admitted, ['a']);
  assert.deepEqual(admit([GATE.map((i) => A[i]), GATE.map((i) => INSIDE[i])], GY, (cs) => auc(sum(cs), GY)).admitted, [0, 1], 'the rule of 2i admits it');
  const real = by(grow(stubs().args(['a', 'real'])), 'real');
  assert.ok(real.bound > 0); assert.equal(real.joins, true); assert.match(real.why, /leads beyond the noise/);
  assert.equal(BEYOND, 0);
});

test('a bound of exactly 0 is not beyond the noise: a department that changes nothing is refused (src/join.mjs admits a tie)', () => {
  const d = by(grow(stubs().args(['a', 'flat'])), 'flat');
  assert.equal(d.bound, 0); assert.equal(d.with, d.before); assert.equal(d.joins, false);
  assert.deepEqual(admit([GATE.map((i) => A[i]), GATE.map(() => 0)], GY, (cs) => auc(sum(cs), GY)).admitted, [0, 1]);
});

test('the first department must beat a coin beyond the noise; what each step was measured against is said', () => {
  const g = grow(stubs().args(['noise', 'a', 'b']));
  assert.deepEqual(g.departments.map((d) => d.joins), [false, true, true]);
  assert.equal(by(g, 'noise').before, 0.5); assert.equal(by(g, 'a').before, 0.5, 'a refused department moves nothing on');
  assert.equal(by(g, 'b').before, by(g, 'a').with, 'the next is measured against the mesh as it stood');
  assert.equal(by(g, 'a').with, Math.round(auc(GATE.map((i) => A[i]), GY) * 1e6) / 1e6);
});

test('a department refused sends no score and holds no seat; the ones after it grow on what joined', () => {
  const s = stubs(), g = grow(s.args(['a', 'noise', 'b']));
  assert.deepEqual(g.admitted, ['a', 'b']);
  assert.deepEqual(by(g, 'noise').took, ['a']); assert.deepEqual(by(g, 'b').took, ['a'], 'b is not sent the refused score');
  assert.deepEqual(by(g, 'b').view.features, ['b', 'sent_a']);
  assert.deepEqual(s.meshed, [1, 2, 2], 'the refused department never sits in the mesh');
  assert.ok(FIT.every((i) => by(g, 'noise').col[i] === 0), 'no FIT score is grown for a department that sends none');
  assert.ok(s.grown.every((x) => x.features[0] === 'a'), 'only the department that sends grows on folds of FIT');
  assert.ok([...GATE, ...TEST].every((i) => by(g, 'noise').col[i] === NOISE[i]), 'its GATE and TEST scores are still kept');
});

test('a FIT case’s sent score comes from a body that never grew on it; the last department offered sends to no one', () => {
  const s = stubs(), g = grow(s.args(['a', 'b']));
  assert.deepEqual(g.admitted, ['a', 'b']);
  assert.equal(s.grown.length, 4, 'four folds for the first, none for the last');
  for (const x of s.grown) assert.deepEqual(x.features, ['a']);
  const held = FIT.filter((i) => !s.grown.every((x) => x.rows.includes(i)));
  assert.deepEqual(held, FIT, 'every FIT row is held out of one fold');
  for (const x of s.grown) assert.equal(x.rows.length, FIT.length * 3 / 4);
  assert.ok(FIT.every((i) => by(g, 'a').col[i] === A[i]));
  assert.ok(FIT.every((i) => by(g, 'b').col[i] === 0));
  assert.equal(grow(s.args(['a', 'b'], { folds: 2 })).ok, true);
});

test('a mesh that throws or gives no prediction for every GATE case refuses that department, and says why', () => {
  let calls = 0;
  const flaky = stubs((cs) => { calls++; if (cs.length === 2) throw new Error('bad'); return sum(cs); });
  const g = grow(flaky.args(['a', 'b']));
  assert.deepEqual(g.admitted, ['a']); assert.equal(by(g, 'b').why, 'the mesh failed: bad'); assert.equal(by(g, 'b').with, null); assert.equal(by(g, 'b').bound, null);
  const odd = stubs((cs) => { if (cs.length === 2) throw 'plain'; return sum(cs); });
  assert.equal(by(grow(odd.args(['a', 'b'])), 'b').why, 'the mesh failed: plain');
  for (const bad of [() => [1, 2], () => 'x', () => sum([GATE.map(() => NaN)]), () => GATE.map(() => 0.5).fill(Infinity, 3, 4)]) {
    const d = by(grow(stubs(bad).args(['a'])), 'a');
    assert.equal(d.joins, false); assert.equal(d.why, 'the mesh gave no prediction for every GATE case');
  }
  assert.equal(by(grow(stubs(() => Float64Array.from(GATE, (i) => A[i])).args(['a'])), 'a').joins, true, 'a typed array of predictions is read');
  assert.ok(calls > 0);
});

test('the same arguments grow the same mesh', () => {
  const strip = (g) => JSON.stringify(g.departments.map(({ view, fielded, col, ...d }) => ({ ...d, col: Array.from(col) })));
  assert.equal(strip(grow(stubs().args(['a', 'noise', 'b', 'real']))), strip(grow(stubs().args(['a', 'noise', 'b', 'real']))));
  assert.notEqual(strip(grow(stubs().args(['a', 'b'], { seed: 3 }))), strip(grow(stubs().args(['a', 'b'], { seed: 4 }))), 'the bootstrap is seeded');
  const few = by(grow(stubs().args(['a', 'inside'], { resamples: 40 })), 'inside');
  assert.notEqual(few.bound, by(grow(stubs().args(['a', 'inside'])), 'inside').bound, 'the resamples are the ones given');
});

test('nonsense is refused with the reason, never thrown', () => {
  const s = stubs(), ok = s.args(['a']), why = 'growing a mesh needs an order, its five functions, the outcomes, the rows and n';
  for (const bad of [null, 'x', {}, { ...ok, order: [] }, { ...ok, order: 'a' }, { ...ok, mesh: null }, { ...ok, viewOf: 1 }, { ...ok, field: 1 }, { ...ok, grow: 1 }, { ...ok, score: 1 },
    { ...ok, y: 'y' }, { ...ok, y: null }, { ...ok, fitRows: null }, { ...ok, gateRows: [] }, { ...ok, gateRows: null }, { ...ok, otherRows: 1 }, { ...ok, n: 0 }, { ...ok, n: 2.5 }])
    assert.deepEqual(grow(bad), { ok: false, error: why });
  assert.equal(grow({ ...ok, y: Array.from(y) }).ok, true, 'outcomes as a plain array');
  const one = { features: ['z'], cols: { z: [0.7] }, y: [1] };
  assert.equal(grow({ ...ok, viewOf: () => one, y: [1], fitRows: [], gateRows: [0], otherRows: [], n: 1 }).ok, true, 'one case is a mesh, if a small one');
  assert.equal(grow({ ...ok, y: new DataView(new ArrayBuffer(8)) }).error, why);
  for (const f of [1, 2.5, 'x']) assert.deepEqual(grow({ ...ok, folds: f }), { ok: false, error: 'folds must be a whole number of at least 2' });
  assert.deepEqual(grow({ ...ok, order: ['a', 'missing'] }), { ok: false, error: 'no view for missing' });
  assert.deepEqual(grow({ ...ok, viewOf: () => ({ features: 'x' }) }), { ok: false, error: 'no view for a' });
});

test('a department takes only the sent scores that fit beside its own columns', () => {
  const g = grow(stubs().args(['a', 'b', 'real'], { max: 2 }));
  assert.deepEqual(by(g, 'b').took, ['a']); assert.deepEqual(by(g, 'real').took, ['a'], 'room for one beside its own column');
  assert.deepEqual(by(grow(stubs().args(['a', 'b', 'real'])), 'real').took, ['a', 'b'], 'sixteen by default');
});
