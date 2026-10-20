// deep.test.mjs — the deeper grown body: the seed library's ribosome grown in stages, each kept only if it pays. Synthetic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { growDeep, scoreDeep, DEEP, fitter, scoreCard, genomeOps } from '../src/deep.mjs';
import { rng, auc, fit, scoreRow, stemGenome, randomGenome, crossGenome, mutateGenome } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

/** ten columns that each carry a little of the outcome: more than one six-rule scorecard can hold */
function wide(n, seed, signal = true) {
  const r = rng(seed), features = Array.from({ length: 10 }, (_, k) => 'x' + k), cols = Object.fromEntries(features.map((f) => [f, new Float64Array(n)])), y = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let z = 0;
    features.forEach((f, k) => { const v = r() * 2 - 1; cols[f][i] = v; z += (k % 2 ? -1 : 1) * 0.9 * v; });
    y[i] = Number(r() < 1 / (1 + Math.exp(-(signal ? z : 0))));
  }
  return { features, cols, y, n };
}
const rows = (a, b) => Array.from({ length: b - a }, (_, k) => a + k);
const SMALL = { population: 16, elites: 4, generations: 8, stages: 5 };

test('the settings a deep body grows with by default', () => {
  assert.deepEqual(DEEP, { population: 40, elites: 8, generations: 30, stages: 8, held: 1 / 3, cuts: 'quantile', pairs: false });
});

test('each kept stage raises the held-out score; the body is deterministic; every stage is expressed on all the training rows', () => {
  const d = wide(900, 5), tr = rows(0, 600), a = growDeep(d, tr, 3, SMALL), b = growDeep(d, tr, 3, SMALL);
  assert.deepEqual(a, b, 'the same body twice');
  assert.ok(a.stages.length >= 2, 'it grew past one stage: ' + a.stages.length);
  assert.ok(a.history[0] > 0.5);
  a.history.forEach((h, k) => k && assert.ok(h > a.history[k - 1], 'stage ' + (k + 1) + ' raised it: ' + a.history.join(' ')));
  assert.equal(a.history.length, a.stages.length);
  assert.equal(a.rules, a.stages.reduce((s, c) => s + c.rules.length, 0));
  for (const c of a.stages) assert.deepEqual(c, fit(d, tr, c.genome), 'a stage is its genome expressed on every training row');
  const i = 700;
  assert.equal(scoreDeep(a, d, i), a.stages.reduce((s, c) => s + scoreRow(c, d, i), 0));
  assert.notDeepEqual(growDeep(d, tr, 4, SMALL).stages, a.stages, 'another seed grows another body');
});

test('deeper beats one stage on rows neither saw', () => {
  const d = wide(1600, 8), tr = rows(0, 800), held = rows(800, 1600), y = held.map((i) => d.y[i]);
  const deep = growDeep(d, tr, 2, SMALL), one = growDeep(d, tr, 2, { ...SMALL, stages: 1 });
  assert.equal(one.stages.length, 1, 'stages: 1 grows at most one');
  assert.deepEqual(one.stages[0], deep.stages[0], 'the first stage is the same body either way');
  const A = (b) => auc(held.map((i) => scoreDeep(b, d, i)), y);
  assert.ok(A(deep) > A(one) + 0.01, 'deep ' + A(deep) + ' vs one stage ' + A(one));
  assert.equal(one.refused, null, 'stopping at the stage limit is not a refusal');
});

test('growth stops when it stops paying: on noise the first stage that fails to beat the body so far is refused and named', () => {
  const d = wide(600, 9, false), b = growDeep(d, rows(0, 600), 1, { ...SMALL, stages: 8 });
  assert.ok(b.stages.length < 8, 'noise grows fewer than every stage: ' + b.stages.length);
  assert.ok(b.refused && b.refused.stage === b.stages.length + 1, JSON.stringify(b.refused));
  assert.ok(b.refused.check <= b.refused.bodySoFar);
  assert.equal(b.refused.bodySoFar, b.stages.length ? b.history[b.history.length - 1] : 0.5);
});

test('total: garbage grows nothing and never throws; too few rows to hold any out grows nothing, refused at stage 1', () => {
  const empty = { stages: [], history: [], rules: 0, refused: null };
  for (const [ds, tr] of [[null, [1]], [undefined, []], [{}, [1]], [{ features: [] }, [1]], [{ features: 'x0' }, [1]], [wide(10, 1), null], [wide(10, 1), 'rows']]) assert.deepEqual(growDeep(ds, tr, 1, SMALL), empty);
  const d = wide(10, 1);
  for (const n of [0, 1, 2]) { const b = growDeep(d, rows(0, n), 1, SMALL); assert.deepEqual(b.stages, []); assert.deepEqual(b.refused, { stage: 1, check: 0.5, bodySoFar: 0.5 }); }
  assert.equal(scoreDeep({ stages: [] }, d, 0), 0);
});

