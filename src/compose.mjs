// src/compose.mjs — κ, the coupling: how a mesh of specialists answers as one. Each live node scores a case from its own
// silo; the coupling learns, from outcomes on the GATE rows only, how much each node's word is worth, and answers with
// the weighted sum (a logistic regression over the nodes' standardised scores, Newton's method, L2). A node that was cut
// or abstains says nothing and is left out. The shams it must beat are here too, so the measuring stick is gated with
// the thing it measures: random routing (each case answered by one live node, chosen at random) and a coupling learned
// from shuffled outcomes. Pure, deterministic, total on its inputs.
import { solve } from '../vendor/living-seed/src/baseline.mjs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/** standardise columns on the rows they are fitted on; a column that never varies is divided by 1, found exactly */
export function scale(columns) {
  const mean = columns.map((c) => c.reduce((a, v) => a + v, 0) / c.length);
  const sd = columns.map((c, k) => (c.every((v) => v === c[0]) ? 1 : Math.sqrt(c.reduce((a, v) => a + (v - mean[k]) ** 2, 0) / c.length)));
  return { mean, sd };
}

/**
 * Learn the coupling. columns — one array per node, its scores on the fitting rows; y — those rows' outcomes (0|1).
 * → { weights: [intercept, w1 … wk], mean, sd, lambda, steps }. The intercept is not penalised.
 */
export function couple(columns, y, { lambda = 1, iterations = 50, tol = 1e-10 } = {}) {
  if (!columns.length || columns.some((c) => c.length !== y.length) || !y.length) throw new Error('every node needs a score for every row');
  const { mean, sd } = scale(columns), d = columns.length + 1;
  const X = y.map((_, r) => [1, ...columns.map((c, k) => (c[r] - mean[k]) / sd[k])]);
  let w = new Array(d).fill(0), steps = 0;
  for (; steps < iterations; steps++) {
    const g = new Array(d).fill(0), H = Array.from({ length: d }, () => new Array(d).fill(0));
    X.forEach((x, r) => {
      const p = sigmoid(x.reduce((a, v, k) => a + v * w[k], 0)), q = p * (1 - p);
      for (let a = 0; a < d; a++) { g[a] += (p - y[r]) * x[a]; for (let b = 0; b < d; b++) H[a][b] += q * x[a] * x[b]; }
    });
    for (let a = 1; a < d; a++) { g[a] += lambda * w[a]; H[a][a] += lambda; }
    const step = solve(H, g);
    w = w.map((v, k) => v - step[k]);
    if (Math.max(...step.map(Math.abs)) < tol) { steps++; break; }
  }
  return { weights: w, mean, sd, lambda, steps };
}

/** the coupled answer for one case, from each node's score in the coupling's order (log-odds) */
export function coupled(c, scores) {
  return scores.reduce((a, s, k) => a + c.weights[k + 1] * ((s - c.mean[k]) / c.sd[k]), c.weights[0]);
}

/** one node's own probability: a one-node coupling, learned on the same rows (so nodes can be compared and mixed) */
export const calibrate = (column, y, opts) => couple([column], y, opts);

/** SHAM — random routing: each case is answered by one live node chosen at random (seeded), on its calibrated scale */
export function randomRoute(calibrations, columns, seed) {
  const r = rng(seed), n = columns[0].length;
  return Array.from({ length: n }, (_, i) => { const k = Math.floor(r() * columns.length); return coupled(calibrations[k], [columns[k][i]]); });
}

/** SHAM — a coupling learned from shuffled outcomes (seeded): the same machinery, taught nothing true */
export function shuffled(y, seed) {
  const r = rng(seed), out = Array.from(y);
  for (let i = out.length - 1; i; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }   // Fisher–Yates, down to i = 1
  return out;
}

/** how many numbers a coupling carries: one weight per node, an intercept, and each node's mean and spread */
export const size = (c) => c.weights.length + c.mean.length + c.sd.length;
