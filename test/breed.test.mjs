// breed.test.mjs — breeding on the mechanism that held the gate: a child of two rule bodies is born only if it leads its
// better parent beyond the noise on rows no parent grew on, names both, and the population's best never falls.
// Synthetic department only (small settings, so the suite stays fast enough to mutate).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BEYOND, genomesOf, cross, express, pickBy, bestOf, bornIf, evolve } from '../src/breed.mjs';
import { genomeOps, growDeep } from '../src/deep.mjs';
import { RULE_KINDS } from '../src/bodies.mjs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

function view(n) {
  const r = rng(9), cols = { a: new Float64Array(n), b: new Float64Array(n), c: new Float64Array(n) }, y = new Uint8Array(n);
  for (let i = 0; i < n; i++) { cols.a[i] = r() * 10; cols.b[i] = r() * 10; cols.c[i] = r() * 10; y[i] = Number(r() < 1 / (1 + Math.exp(-(0.8 * (cols.a[i] - 5) + 0.8 * (cols.b[i] - 5))))); }
  return { features: ['a', 'b', 'c'], cols, y, n };
}
const V = view(400), ROWS = Array.from({ length: 400 }, (_, i) => i), GROW = ROWS.filter((i) => i % 2), CHECK = ROWS.filter((i) => !(i % 2));
const TINY = { population: 4, elites: 1, generations: 1, stages: 1 };
const RUN = { kind: 'deep-quantile', view: V, growRows: GROW, checkRows: CHECK, founders: [1, 2, 3, 4], generations: 2, attempts: 4, grow: TINY, resamples: 40, seed: 3 };
const hash = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
const genomes = (pairs, k, seed) => { const G = genomeOps(pairs), r = rng(seed); return Array.from({ length: k }, () => G.random(r)); };

test('cross: stages crossed one by one, the longer parent’s extra stages taken or left, at most one stage changed', () => {
  for (const pairs of [false, true]) for (const [la, lb] of [[3, 1], [1, 3], [2, 2], [0, 2], [2, 0]]) for (let s = 1; s <= 30; s++) {
    const ga = genomes(pairs, la, 100 + s), gb = genomes(pairs, lb, 200 + s), c = cross(ga, gb, pairs, rng(s)), lo = Math.min(la, lb), hi = Math.max(la, lb), long = la > lb ? ga : gb;
    assert.ok(c.length >= lo && c.length <= hi, 'length between the parents’');
    assert.ok(c.every((g) => g && typeof g === 'object'), 'every stage is a genome');
    const crossed = (g, a, b) => (g.on & ~(a.on | b.on)) === 0 && (a.on & b.on & ~g.on) === 0 && Object.keys(g).every((key) => key === 'on' || g[key] === a[key] || g[key] === b[key]);   // each rule's switch and genes from one parent or the other
    const extra = long.slice(lo).map((g) => JSON.stringify(g));   // a stage only the longer parent has is taken or left, in order
    const odd = c.filter((g, k) => (k < lo ? !crossed(g, ga[k], gb[k]) : !extra.includes(JSON.stringify(g)))).length;
    assert.ok(odd <= 1, 'only the one mutated stage may be neither parent’s');
    const kept = c.slice(lo).map((g) => extra.indexOf(JSON.stringify(g))).filter((j) => j >= 0);
    assert.deepEqual(kept, [...kept].sort((x, z) => x - z), 'the stages taken keep their order');
  }
  assert.deepEqual(cross([], [], false, rng(1)), []);
  assert.deepEqual(cross([], [], true, rng(2)), []);
});

test('cross: deterministic, and pinned byte for byte (half the children carry one change)', () => {
  const out = [1, 2, 3, 4, 5, 6].map((s) => cross(genomes(false, 3, s), genomes(false, 2, s + 50), false, rng(s)));
  const outP = [1, 2, 3].map((s) => cross(genomes(true, 2, s), genomes(true, 2, s + 50), true, rng(s)));
  assert.deepEqual(out, [1, 2, 3, 4, 5, 6].map((s) => cross(genomes(false, 3, s), genomes(false, 2, s + 50), false, rng(s))));
  assert.equal(hash(out), 'ddfeda0804d57578');
  assert.equal(hash(outP), '1bdd3381c63f67b1');
  const one = genomes(false, 1, 7), G = genomeOps(false);
  const changed = [...Array(40)].map((_, s) => JSON.stringify(cross(one, one, false, rng(s + 1))[0]) !== JSON.stringify(one[0])).filter(Boolean).length;
  assert.ok(changed > 5 && changed < 35, 'a child of a genome crossed with itself changes about half the time: ' + changed);
  assert.equal(typeof G.mutate, 'function');
});

