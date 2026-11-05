// breedtrees.test.mjs — breeding what the mesh fields: boosted trees bred by their recipe. The first founder is the
// recipe a department fields today; a child takes every gene and every column's in-or-out from one parent or the other,
// at most one changed, and is born only if it leads its better parent beyond the noise on rows no parent grew on.
// Synthetic department only (small, so the suite stays fast enough to mutate).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { INCUMBENT, GENES, legalDrop, randomRecipe, crossRecipe, readOf, growRecipe, evolveTrees } from '../src/breedtrees.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

function view(n) {   // two columns that matter only together (an exclusive or, 15% of outcomes flipped) and four that never matter
  const F = ['a', 'b', 'c', 'd', 'e', 'f'], r = rng(21), cols = Object.fromEntries(F.map((f) => [f, new Float64Array(n)])), y = new Uint8Array(n);
  for (let i = 0; i < n; i++) { for (const f of F) cols[f][i] = r() * 10; const s = (cols.a[i] > 5) !== (cols.b[i] > 5); y[i] = Number(r() < (s ? 0.85 : 0.15)); }
  return { features: F, cols, y, n };
}
const V = view(480), ROWS = Array.from({ length: 480 }, (_, i) => i), GROW = ROWS.filter((i) => i % 2), CHECK = ROWS.filter((i) => !(i % 2));
const RUN = { view: V, growRows: GROW, checkRows: CHECK, founders: [1, 2, 3, 4], generations: 2, attempts: 4, resamples: 60, seed: 3 };
const hash = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
const NAMES = Object.keys(GENES);

test('the incumbent is the kernel’s own defaults on every column, and each gene’s values include it', () => {
  assert.deepEqual({ ...INCUMBENT, drop: [...INCUMBENT.drop] }, { rounds: 200, rate: 0.1, bins: 32, lambda: 1, minHess: 1, drop: [] });
  for (const k of NAMES) assert.ok(GENES[k].includes(INCUMBENT[k]), k);
  const mine = growRecipe(V, GROW, INCUMBENT).model, theirs = boosted(V, GROW);
  assert.deepEqual(CHECK.map((i) => mine.score(i)), CHECK.map((i) => theirs.score(i)), 'the incumbent grows exactly the boosted trees a department fields');
});

test('legalDrop: whole, distinct, in range, ascending, and never more than half the columns', () => {
  assert.deepEqual(legalDrop([3, 1, 1, 'x', -1, 2.5, 9, 6], 6), [1, 3]);
  assert.deepEqual(legalDrop([0], 6), [0], 'column 0 may be left out');
  assert.deepEqual(legalDrop([5], 6), [5], 'the last column may be left out');
  assert.deepEqual(legalDrop([0, 1, 2, 3, 4], 6), [0, 1, 2]);
  assert.deepEqual(legalDrop([4, 3, 2, 1, 0], 5), [0, 1]);
  assert.deepEqual(legalDrop([0], 1), [], 'a one-column department reads its column');
  assert.deepEqual(legalDrop([1], 2), [1]);
  assert.deepEqual(legalDrop('x', 4), []); assert.deepEqual(legalDrop(null, 4), []);
});

test('randomRecipe: every gene from its values, a column left out about one time in four, deterministic and pinned', () => {
  const rs = Array.from({ length: 400 }, (_, s) => randomRecipe(rng(s + 1), 8));
  for (const g of rs) { for (const k of NAMES) assert.ok(GENES[k].includes(g[k]), k); assert.deepEqual(g.drop, legalDrop(g.drop, 8)); }
  const out = rs.reduce((a, g) => a + g.drop.length, 0) / (400 * 8);
  assert.ok(out > 0.18 && out < 0.3, 'columns left out: ' + out);
  for (const k of NAMES) assert.equal(new Set(rs.map((g) => g[k])).size, GENES[k].length, 'every value of ' + k + ' is drawn');
  assert.deepEqual(randomRecipe(rng(7), 8), randomRecipe(rng(7), 8));
  assert.equal(hash(rs.slice(0, 20)), '4473e1200f741672');
});

