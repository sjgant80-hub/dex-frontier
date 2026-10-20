// deep.test.mjs — the deeper grown body: the seed library's ribosome grown in stages, each kept only if it pays. Synthetic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { growDeep, scoreDeep, DEEP } from '../src/deep.mjs';
import { rng, auc, fit, scoreRow } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

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
  assert.deepEqual(DEEP, { population: 40, elites: 8, generations: 30, stages: 8 });
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
