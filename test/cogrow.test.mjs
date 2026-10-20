// cogrow.test.mjs — growth that composes. Synthetic only: a strong neighbour knows u; this node's silo holds u again
// (redundant) and v (what the neighbour lacks). Grown alone it may pick u; co-grown it must find v.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinFitness, cogrow } from '../src/cogrow.mjs';
import { rng, splitRows, grow, fit, scoreRow, auc } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { couple, coupled } from '../src/compose.mjs';

function world(n, seed) {
  const r = rng(seed), u = new Float64Array(n), v = new Float64Array(n), y = new Uint8Array(n), neighbour = [];
  for (let i = 0; i < n; i++) { u[i] = r() * 10; v[i] = r() * 10; y[i] = Number(r() < 1 / (1 + Math.exp(-(0.9 * (u[i] - 5) + 0.6 * (v[i] - 5))))); neighbour.push(u[i] + (r() - 0.5) * 2); }
  const rows = Array.from({ length: n }, (_, i) => i);
  return { view: { features: ['u', 'v'], cols: { u, v }, y, n, trainRows: rows, heldRows: [] }, neighbour, rows };
}
const W = world(900, 3), others = (i) => [W.neighbour[i]], QUICK = { population: 14, elites: 3, generations: 10 };
const card = (g, rows) => fit(W.view, rows, g);
const uses = (g, rows) => card(g, rows).rules.map((x) => x.feat);

test('joinFitness: the coupled AUC on the inner held rows, of the candidate fitted and coupled on the rest', () => {
  const inner = splitRows(W.view, W.rows, 1 / 3, 5);
  const vOnly = { on: 1, f0: 1, q0: 7, d0: 1, w0: 6, f1: 0, q1: 0, d1: 0, w1: 0, f2: 0, q2: 0, d2: 0, w2: 0, f3: 0, q3: 0, d3: 0, w3: 0, f4: 0, q4: 0, d4: 0, w4: 0, f5: 0, q5: 0, d5: 0, w5: 0 };
  const uOnly = { ...vOnly, f0: 0 };
  const fv = joinFitness(W.view, inner, vOnly, others), fu = joinFitness(W.view, inner, uOnly, others);
  assert.ok(fv > fu + 0.02, 'a rule on what the neighbour lacks adds more: ' + fv + ' vs ' + fu);
  const alone = auc(inner.held.map((i) => W.neighbour[i]), inner.held.map((i) => W.view.y[i]));
  assert.ok(fv > alone, 'and it adds to the neighbour alone');
  assert.equal(joinFitness(W.view, inner, vOnly, others), fv, 'deterministic');
});

test('co-grown, the node finds what the mesh lacks; grown alone it is drawn to what it already has', () => {
  const co = cogrow(W.view, W.rows, 7, QUICK, others), solo = grow(W.view, W.rows, 7, QUICK);
  assert.ok(uses(co.champion, W.rows).includes('v'), 'co-growth uses v: ' + uses(co.champion, W.rows));
  assert.equal(co.history.length, QUICK.generations); assert.equal(co.evals, QUICK.population + (QUICK.generations - 1) * (QUICK.population - QUICK.elites));
  assert.ok(co.history.every((h, k) => k === 0 || h >= co.history[k - 1]), 'the elites keep the best: the climb never falls');
  assert.equal(co.fitness, co.history[co.history.length - 1]);
  // the composed mesh on rows it did not grow on: neighbour + co-grown node beats neighbour + solo-grown node
  const test = world(900, 11), yW = W.rows.map((i) => W.view.y[i]), yT = test.rows.map((i) => test.view.y[i]);
  const composedOnTest = (g) => {
    const c = fit(W.view, W.rows, g), sW = W.rows.map((i) => scoreRow(c, W.view, i)), sT = test.rows.map((i) => scoreRow(c, test.view, i));
    const k = couple([W.rows.map((i) => W.neighbour[i]), sW], yW);
    return auc(test.rows.map((i, r) => coupled(k, [test.neighbour[i], sT[r]])), yT);
  };
  assert.ok(composedOnTest(co.champion) >= composedOnTest(solo.champion) - 0.005, 'co-growth composes at least as well: ' + composedOnTest(co.champion) + ' vs ' + composedOnTest(solo.champion));
  assert.deepEqual(cogrow(W.view, W.rows, 7, QUICK, others).champion, co.champion, 'seeded');
  assert.deepEqual(co.history, [0.921545, 0.921545, 0.921545, 0.921545, 0.921545, 0.921545, 0.921545, 0.921545, 0.927274, 0.927274], 'the one climb for seed 7');
  assert.equal(co.champion.on, 60);
});
