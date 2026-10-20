// compose.test.mjs — the coupling is gated like everything else. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scale, couple, coupled, calibrate, randomRoute, shuffled, size } from '../src/compose.mjs';
import { rng, auc } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

/** three specialists, each seeing a different part of the truth: a and b carry signal, c is noise */
function mesh(n, seed) {
  const r = rng(seed), a = [], b = [], c = [], y = [];
  for (let i = 0; i < n; i++) {
    const u = r() * 4 - 2, v = r() * 4 - 2;
    y.push(Number(r() < 1 / (1 + Math.exp(-(1.5 * u + 1.2 * v)))));
    a.push(Math.round(u + (r() - 0.5))); b.push(Math.round(v * 2 + (r() - 0.5)) / 2); c.push(Math.floor(r() * 5));
  }
  return { a, b, c, y };
}
const M = mesh(900, 3), FIT = { a: M.a.slice(0, 600), b: M.b.slice(0, 600), c: M.c.slice(0, 600), y: M.y.slice(0, 600) };
const TEST = { a: M.a.slice(600), b: M.b.slice(600), c: M.c.slice(600), y: M.y.slice(600) };
const aucOf = (scores, y) => auc(scores, y);
const sig = (z) => 1 / (1 + Math.exp(-z));

test('scale: each column’s own mean and spread; a constant column is divided by 1, found exactly', () => {
  const s = scale([[1, 2, 3, 4], [5, 5, 5, 5]]);
  assert.deepEqual(s.mean, [2.5, 5]);
  assert.equal(s.sd[0], Math.sqrt(1.25)); assert.equal(s.sd[1], 1);
  assert.ok(scale([[1, 1, 1, 1.0000001]]).sd[0] < 1e-6, 'a column that varies at all keeps its spread');
});

test('couple: at its answer the penalised gradient is zero, it converged, and the coupled score is its sum', () => {
  const c = couple([FIT.a, FIT.b], FIT.y);
  assert.ok(c.steps >= 3 && c.steps < 50, 'steps ' + c.steps);
  const g = [0, 0, 0];
  FIT.y.forEach((y, r) => {
    const x = [1, (FIT.a[r] - c.mean[0]) / c.sd[0], (FIT.b[r] - c.mean[1]) / c.sd[1]], p = sig(x.reduce((s, v, k) => s + v * c.weights[k], 0));
    x.forEach((v, k) => { g[k] += (p - y) * v; });
  });
  g[1] += c.lambda * c.weights[1]; g[2] += c.lambda * c.weights[2];
  assert.ok(Math.max(...g.map(Math.abs)) < 1e-6, 'gradient ' + g.join(' '));
  assert.ok(c.weights[1] > 0.3 && c.weights[2] > 0.3, 'both specialists count');
  assert.equal(coupled(c, [FIT.a[0], FIT.b[0]]), c.weights[0] + c.weights[1] * ((FIT.a[0] - c.mean[0]) / c.sd[0]) + c.weights[2] * ((FIT.b[0] - c.mean[1]) / c.sd[1]));
  assert.equal(size(c), 3 + 2 + 2);
  assert.equal(couple([FIT.a], FIT.y, { iterations: 1 }).steps, 1, 'stops at the cap');
  const first = Math.max(...couple([FIT.a], FIT.y, { iterations: 1 }).weights.map(Math.abs));
  assert.ok(couple([FIT.a], FIT.y, { tol: first }).steps > 1, 'a step exactly at the tolerance is not under it');
});

test('couple: the intercept is not penalised; a big penalty silences every node; bad input is refused', () => {
  const big = couple([FIT.a, FIT.b], FIT.y, { lambda: 1e7 }), base = FIT.y.reduce((s, v) => s + v, 0) / FIT.y.length;
  assert.ok(Math.abs(big.weights[0] - Math.log(base / (1 - base))) < 1e-3);
  assert.ok(Math.abs(big.weights[1]) < 1e-3 && Math.abs(big.weights[2]) < 1e-3);
  assert.throws(() => couple([], FIT.y), /every node needs a score/);
  assert.throws(() => couple([FIT.a.slice(1)], FIT.y), /every node needs a score/);
  assert.throws(() => couple([[]], []), /every node needs a score/);
  const flat = couple([FIT.a, new Array(600).fill(2)], FIT.y);
  assert.equal(flat.sd[1], 1); assert.ok(flat.weights.every(Number.isFinite));
});

test('composition: two specialists coupled beat either alone on unseen rows; a noise node earns almost nothing', () => {
  const both = couple([FIT.a, FIT.b], FIT.y), withNoise = couple([FIT.a, FIT.b, FIT.c], FIT.y);
  const composed = TEST.a.map((_, i) => coupled(both, [TEST.a[i], TEST.b[i]]));
  assert.ok(aucOf(composed, TEST.y) > aucOf(TEST.a, TEST.y) + 0.02 && aucOf(composed, TEST.y) > aucOf(TEST.b, TEST.y) + 0.02);
  assert.ok(Math.abs(withNoise.weights[3]) < 0.2 * Math.min(withNoise.weights[1], withNoise.weights[2]), 'the noise node is weighed down');
});

