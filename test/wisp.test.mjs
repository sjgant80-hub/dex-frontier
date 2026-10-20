// wisp.test.mjs — the mesh as it runs: arrivals, a coupling that learns from outcomes, pruning, a node gone bad.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrivals, order, seenSoFar, windows, contribution, run, breakAt } from '../src/wisp.mjs';
import { rng, auc } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

/** two useful nodes and one useless; in the stream the world shifts: node b's signal flips sign half-way */
function world(n, seed, flip) {
  const r = rng(seed), a = [], b = [], c = [], y = [];
  for (let i = 0; i < n; i++) {
    const u = r() * 4 - 2, v = r() * 4 - 2, sgn = flip && i >= n / 2 ? -1 : 1;
    y.push(Number(r() < 1 / (1 + Math.exp(-(1.2 * u + sgn * 1.2 * v)))));
    a.push(u + (r() - 0.5)); b.push(v + (r() - 0.5)); c.push(r());
  }
  return { cols: [a, b, c], y };
}
const G = world(800, 2, false), S = world(2400, 5, true);
const half = (s) => auc(s.slice(1200), S.y.slice(1200));

test('arrivals are cumulative portions; order is a seeded shuffle; a view grows on what it has seen', () => {
  const rows = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(arrivals(rows, 4).map((a) => a.length), [3, 5, 8, 10]);
  assert.deepEqual(arrivals(rows, 4)[1], [0, 1, 2, 3, 4]);
  assert.deepEqual(arrivals(rows, 1), [rows]); assert.deepEqual(arrivals([], 3), []); assert.deepEqual(arrivals(rows, 0), []);
  assert.deepEqual(order(rows, 3), order(rows, 3)); assert.deepEqual([...order(rows, 3)].sort((p, q) => p - q), rows); assert.notDeepEqual(order(rows, 3), rows);
  assert.deepEqual(order([7], 3), [7]);
  const v = { name: 'x', trainRows: [1, 2, 3], heldRows: [9] };
  assert.deepEqual(seenSoFar(v, [1]), { name: 'x', trainRows: [1], heldRows: [9] });
  assert.deepEqual(windows(7, 3), [[0, 3], [3, 6], [6, 7]]); assert.deepEqual(windows(6, 3), [[0, 3], [3, 6]]); assert.deepEqual(windows(0, 3), []);
});

test('contribution: a useful node adds out of fold, a useless one adds about nothing', () => {
  const ca = contribution(G.cols, 0, G.y), cc = contribution(G.cols, 2, G.y);
  assert.ok(ca > 0.05, 'a adds ' + ca);
  assert.ok(Math.abs(cc) < 0.02, 'c adds ' + cc);
  assert.equal(contribution(G.cols, 0, G.y, 3), contribution(G.cols, 0, G.y, 3), 'deterministic');
  assert.notEqual(contribution(G.cols, 0, G.y, 3), ca, 'the folds count');
});

test('the wisp: when the world shifts, a coupling that learns from outcomes beats one frozen at GATE', () => {
  const frozen = run(G, S, { size: 300 }), learning = run(G, S, { size: 300, learn: true });
  assert.equal(frozen.scores.length, 2400); assert.equal(frozen.live.length, 8);
  assert.ok(half(learning.scores) > half(frozen.scores) + 0.03, 'after the shift: ' + half(learning.scores) + ' vs ' + half(frozen.scores));
  assert.deepEqual(run(G, S, { size: 300, learn: true }).scores, learning.scores, 'deterministic');
  const first = auc(frozen.scores.slice(0, 300), S.y.slice(0, 300)), firstL = auc(learning.scores.slice(0, 300), S.y.slice(0, 300));
  assert.equal(first, firstL, 'the first window is answered before any stream outcome is known: the two agree');
});

test('pruning: a node gone bad mid-stream is cut from the mesh, and the mesh does better without it', () => {
  const calm = world(2400, 8, false), bad = { cols: [calm.cols[0], breakAt(calm.cols[1], 900, 4), calm.cols[2]], y: calm.y };
  assert.deepEqual(bad.cols[1].slice(0, 900), calm.cols[1].slice(0, 900), 'untouched before the break');
  assert.notDeepEqual(bad.cols[1].slice(900), calm.cols[1].slice(900));
  const lo = Math.min(...calm.cols[1]), hi = Math.max(...calm.cols[1]);
  assert.ok(bad.cols[1].every((v) => v >= lo && v <= hi), 'noise on its own scale');
  const kept = run(G, bad, { size: 300, learn: true }), pruned = run(G, bad, { size: 300, learn: true, prune: true });
  assert.ok(!pruned.live[pruned.live.length - 1].includes(1), 'the broken node is pruned: ' + JSON.stringify(pruned.live));
  assert.ok(pruned.live[0].length === 3, 'nothing is pruned before any outcome is known');
  const late = (s) => auc(s.slice(1800), bad.y.slice(1800));
  assert.ok(late(pruned.scores) >= late(kept.scores) - 0.005, 'without the broken node: ' + late(pruned.scores) + ' vs ' + late(kept.scores));
  assert.ok(pruned.live.every((l) => l.length >= 1), 'never pruned to nothing');
});
