// relay.test.mjs — the relay sends only scores, never a score a body grew on, in strongest-first order, within a body's
// column limit; and it refuses what it cannot run. Stub bodies record the rows they grew on, so a leak would show.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { room, strongestFirst, foldsOf, withSent, relay } from '../src/relay.mjs';

const N = 12, FIT = [0, 1, 2, 3, 4, 5, 6, 7], OTHER = [8, 9, 10, 11];
const y = Uint8Array.from({ length: N }, (_, i) => (i * 7) % 3 === 0 ? 1 : 0);
const views = { a: { features: ['a1'], cols: { a1: Float64Array.from({ length: N }, (_, i) => i) }, y }, b: { features: ['b1', 'b2'], cols: { b1: Float64Array.from({ length: N }, (_, i) => 2 * i), b2: new Float64Array(N).fill(1) }, y }, c: { features: ['c1'], cols: { c1: Float64Array.from({ length: N }, (_, i) => N - i) }, y } };
function stubs() {
  const grown = [];
  const grow = (view, rows) => { grown.push({ features: [...view.features], rows: [...rows] }); return { rows: [...rows], mean: rows.reduce((a, i) => a + view.y[i], 0) / rows.length, last: view.features[view.features.length - 1] }; };
  const score = (b, view, i) => b.mean + view.cols[b.last][i] / 1000;
  const field = (view) => ({ body: grow(view, FIT), kind: 'stub' });
  return { grown, grow, score, field };
}
const run = (s, order, extra = {}) => relay({ order, viewOf: (k) => views[k], field: s.field, grow: s.grow, score: s.score, fitRows: FIT, otherRows: OTHER, n: N, folds: 4, max: 16, ...extra });

test('room: what fits beside a department’s own columns, never negative, nothing for nonsense', () => {
  assert.deepEqual([room(13, 16), room(15, 16), room(16, 16), room(20, 16), room(0, 16), room(3, 16)], [3, 1, 0, 0, 16, 13]);
  assert.deepEqual([room(-1, 16), room(1.5, 16), room('3', 16), room(3, null), room(undefined, undefined)], [0, 0, 0, 0, 0]);
});

test('strongest first: by score, a tie alphabetical, a missing score last', () => {
  assert.deepEqual(strongestFirst({ a: 0.6, b: 0.8, c: 0.6, d: NaN, e: 0.9 }), ['e', 'b', 'a', 'c', 'd']);
  assert.deepEqual(strongestFirst({ z: 0.5, y: 0.5 }), ['y', 'z']);
  assert.deepEqual(strongestFirst({ x: undefined, w: 0.1 }), ['w', 'x']);
  assert.deepEqual(strongestFirst(null), []); assert.deepEqual(strongestFirst({}), []);
});

test('folds by position: every row held exactly once, never in its own training rows; nonsense folds refused', () => {
  assert.deepEqual(foldsOf([10, 11, 12, 13, 14], 2), [[[11, 13], [10, 12, 14]], [[10, 12, 14], [11, 13]]]);
  const f = foldsOf(FIT, 4);
  assert.equal(f.length, 4);
  assert.deepEqual(f.flatMap(([, held]) => held).sort((a, b) => a - b), FIT);
  for (const [train, held] of f) { assert.ok(held.every((i) => !train.includes(i))); assert.equal(train.length + held.length, FIT.length); }
  assert.deepEqual([foldsOf(FIT, 1), foldsOf(FIT, 2.5), foldsOf('rows', 2), foldsOf(null, 3)], [[], [], [], []]);
});

test('withSent: own columns first, then the strongest senders that fit; the view given is not changed', () => {
  const v = { features: Array.from({ length: 14 }, (_, k) => 'f' + k), cols: {}, y };
  const sent = [{ name: 'p', col: [1] }, { name: 'q', col: [2] }, { name: 'r', col: [3] }];
  const w = withSent(v, sent, 16);
  assert.deepEqual(w.took, ['p', 'q']);
  assert.deepEqual(w.view.features.slice(-3), ['f13', 'sent_p', 'sent_q']);
  assert.deepEqual([w.view.cols.sent_p, w.view.cols.sent_q, w.view.cols.sent_r], [[1], [2], undefined]);
  assert.equal(v.features.length, 14); assert.equal(v.cols.sent_p, undefined);
  assert.deepEqual(withSent({ ...v, features: Array.from({ length: 16 }, (_, k) => 'f' + k) }, sent, 16).took, []);
  assert.deepEqual(withSent(v, [], 16).took, []);
  assert.deepEqual(withSent(v, sent, 20).took, ['p', 'q', 'r']);
});

