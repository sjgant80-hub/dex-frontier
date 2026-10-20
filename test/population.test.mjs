// population.test.mjs — breeding is gated: a child is born only if it beats both parents, names both, and the
// population's best never falls. Synthetic silo only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genomeOf, fixedRecipe, member, breed, pick, evolve } from '../src/population.mjs';
import { contributor, sealNode, growNode } from '../src/node.mjs';
import { rng, decodeSeed } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { open } from '../vendor/living-seed/src/genome.mjs';

function view() {
  const r = rng(9), n = 600, cols = { a: new Float64Array(n), b: new Float64Array(n), c: new Float64Array(n) }, y = new Uint8Array(n);
  for (let i = 0; i < n; i++) { cols.a[i] = r() * 10; cols.b[i] = r() * 10; cols.c[i] = r() * 10; y[i] = Number(r() < 1 / (1 + Math.exp(-(0.5 * (cols.a[i] - 5) + 0.4 * (cols.b[i] - 5))))); }
  const rows = Array.from({ length: n }, (_, i) => i);
  return { ok: true, name: 'demo-silo', features: ['a', 'b', 'c'], cols, y, n, trainRows: rows.filter((i) => i % 4), heldRows: rows.filter((i) => !(i % 4)) };
}
const V = view(), QUICK = { population: 10, elites: 2, generations: 4 };
async function founders(k) {
  const out = [];
  for (let s = 1; s <= k; s++) { const keys = await contributor('c' + s), g = await sealNode(V, keys, { seed: s, grow: QUICK }), n = await growNode(g.text, V); out.push(member(g, n)); }
  return out;
}

test('a fixed recipe carries the exact genome; a node’s genome reads back from its body', async () => {
  const [m] = await founders(1), g = genomeOf(m.organ);
  const d = decodeSeed(fixedRecipe('demo-silo', 4, g));
  assert.ok(d.ok); assert.deepEqual(d.seed.genome, g); assert.equal(d.seed.domain, 'demo-silo'); assert.equal(d.seed.seed, 4);
  assert.equal(m.gateAuc, m.organ.heldAuc); assert.match(m.id, /^[0-9a-f]{16}$/);
});

test('breed: a child is born only if it beats both parents on GATE, and it names both in its seal', async () => {
  const [a, b] = await founders(2), keys = await contributor('breeder');
  let bornOnce = false, refusedOnce = false;
  for (let s = 1; s <= 12 && !(bornOnce && refusedOnce); s++) {
    const out = await breed(a, b, V, keys, s);
    assert.deepEqual(out.parents, [a.id, b.id]);
    if (out.born) {
      bornOnce = true;
      assert.ok(out.child.gateAuc > Math.max(a.gateAuc, b.gateAuc), 'beats both');
      const o = await open(out.child.text);
      assert.deepEqual(o.fields.parents, [a.id, b.id]); assert.equal(o.fields.gate.auc, Math.max(a.organism.gate.auc, b.organism.gate.auc));
      assert.equal(out.child.organ.state, 'live');
    } else { refusedOnce = true; assert.match(out.why, /does not beat both parents|cut at its gate/); }
  }
  assert.ok(refusedOnce, 'the gate refuses some children');
  assert.deepEqual(await breed(a, b, V, keys, 3), await breed(a, b, V, keys, 3), 'seeded');
});

test('pick: fitter nodes are picked more often, every node can be picked, and it is seeded', () => {
  const pop = [{ id: 'a', gateAuc: 0.9 }, { id: 'b', gateAuc: 0.7 }, { id: 'c', gateAuc: 0.8 }], r = rng(3), n = { a: 0, b: 0, c: 0 };
  for (let k = 0; k < 6000; k++) n[pick(pop, r).id]++;
  assert.ok(n.a > n.c && n.c > n.b && n.b > 0, JSON.stringify(n));
  assert.ok(Math.abs(n.a / 6000 - 3 / 6) < 0.03 && Math.abs(n.c / 6000 - 2 / 6) < 0.03 && Math.abs(n.b / 6000 - 1 / 6) < 0.03, 'rank-proportional 3:2:1');
  const tie = [{ id: 'q', gateAuc: 0.5 }, { id: 'p', gateAuc: 0.5 }];
  assert.equal(pick(tie, () => 0).id, 'p', 'ties go to the earlier id');
  assert.equal(pick(tie, () => 0.999999).id, 'q');
  assert.equal(pick([{ id: 'only', gateAuc: 0.6 }], () => 0.5).id, 'only');
});

test('evolve: the population’s best never falls, it keeps its size, every child’s lineage is recorded', async () => {
  const pop = await founders(4), keys = await contributor('breeder');
  const out = await evolve(pop, V, keys, { generations: 3, attempts: 4, seed: 2 });
  assert.equal(out.history.length, 4); assert.equal(out.pop.length, 4);
  assert.ok(out.history.every((h, k) => k === 0 || h >= out.history[k - 1]), out.history.join(' '));
  assert.equal(out.born + out.refused <= 12, true); assert.equal(out.lineage.length, out.born);
  for (const l of out.lineage) { assert.equal(l.parents.length, 2); assert.ok(l.childGate > Math.max(...l.parentGates), 'the record shows each child beat both'); }
  assert.deepEqual(out.pop.map((m) => m.gateAuc), [...out.pop.map((m) => m.gateAuc)].sort((p, q) => q - p), 'kept best first');
  const again = await evolve(pop, V, keys, { generations: 3, attempts: 4, seed: 2 });
  assert.deepEqual(again.history, out.history); assert.deepEqual(again.lineage, out.lineage);
  const none = await evolve([pop[0]], V, keys, { generations: 1, attempts: 3, seed: 2 });
  assert.equal(none.born, 0, 'one node alone cannot breed with itself');
});