test('the body is pinned: the same data and seed grow these exact bytes (any change to the search, its splits, its seeds or its tie-breaks shows)', async () => {
  const { sha256Hex } = await import('../vendor/living-seed/vendor/seed-library/sha256.mjs');
  const d = wide(900, 5), pins = { 1: 'b3a974532422206a', 2: 'ad4d6adad7157e2f', 3: '2e4143453a7d7131', 4: 'e6b0169875aa7431', 5: '311020041b9e26f6', 6: '1298a9bb94dba7ec' };
  for (const [s, pin] of Object.entries(pins)) assert.equal(sha256Hex(JSON.stringify(growDeep(d, rows(0, 600), Number(s), SMALL))).slice(0, 16), pin, 'seed ' + s);
});

test('fitter is the seed library’s fit exactly, on any rows (none, one, many), for any genome', () => {
  const d = wide(300, 4), r = rng(77);
  for (const rs of [[], [7], rows(0, 2), rows(0, 300), rows(50, 213)]) {
    const f = fitter(d, rs);
    for (let k = 0; k < 60; k++) { const g = k === 0 ? stemGenome() : randomGenome(r); assert.deepEqual(f(g), fit(d, rs, g), "rows " + rs.length + " genome " + k); }
  }
});

test('held sets the share held out for the search and its check: a wider share grows another body, pinned', async () => {
  const { sha256Hex } = await import('../vendor/living-seed/vendor/seed-library/sha256.mjs');
  const d = wide(900, 5), tr = rows(0, 600), wider = growDeep(d, tr, 3, { ...SMALL, held: 1 / 2 }), plain = growDeep(d, tr, 3, SMALL);
  assert.notDeepEqual(wider.stages, plain.stages);
  assert.equal(sha256Hex(JSON.stringify(wider)).slice(0, 16), 'f2cd9edb9faf4508');
});

/** a coded column (a month-like category, 1 … 6, the third far more common) whose middle value carries the outcome, beside noise */
function coded(n, seed) {
  const r = rng(seed), cols = { m: new Float64Array(n), z: new Float64Array(n) }, y = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const u = r(), m = u < 0.4 ? 3 : 1 + Math.floor(r() * 6); cols.m[i] = m; cols.z[i] = r(); y[i] = Number(r() < (m === 4 ? 0.7 : 0.15)); }
  return { features: ['m', 'z'], cols, y, n };
}

test('cuts "values": a column of few distinct values is cut between its actual values; a many-valued column keeps the grid', () => {
  const d = coded(400, 2), rs = rows(0, 400), q = fitter(d, rs), v = fitter(d, rs, 'values'), g = { on: 1, f0: 0, q0: 3, d0: 1, w0: 6 };
  assert.deepEqual(v(g).rules[0], { feat: 'm', op: '>', v: 4, w: 1 }, 'the fourth distinct value of 1 … 6');
  assert.deepEqual(v({ ...g, q0: 9 }).rules[0].v, 4, 'an index wraps over the six values');
  assert.deepEqual(q(g), fit(d, rs, g), 'quantile cuts are the seed library’s');
  const z = { ...g, f0: 1 };
  assert.deepEqual(v(z), q(z), 'a column of 400 distinct values keeps the grid');
  const few = { features: ['m'], cols: { m: Float64Array.from({ length: 32 }, (_, i) => i % 16) }, y: new Uint8Array(32), n: 32 }, many = { ...few, cols: { m: Float64Array.from({ length: 34 }, (_, i) => i % 17) } };
  assert.equal(fitter(few, rows(0, 32), 'values')({ on: 1, f0: 0, q0: 15, d0: 1, w0: 6 }).rules[0].v, 15, '16 distinct values: still cut between them');
  assert.deepEqual(fitter(many, rows(0, 34), 'values')({ on: 1, f0: 0, q0: 15, d0: 1, w0: 6 }), fit(many, rows(0, 34), { on: 1, f0: 0, q0: 15, d0: 1, w0: 6 }), '17: the grid');
});

test('a body grown with value cuts is pinned byte for byte (the values path of the search, its splits and its expression)', async () => {
  const { sha256Hex } = await import('../vendor/living-seed/vendor/seed-library/sha256.mjs');
  const d = coded(2400, 6), b = growDeep(d, rows(0, 1200), 2, { ...SMALL, cuts: 'values' });
  assert.ok(b.stages.length >= 1 && b.stages.every((c) => c.rules.every((r) => r.feat !== 'm' || Number.isInteger(r.v))), 'every cut on the coded column is one of its values');
  assert.equal(sha256Hex(JSON.stringify(b)).slice(0, 16), '3a32a6a540150b28');
});