test('express: exactly the genomes given, every threshold fitted on the rows given (a grown body re-expressed is itself)', () => {
  for (const kind of ['deep-quantile', 'pairs-quantile', 'deep-values', 'pairs-values']) {
    const deep = growDeep(V, GROW, 2, { ...RULE_KINDS[kind], ...TINY, stages: 2 }), body = express(kind, genomesOf({ deep }), V, GROW);
    assert.equal(body.kind, kind);
    assert.deepEqual(body.deep.stages, deep.stages, kind);
  }
  assert.deepEqual(genomesOf(null), []); assert.deepEqual(genomesOf({ deep: {} }), []); assert.deepEqual(genomesOf({}), []);
  const g = genomes(false, 1, 3);
  assert.equal(express('boosted', g, V, GROW), null);
  assert.equal(express('nope', g, V, GROW), null);
  assert.equal(express('deep-quantile', 'x', V, GROW), null);
  assert.equal(express('deep-quantile', g, null, GROW), null);
  assert.equal(express('deep-quantile', g, { ...V, features: 'a' }, GROW), null);
  assert.equal(express('deep-quantile', g, V, 'rows'), null);
  assert.deepEqual(express('deep-quantile', [], V, GROW), { kind: 'deep-quantile', deep: { stages: [] } });
});

test('pickBy: rank-proportional, the best the likeliest; bestOf keeps the earlier on a tie', () => {
  const pop = [{ id: 'low', check: 0.6 }, { id: 'top', check: 0.9 }, { id: 'mid', check: 0.7 }];
  assert.equal(pickBy(pop, () => 0).id, 'top');
  assert.equal(pickBy(pop, () => 0.49).id, 'top');
  assert.equal(pickBy(pop, () => 0.5).id, 'mid');   // t = 3 = the top's share exactly: it falls to the next
  assert.equal(pickBy(pop, () => 0.8).id, 'mid');
  assert.equal(pickBy(pop, () => 0.99).id, 'low');
  const r = rng(4), counts = { top: 0, mid: 0, low: 0 };
  for (let k = 0; k < 600; k++) counts[pickBy(pop, r).id]++;
  assert.ok(counts.top > counts.mid && counts.mid > counts.low, JSON.stringify(counts));
  assert.equal(bestOf(pop).id, 'top');
  assert.equal(bestOf([{ id: 'a', check: 0.7 }, { id: 'b', check: 0.7 }]).id, 'a');
  assert.equal(bestOf([{ id: 'a', check: 0.5 }, { id: 'b', check: 0.7 }]).id, 'b');
});

test('bornIf: born only on a lead beyond the noise; a copy of its parent is not born', () => {
  const y = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1], good = y.map((v, i) => v + (i % 3) * 0.01), bad = y.map((_, i) => (i * 7) % 5);
  assert.equal(BEYOND, 0);
  assert.deepEqual(bornIf(good, good, y, 50, 1), { born: false, lead: 0, bound: null }, 'a copy does not lead, so no bootstrap is drawn');
  const b = bornIf(good, bad, y, 50, 1);
  assert.equal(b.born, true); assert.ok(b.bound > 0); assert.ok(b.lead > 0);
  const w = bornIf(bad, good, y, 50, 1);
  assert.equal(w.born, false); assert.ok(w.lead < 0); assert.equal(w.bound, null);
  const tie = [0.2, 0.9, 0.2, 0.9], same = [0.1, 0.8, 0.1, 0.8], yy = [0, 1, 0, 1];
  assert.deepEqual(bornIf(tie, same, yy, 20, 1), { born: false, lead: 0, bound: null }, 'level is not a lead');
  const near = y.map((v, i) => v * 0.3 + ((i * 5) % 7) * 0.1), base = near.map((x, i) => (i === 2 ? x - 0.15 : x));   // one negative case moved down: a small lead
  const n = bornIf(base, near, y, 200, 3);
  assert.ok(n.lead > 0 && n.bound <= 0 && n.born === false, 'a lead inside the noise is refused: ' + JSON.stringify(n));
});