test('shams: random routing answers each case from one node; a coupling taught shuffled outcomes learns nothing true', () => {
  const ca = calibrate(FIT.a, FIT.y), cb = calibrate(FIT.b, FIT.y);
  const routed = randomRoute([ca, cb], [TEST.a, TEST.b], 11);
  assert.equal(routed.length, TEST.a.length);
  assert.ok(routed.every((v, i) => v === coupled(ca, [TEST.a[i]]) || v === coupled(cb, [TEST.b[i]])), 'each answer is one node’s own');
  const fromA = routed.filter((v, i) => v === coupled(ca, [TEST.a[i]])).length;
  assert.ok(fromA > 100 && fromA < 200, 'both nodes are chosen: ' + fromA);
  assert.deepEqual(randomRoute([ca, cb], [TEST.a, TEST.b], 11), routed, 'seeded');
  const composed = TEST.a.map((_, i) => coupled(couple([FIT.a, FIT.b], FIT.y), [TEST.a[i], TEST.b[i]]));
  assert.ok(aucOf(composed, TEST.y) > aucOf(routed, TEST.y) + 0.02, 'coupling beats routing alone');
  const sy = shuffled(FIT.y, 5);
  assert.deepEqual([...sy].sort(), [...FIT.y].sort(), 'the same outcomes, reordered');
  assert.notDeepEqual(sy, FIT.y);
  assert.deepEqual(shuffled(FIT.y, 5), sy, 'seeded');
  assert.equal(shuffled([1], 3)[0], 1);
  assert.deepEqual(shuffled([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5), [5, 3, 7, 8, 2, 0, 4, 1, 9, 6], 'the one Fisher–Yates order for seed 5');
  const sham = couple([FIT.a, FIT.b], sy), shamScores = TEST.a.map((_, i) => coupled(sham, [TEST.a[i], TEST.b[i]]));
  assert.ok(Math.abs(aucOf(shamScores, TEST.y) - 0.5) < 0.12 || Math.abs(sham.weights[1]) + Math.abs(sham.weights[2]) < 0.3, 'taught nothing true');
});

test('a non-negative coupling: the free one when every weight is already positive; otherwise the node pulled below zero is silenced', async () => {
  const { coupleNonNegative } = await import('../src/compose.mjs');
  const free = couple([FIT.a, FIT.b], FIT.y), nn = coupleNonNegative([FIT.a, FIT.b], FIT.y);
  assert.deepEqual(nn.weights, free.weights, 'nothing to silence: the same coupling'); assert.deepEqual(nn.silenced, []); assert.equal(nn.k, 2);
  // c is noise, and against = −a: a free coupling counts "against" negatively; the non-negative one silences it
  const against = FIT.a.map((v) => -v + 0.01 * FIT.c[FIT.a.indexOf(v)]);
  const f2 = couple([FIT.b, against], FIT.y), n2 = coupleNonNegative([FIT.b, against], FIT.y);
  assert.ok(f2.weights[2] < 0, 'the free coupling counts it against: ' + f2.weights[2]);
  assert.deepEqual(n2.silenced, [1]); assert.equal(n2.weights[2], 0);
  assert.deepEqual(n2.weights.slice(0, 2), couple([FIT.b], FIT.y).weights, 'the rest is the coupling of the nodes left');
  assert.ok(n2.weights.slice(1).every((w) => w >= 0), 'never a negative weight');
  assert.equal(n2.mean.length, 2); assert.equal(coupled(n2, [FIT.b[0], against[0]]), coupled(couple([FIT.b], FIT.y), [FIT.b[0]]), 'a silenced node changes no answer');
  const alone = coupleNonNegative([against], FIT.y);
  assert.deepEqual(alone.weights.slice(1), [0], 'a lone node against its evidence says nothing'); assert.deepEqual(alone.silenced, []);
  const three = coupleNonNegative([FIT.a, against.map((v) => v * 2), FIT.b], FIT.y);
  assert.ok(three.silenced.includes(1) && three.weights[2] === 0 && three.weights[1] > 0 && three.weights[3] > 0, JSON.stringify(three.weights));
  const still = coupleNonNegative([FIT.a, new Array(600).fill(3)], FIT.y);
  assert.equal(couple([FIT.a, new Array(600).fill(3)], FIT.y).weights[2], 0, 'a node that never varies gets a free weight of exactly 0');
  assert.deepEqual(still.silenced, [], 'and a weight of exactly 0 is not below zero: nothing is silenced');
  const twins = coupleNonNegative([against, against.slice()], FIT.y);
  assert.deepEqual(twins.silenced, [0], 'two equally against: the first is silenced, and the last one left stands alone');
});
