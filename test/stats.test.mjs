// stats.test.mjs — the bound every sealed lead is judged by.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pairedLow, lead, median } from '../src/stats.mjs';
import { rng, auc } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

const r = rng(4), n = 400, y = [], good = [], weak = [], noise = [];
for (let i = 0; i < n; i++) { const t = Number(r() < 0.3); y.push(t); good.push(t * 1.5 + r()); weak.push(t * 0.4 + r()); noise.push(r()); }

test('a clear lead has a lower bound above zero; a contestant against itself has a bound of exactly zero', () => {
  const low = pairedLow(good, weak, y, 400);
  assert.ok(low > 0.05, 'bound ' + low);
  assert.ok(low < auc(good, y) - auc(weak, y), 'the bound sits below the lead');
  assert.equal(pairedLow(good, good, y, 200), 0);
  assert.ok(pairedLow(weak, good, y, 400) < -0.05, 'the other way round, it is below zero');
});

test('the bound is seeded, reads the 2.5th percentile, and refuses contestants without a score for every case', () => {
  assert.equal(pairedLow(good, weak, y, 300, 7), pairedLow(good, weak, y, 300, 7));
  assert.notEqual(pairedLow(good, weak, y, 300, 7), pairedLow(good, weak, y, 300, 8));
  const wide = pairedLow(weak, noise, y, 2000), narrow = pairedLow(weak, noise, y, 40);
  assert.ok(Number.isFinite(wide) && Number.isFinite(narrow));
  // the 2.5th percentile of 40 resamples is the 2nd smallest: rebuild it by hand
  const rr = rng(99), d = [];
  for (let k = 0; k < 40; k++) { const idx = y.map(() => Math.floor(rr() * y.length)); d.push(auc(idx.map((i) => weak[i]), idx.map((i) => y[i])) - auc(idx.map((i) => noise[i]), idx.map((i) => y[i]))); }
  d.sort((p, q) => p - q);
  assert.equal(narrow, Math.round(d[1] * 1e6) / 1e6);
  // exactly n resamples, no more: with n = 1 the bound IS that one resample's difference, for every seed
  for (const seed of [1, 2, 3, 4, 5]) {
    const q = rng(seed), idx = y.map(() => Math.floor(q() * y.length));
    const one = auc(idx.map((i) => weak[i]), idx.map((i) => y[i])) - auc(idx.map((i) => noise[i]), idx.map((i) => y[i]));
    assert.equal(pairedLow(weak, noise, y, 1, seed), Math.round(one * 1e6) / 1e6, 'seed ' + seed);
  }
  assert.throws(() => pairedLow(good.slice(1), weak, y), /a score for every case/);
  assert.throws(() => pairedLow(good, weak.slice(1), y), /a score for every case/);
  assert.throws(() => pairedLow([], [], []), /a score for every case/);
});

test('lead: both AUCs, the difference and its bound; median: the middle (the lower of two)', () => {
  const l = lead(good, weak, y, 300);
  assert.equal(l.a, Math.round(auc(good, y) * 1e6) / 1e6); assert.equal(l.b, Math.round(auc(weak, y) * 1e6) / 1e6);
  assert.equal(l.lead, Math.round((auc(good, y) - auc(weak, y)) * 1e6) / 1e6);
  assert.equal(l.low95, pairedLow(good, weak, y, 300));
  assert.equal(median([3, 1, 2]), 2); assert.equal(median([4, 1, 3, 2]), 2); assert.equal(median([]), null); assert.equal(median([5]), 5);
});