test('crossRecipe: each gene and each column from one parent or the other, at most one changed, about half the children', () => {
  let changed = 0;
  for (let s = 1; s <= 200; s++) {
    const a = randomRecipe(rng(1000 + s), 6), b = randomRecipe(rng(2000 + s), 6), c = crossRecipe(a, b, 6, rng(s));
    const genes = NAMES.filter((k) => c[k] !== a[k] && c[k] !== b[k]).length;
    const cols = [0, 1, 2, 3, 4, 5].filter((k) => c.drop.includes(k) !== a.drop.includes(k) && c.drop.includes(k) !== b.drop.includes(k)).length;
    assert.ok(genes + cols <= 1, 'only the one change may be neither parent’s');
    for (const k of NAMES) assert.ok(GENES[k].includes(c[k]), k);
    assert.deepEqual(c.drop, legalDrop(c.drop, 6));
    const same = randomRecipe(rng(3000 + s), 6), self = crossRecipe(same, same, 6, rng(s));
    if (JSON.stringify(self) !== JSON.stringify(same)) changed++;
  }
  assert.ok(changed > 40 && changed < 110, 'a recipe crossed with itself changes about half the time, less a redraw that lands on itself: ' + changed);
  const flips = Array.from({ length: 300 }, (_, s) => crossRecipe({ ...INCUMBENT, drop: [] }, { ...INCUMBENT, drop: [] }, 6, rng(s + 5))).filter((c) => c.drop.length === 1).length;
  assert.ok(flips > 10, 'the change sometimes leaves one column out: ' + flips);
  assert.deepEqual(crossRecipe(INCUMBENT, INCUMBENT, 1, rng(9)).drop, [], 'never the last column');
  const three = { ...INCUMBENT, drop: [0, 1, 2] }, back = Array.from({ length: 300 }, (_, s) => crossRecipe(three, three, 6, rng(s + 9)).drop);
  for (const d of back) assert.ok(d.length >= 2 && d.every((k) => [0, 1, 2].includes(k)), 'a column left out by both parents comes back, or nothing changes: ' + JSON.stringify(d));
  assert.ok(back.filter((d) => d.length === 2).length > 4, 'the change sometimes reads a column again');
  assert.equal(hash(Array.from({ length: 12 }, (_, s) => crossRecipe(randomRecipe(rng(s + 40), 6), randomRecipe(rng(s + 80), 6), 6, rng(s)))), 'ec973eb1049acb59');
});

test('readOf and growRecipe: the columns a recipe reads, and every wrong argument refused', () => {
  assert.deepEqual(readOf(V, [1, 3]).features, ['a', 'c', 'e', 'f']);
  assert.deepEqual(readOf(V, []).features, V.features);
  const g = { ...INCUMBENT, rounds: 50, drop: [0, 1] }, body = growRecipe(V, GROW, g);
  assert.equal(body.kind, 'boosted'); assert.deepEqual(body.recipe, g);
  const reads = (m) => new Set(m.trees.flatMap((t) => [t.f, ...t.kids.filter((k) => 'f' in k).map((k) => k.f)]));
  assert.ok([...reads(body.model)].every((f) => ['c', 'd', 'e', 'f'].includes(f)), 'it reads only the columns it keeps');
  assert.equal(body.model.trees.length, 50);
  const legal = reads(growRecipe(V, GROW, { ...g, drop: [5, 0, 1, 2, 3] }).model);
  assert.ok(legal.has('d') || legal.has('e') || legal.has('f'), 'a drop is made legal before it is read (three of six at most)');
  assert.ok(!legal.has('a') && !legal.has('b') && !legal.has('c'));
  for (const bad of [[null, GROW, g], [{ ...V, features: 'a' }, GROW, g], [{ ...V, features: [] }, GROW, g], [{ ...V, cols: null }, GROW, g], [{ ...V, y: null }, GROW, g],
    [V, 'x', g], [V, [], g], [V, GROW, null], [V, GROW, { ...g, drop: 'x' }]]) assert.equal(growRecipe(...bad), null);
});