/** a pure interaction: the outcome follows whether two columns share a sign — no single column says anything */
function joint(n, seed) {
  const r = rng(seed), f = ['x0', 'x1', 'x2', 'x3'], cols = Object.fromEntries(f.map((k) => [k, new Float64Array(n)])), y = new Uint8Array(n);
  for (let i = 0; i < n; i++) { for (const k of f) cols[k][i] = r() * 2 - 1; y[i] = Number(r() < ((cols.x0[i] > 0) === (cols.x1[i] > 0) ? 0.8 : 0.2)); }
  return { features: f, cols, y, n };
}

test('scoreCard is the seed library’s scoreRow for single rules; a paired rule fires only when both its conditions hold', () => {
  const d = wide(300, 4), f = fitter(d, rows(0, 300)), r = rng(11);
  for (let k = 0; k < 40; k++) { const card = f(randomGenome(r)); for (const i of [0, 7, 150, 299]) assert.equal(scoreCard(card, d, i), scoreRow(card, d, i)); }
  const ds = { cols: { a: [1, 1, -1, -1, 0.5], b: [1, -1, 1, -1, 0.5] } }, card = { rules: [{ feat: 'a', op: '>', v: 0, w: 2, and: { feat: 'b', op: '>', v: 0 } }, { feat: 'a', op: '>', v: 0, w: 0.25, and: { feat: 'a', op: '<=', v: 0.5 } }] };
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => scoreCard(card, ds, i)), [2, 0, 0, 0, 2.25], 'both conditions, and an interval on one column');
});

test('the genome operations carry the second condition: drawn in range, crossed slot by slot from one parent, one change a mutation', () => {
  assert.deepEqual(genomeOps(false), { stem: stemGenome, random: randomGenome, cross: crossGenome, mutate: mutateGenome });
  const G = genomeOps(true), r = rng(21), slots = [0, 1, 2, 3, 4, 5];
  const st = G.stem();
  assert.ok(slots.every((k) => st['a' + k] === 0 && st['g' + k] === k && st['h' + k] === 7 && st['e' + k] === 1), 'the stem pairs nothing');
  for (let t = 0; t < 30; t++) {
    const a = G.random(r), b = G.random(r), c = G.cross(a, b, r), m = G.mutate(a, r);
    assert.ok(slots.every((k) => [0, 1].includes(a['a' + k]) && a['g' + k] >= 0 && a['g' + k] < 16 && a['h' + k] >= 0 && a['h' + k] < 15 && [0, 1].includes(a['e' + k])));
    assert.ok(slots.every((k) => ['a', 'g', 'h', 'e'].every((f) => c[f + k] === a[f + k]) || ['a', 'g', 'h', 'e'].every((f) => c[f + k] === b[f + k])), 'each slot from one parent');
    assert.ok(Object.keys(a).filter((key) => m[key] !== a[key]).length <= 1, 'one change');
    assert.ok(slots.every((k) => m['h' + k] >= 0 && m['h' + k] < 15));
  }
  const edge = { ...G.random(r), h0: 14, h1: 14, h2: 14, h3: 0, h4: 0, h5: 0 };
  let moved = 0;
  for (let t = 0; t < 400; t++) { const m = G.mutate(edge, rng(t)); assert.ok([0, 1, 2].every((k) => m['h' + k] <= 14) && [3, 4, 5].every((k) => m['h' + k] >= 0), 'the cut stays on the grid'); moved += [0, 1, 2, 3, 4, 5].some((k) => m['h' + k] !== edge['h' + k]); }
  assert.ok(moved > 10, 'cuts at the edge are moved inward: ' + moved);
});

test('on a pure interaction, single-column rules find nothing and paired rules find it (pinned)', async () => {
  const { sha256Hex } = await import('../vendor/living-seed/vendor/seed-library/sha256.mjs');
  const d = joint(3000, 4), tr = rows(0, 1500), held = rows(1500, 3000), y = held.map((i) => d.y[i]), S = { population: 24, elites: 6, generations: 12, stages: 6 };
  const A = (b) => auc(held.map((i) => scoreDeep(b, d, i)), y);
  for (const seed of [2, 3]) { assert.ok(A(growDeep(d, tr, seed, S)) < 0.53); assert.ok(A(growDeep(d, tr, seed, { ...S, pairs: true })) > 0.65, 'seed ' + seed); }
  assert.deepEqual([1, 2, 3].map((seed) => sha256Hex(JSON.stringify(growDeep(d, tr, seed, { ...S, pairs: true }))).slice(0, 16)), ['531023ece18588ff', '74ec14a32a390fa4', 'c23ba77395add997']);
});
