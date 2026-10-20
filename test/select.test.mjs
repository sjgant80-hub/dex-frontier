// select.test.mjs — the mesh chooses its own coupling, out of fold, never on the cases it will be judged on. Synthetic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linear, trees, oofAuc, choose } from '../src/select.mjs';
import { couple, coupled } from '../src/compose.mjs';
import { rng, auc } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

/** additive: y follows a + b; interacting: y follows a only where b is high (an XOR-like shape a sum cannot draw) */
function world(n, seed, kind) {
  const r = rng(seed), a = [], b = [], y = [];
  for (let i = 0; i < n; i++) {
    const u = r() * 4 - 2, v = r() * 4 - 2, z = kind === 'additive' ? 1.2 * u + 1.2 * v : (u > 0) === (v > 0) ? 2.5 : -2.5;
    y.push(Number(r() < 1 / (1 + Math.exp(-z)))); a.push(u + (r() - 0.5) * 0.2); b.push(v + (r() - 0.5) * 0.2);
  }
  return { cols: [a, b], y };
}
const T = { rounds: 40, rate: 0.2, bins: 16, lambda: 1, minHess: 1 };

test('linear and trees share one interface; linear is organ 2’s coupling exactly', () => {
  const w = world(400, 3, 'additive'), m = linear.learn(w.cols, w.y), c = couple(w.cols, w.y);
  assert.equal(linear.name, 'linear'); assert.equal(m.predict([w.cols[0][5], w.cols[1][5]]), coupled(c, [w.cols[0][5], w.cols[1][5]]));
  const t = trees(T), tm = t.learn(w.cols, w.y);
  assert.equal(t.name, 'trees'); assert.ok(Number.isFinite(tm.predict([0.3, -0.2])));
  assert.ok(tm.predict([1.5, 1.5]) > tm.predict([-1.5, -1.5]), 'more of both reads higher');
  assert.ok(tm.m.trees.every((tr) => /^n[01]$/.test(tr.f)), 'the trees read only the two score columns');
});

test('out of fold: every row is predicted by a coupling that never learned from it', () => {
  const w = world(400, 3, 'additive'), o = oofAuc(linear, w.cols, w.y, 4);
  assert.ok(o > 0.8 && o < auc(w.cols[0].map((v, i) => v + w.cols[1][i]), w.y) + 0.02, 'oof ' + o);
  assert.equal(oofAuc(linear, w.cols, w.y, 4), o, 'deterministic');
  assert.ok(Math.abs(o - 0.8336958423960599) < 1e-12, 'the exact four-fold value: each quarter held out once, learned on the other three'); assert.notEqual(oofAuc(linear, w.cols, w.y, 3), o, 'the folds count');
  // by hand, fold 0 of 2: learn on the odd rows, predict the even ones
  const odd = w.y.map((_, i) => i).filter((i) => i % 2), even = w.y.map((_, i) => i).filter((i) => !(i % 2));
  const m1 = linear.learn(w.cols.map((c) => odd.map((i) => c[i])), odd.map((i) => w.y[i])), m0 = linear.learn(w.cols.map((c) => even.map((i) => c[i])), even.map((i) => w.y[i]));
  const pred = w.y.map((_, i) => (i % 2 ? m0 : m1).predict([w.cols[0][i], w.cols[1][i]]));
  assert.equal(oofAuc(linear, w.cols, w.y, 2), auc(pred, w.y));
});

test('choose: on an additive world the linear coupling wins; where the nodes interact, the trees do', () => {
  const add = world(800, 5, 'additive'), xor = world(800, 6, 'interacting');
  const a = choose([linear, trees(T)], add.cols, add.y), x = choose([linear, trees(T)], xor.cols, xor.y);
  assert.equal(a.chosen, 'linear', JSON.stringify(a.scored)); assert.equal(x.chosen, 'trees', JSON.stringify(x.scored));
  assert.ok(x.scored[1].oof > x.scored[0].oof + 0.2, 'a sum cannot draw an interaction');
  assert.deepEqual(a.scored.map((s) => s.name), ['linear', 'trees']);
  assert.equal(a.model.predict([1, 1]), linear.learn(add.cols, add.y).predict([1, 1]), 'the chosen one, learned on all the rows');
  const tie = choose([linear, { ...linear, name: 'linear-again' }], add.cols, add.y);
  assert.equal(tie.chosen, 'linear', 'a tie goes to the first');
});