test('evolveTrees: the incumbent first, a child born only beyond the noise on CHECK, two parents named, the best never falls', () => {
  const e = evolveTrees(RUN);
  assert.equal(e.ok, true);
  assert.deepEqual(e.founders.map((f) => f.id), ['f1', 'f2', 'f3', 'f4']);
  assert.deepEqual(e.founders[0].recipe, { ...INCUMBENT, drop: [] });
  assert.equal(e.founders[0].check, e.incumbent.check);
  assert.ok(e.founders.slice(1).every((f) => JSON.stringify(f.recipe) !== JSON.stringify(e.founders[0].recipe)));
  assert.equal(e.born + e.refused, RUN.generations * RUN.attempts);
  assert.equal(e.history.length, RUN.generations + 1);
  assert.ok(e.history.every((h, k) => k === 0 || h >= e.history[k - 1]), 'the best never falls');
  const known = new Set(e.founders.map((f) => f.id));
  for (const l of e.lineage) {
    assert.ok(l.bound > 0, 'born beyond the noise');
    assert.equal(l.parents.length, 2); assert.notEqual(l.parents[0], l.parents[1]);
    assert.ok(l.parents.every((p) => known.has(p)));
    known.add(l.child);
  }
  assert.equal(e.champion.check, e.history[e.history.length - 1]);
  assert.deepEqual(evolveTrees(RUN), e, 'the same population twice');
  assert.equal(e.born, 1);
  assert.deepEqual(e.lineage.map((l) => [l.child, ...l.parents]), [['c1', 'f4', 'f1']]);
  assert.ok(e.champion.check > e.incumbent.check, 'here a child beat the recipe fielded today');
  assert.equal(e.champion.id, 'c1');
  assert.equal(hash(e), '048ddb1adb8a0fae');
  const zero = evolveTrees({ ...RUN, generations: 0 });
  assert.equal(zero.born, 0); assert.equal(zero.history.length, 1);
  const none = evolveTrees({ ...RUN, attempts: 0 });
  assert.equal(none.born + none.refused, 0); assert.equal(none.history.length, RUN.generations + 1);
  const two = evolveTrees({ ...RUN, founders: [1, 2], size: 2, generations: 1, attempts: 2 });
  assert.equal(two.ok, true); assert.equal(two.founders.length, 2);
});

test('evolveTrees: every wrong argument refused with the reason, never thrown', () => {
  const no = 'breeding needs a view with columns and outcomes, and grow and check rows';
  for (const bad of [{ view: null }, { view: { ...V, features: 'a' } }, { view: { ...V, features: [] } }, { view: { ...V, cols: null } }, { view: { ...V, y: null } },
    { growRows: 'x' }, { checkRows: 'x' }, { growRows: [] }, { checkRows: [] }]) assert.deepEqual(evolveTrees({ ...RUN, ...bad }), { ok: false, error: no }, JSON.stringify(Object.keys(bad)));
  const f = 'breeding needs at least two founders, each a different whole-number seed';
  for (const founders of ['x', [1], [1, 2.5], [2, 2]]) assert.deepEqual(evolveTrees({ ...RUN, founders }), { ok: false, error: f }, JSON.stringify(founders));
  const g = 'generations and attempts are whole numbers, and the population keeps at least two';
  for (const bad of [{ generations: 1.5 }, { attempts: 'x' }, { size: 1 }, { generations: -1 }, { attempts: -1 }, { size: 2.5 }]) assert.deepEqual(evolveTrees({ ...RUN, ...bad }), { ok: false, error: g }, JSON.stringify(bad));
  for (const junk of [undefined, null, 0, 'x', []]) assert.equal(evolveTrees(junk).ok, false);
});