test('evolve: a child is born only beyond the noise on CHECK, names two parents, and the best never falls', () => {
  const e = evolve(RUN);
  assert.equal(e.ok, true);
  assert.deepEqual(e.founders.map((f) => f.id), ['f1', 'f2', 'f3', 'f4']);
  assert.equal(e.born, 2); assert.equal(e.refused, 6);
  assert.equal(e.born + e.refused, RUN.generations * RUN.attempts);
  assert.equal(e.history.length, RUN.generations + 1);
  assert.ok(e.history.every((h, k) => k === 0 || h >= e.history[k - 1]), 'the best never falls');
  assert.ok(e.history[e.history.length - 1] > e.history[0], 'here a child beat the founders');
  const known = new Set(e.founders.map((f) => f.id));
  for (const l of e.lineage) {
    assert.ok(l.bound > BEYOND, 'born beyond the noise');
    assert.equal(l.parents.length, 2); assert.notEqual(l.parents[0], l.parents[1]);
    assert.ok(l.parents.every((p) => known.has(p) || /^c\d+$/.test(p)));
    known.add(l.child);
  }
  assert.equal(e.champion.check, e.history[e.history.length - 1]);
  assert.equal(e.bestFounder.check, e.history[0]);
  assert.ok(e.champion.genomes.length > 0);
  assert.deepEqual(evolve(RUN), e, 'the same population twice');
  assert.equal(hash(e), 'f5633c929b2e70d2');
  const p = evolve({ ...RUN, kind: 'pairs-quantile', seed: 2 });
  assert.equal(p.born, 1); assert.equal(hash(p), '6085928c4d6819f2');
});

test('evolve: the population keeps its size best; no generations or no attempts breed nothing', () => {
  const zero = evolve({ ...RUN, generations: 0 });
  assert.equal(zero.ok, true); assert.equal(zero.born, 0); assert.deepEqual(zero.history, [zero.bestFounder.check]);
  assert.equal(zero.champion.id, zero.bestFounder.id);
  const none = evolve({ ...RUN, attempts: 0 });
  assert.equal(none.born + none.refused, 0); assert.equal(none.history.length, RUN.generations + 1);
  const two = evolve({ ...RUN, founders: [1, 2], size: 2, generations: 1, attempts: 2 });
  assert.equal(two.ok, true); assert.equal(two.founders.length, 2);
});

test('evolve: every wrong argument refused with the reason, never thrown', () => {
  const no = 'breeding needs a rule kind, a view with columns and outcomes, and grow and check rows';
  for (const bad of [{ kind: 'boosted' }, { kind: 'nope' }, { view: null }, { view: { ...V, features: 'a' } }, { view: { ...V, features: [] } }, { view: { ...V, y: null } },
    { growRows: 'x' }, { checkRows: 'x' }, { growRows: [] }, { checkRows: [] }]) assert.deepEqual(evolve({ ...RUN, ...bad }), { ok: false, error: no }, JSON.stringify(Object.keys(bad)));
  const f = 'breeding needs at least two founders, each a different whole-number seed';
  for (const founders of ['x', [1], [1, 2.5], [2, 2]]) assert.deepEqual(evolve({ ...RUN, founders }), { ok: false, error: f }, JSON.stringify(founders));
  const g = 'generations and attempts are whole numbers, and the population keeps at least two';
  for (const bad of [{ generations: 1.5 }, { attempts: 'x' }, { size: 1 }, { generations: -1 }, { attempts: -1 }, { size: 2.5 }]) assert.deepEqual(evolve({ ...RUN, ...bad }), { ok: false, error: g }, JSON.stringify(bad));
  for (const junk of [undefined, null, 0, 'x', []]) assert.equal(evolve(junk).ok, false);
});