test('the relay: each department takes the stronger ones’ scores, a FIT case’s score never from a body grown on it', () => {
  const s = stubs(), r = run(s, ['b', 'a', 'c']);
  assert.ok(r.ok, r.error);
  assert.deepEqual(r.departments.map((d) => [d.name, d.took]), [['b', []], ['a', ['b']], ['c', ['b', 'a']]]);
  assert.deepEqual(r.departments[2].view.features, ['c1', 'sent_b', 'sent_a']);
  assert.equal(r.departments[1].view.cols.sent_b, r.departments[0].col, 'what a sends on is exactly what b sent');
  // b and a send: each FIT row's score from the fold body that never grew on it; c sends to no one, so it grows only once
  const byFeatures = (f) => s.grown.filter((g) => g.features.join() === f);
  assert.equal(byFeatures('b1,b2').length, 5); assert.equal(byFeatures('a1,sent_b').length, 5); assert.equal(byFeatures('c1,sent_b,sent_a').length, 1);
  for (const d of r.departments.slice(0, 2)) {
    const folds = byFeatures(d.view.features.join()).filter((g) => g.rows.length < FIT.length);
    assert.equal(folds.length, 4);
    for (const i of FIT) {
      const fold = folds.find((g) => !g.rows.includes(i));
      assert.ok(fold, 'some fold body never grew on row ' + i);
      assert.equal(d.col[i], fold.rows.reduce((a, j) => a + y[j], 0) / fold.rows.length + d.view.cols[d.view.features.at(-1)][i] / 1000);
    }
  }
  for (const d of r.departments) for (const i of OTHER) assert.equal(d.col[i], s.score(d.fielded.body, d.view, i), 'GATE and TEST by the body grown on all of FIT');
  assert.deepEqual(Array.from(r.departments[2].col.slice(0, 8)), [0, 0, 0, 0, 0, 0, 0, 0], 'the last department sends nothing, so it scores no FIT case');
});

test('the relay is a prefix: its first k departments are exactly the relay of those k, so growth can be read off it', () => {
  const full = run(stubs(), ['c', 'a', 'b']), two = run(stubs(), ['c', 'a']);
  assert.deepEqual(Array.from(two.departments[0].col), Array.from(full.departments[0].col));
  assert.deepEqual(OTHER.map((i) => two.departments[1].col[i]), OTHER.map((i) => full.departments[1].col[i]));
  assert.deepEqual(run(stubs(), ['c', 'a', 'b']).departments.map((d) => Array.from(d.col)), full.departments.map((d) => Array.from(d.col)), 'deterministic');
});

test('a body that reads few columns takes fewer sent scores; the limit is respected', () => {
  const r = run(stubs(), ['b', 'a', 'c'], { max: 2 });
  assert.deepEqual(r.departments.map((d) => d.took), [[], ['b'], ['b']]);
  assert.deepEqual(r.departments.map((d) => d.view.features.length), [2, 2, 2]);
});

test('the relay refuses what it cannot run, and never throws', () => {
  const s = stubs(), bad = 'a relay needs an order, its four functions, the rows and n';
  assert.equal(relay().error, bad);
  assert.equal(run(s, []).error, bad);
  assert.equal(run(s, 'abc').error, bad);
  assert.equal(run(s, ['a'], { grow: null }).error, bad);
  assert.equal(run(s, ['a'], { field: 'f' }).error, bad);
  assert.equal(run(s, ['a'], { score: undefined, viewOf: (k) => views[k] }).error, bad);
  assert.equal(run(s, ['a'], { viewOf: 3 }).error, bad);
  assert.equal(run(s, ['a'], { n: 0 }).error, bad);
  assert.equal(run(s, ['a'], { n: 2.5 }).error, bad);
  assert.equal(run(s, ['a'], { fitRows: 'x' }).error, bad);
  assert.equal(run(s, ['a'], { otherRows: null }).error, bad);
  assert.equal(run(s, ['a'], { folds: 1 }).error, 'folds must be a whole number of at least 2');
  assert.equal(run(s, ['a', 'zz']).error, 'no view for zz');
  assert.equal(run(s, ['a'], { viewOf: () => ({ features: 'a1' }) }).error, 'no view for a');
  assert.ok(run(stubs(), ['a'], { n: 1, fitRows: [0], otherRows: [0] }).ok, 'one case is a relay of one case, not a refusal');
  const one = run(stubs(), ['a']);
  assert.ok(one.ok); assert.deepEqual(one.departments.map((d) => d.took), [[]]);
});

test('fuzz: no garbage makes any of them throw', () => {
  const junk = [undefined, null, 0, -1, 2.5, NaN, '', 'x', [], [null], {}, { features: 'a' }, { features: [] }, () => 1, Symbol.iterator];
  for (const a of junk) for (const b of junk) {
    assert.doesNotThrow(() => room(a, b)); assert.doesNotThrow(() => strongestFirst(a)); assert.doesNotThrow(() => foldsOf(a, b));
    assert.doesNotThrow(() => withSent(a, b, 16)); assert.doesNotThrow(() => relay(a)); assert.doesNotThrow(() => relay({ order: a, viewOf: b }));
  }
});
