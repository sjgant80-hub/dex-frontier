// join.test.mjs — a department joins the mesh only if, with it, the mesh's out-of-fold score does not fall; the first must
// reach a coin; a scorer that fails or gives no number refuses that department and says why; nonsense is refused, never thrown.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { admit, kept, COIN } from '../src/join.mjs';

const y = [0, 1, 0, 1];
const col = (v) => [v, v, v, v];
// a scorer that reads the mesh's score as the sum of each column's first value: a column worth −0.1 lowers it
const sum = (cols) => cols.reduce((a, c) => a + c[0], 0);

test('a department that raises the score joins; one that lowers it is kept out; the score carried is the best so far', () => {
  const cs = [col(0.6), col(0.1), col(-0.1), col(0.05)];
  const r = admit(cs, y, sum);
  assert.deepEqual(r.admitted, [0, 1, 3]);
  assert.deepEqual(r.steps.map((s) => s.joins), [true, true, false, true]);
  assert.equal(r.steps[2].before, r.steps[1].oof, 'the one kept out was measured against the best so far');
  assert.ok(Math.abs(r.steps[2].oof - 0.6) < 1e-12, 'with it the mesh would have scored 0.6');
  assert.ok(Math.abs(r.oof - 0.75) < 1e-12);
  assert.match(r.steps[2].why, /lower/); assert.match(r.steps[0].why, /at least/);
  assert.deepEqual(kept(cs, r), [cs[0], cs[1], cs[3]]);
});

test('the score never falls along the departments that join', () => {
  const cs = [0.55, 0.02, -0.04, 0.01, 0, -0.001, 0.03].map(col), r = admit(cs, y, sum);
  const path = r.steps.filter((s) => s.joins).map((s) => s.oof);
  for (let i = 1; i < path.length; i++) assert.ok(path[i] >= path[i - 1]);
  assert.equal(r.oof, path[path.length - 1]);
});

test('a tie joins: “does not fall” is at least, not more than', () => {
  const r = admit([col(0.7), col(0)], y, sum);
  assert.deepEqual(r.admitted, [0, 1]);
  assert.equal(r.steps[1].oof, r.steps[1].before);
});

test('the first department must reach a coin, or the floor given', () => {
  assert.equal(COIN, 0.5);
  assert.deepEqual(admit([col(0.49), col(0.6)], y, sum).admitted, [1]);
  assert.deepEqual(admit([col(0.5)], y, sum).admitted, [0], 'exactly a coin is at least a coin');
  assert.deepEqual(admit([col(0.6)], y, sum, { floor: 0.7 }).admitted, []);
  assert.equal(admit([col(0.6)], y, sum, { floor: 0.7 }).oof, 0.7, 'nothing joined: the score is the floor');
  assert.deepEqual(admit([col(0.6)], y, sum, { floor: NaN }).admitted, [0], 'a floor that is no number is a coin');
  assert.deepEqual(admit([col(0.6)], y, sum, null).admitted, [0]);
});

test('the scorer sees the departments already in, then the one offered, in order', () => {
  const seen = [];
  admit([col(0.6), col(-1), col(0.1)], y, (cols) => { seen.push(cols.map((c) => c[0])); return sum(cols); });
  assert.deepEqual(seen, [[0.6], [0.6, -1], [0.6, 0.1]]);
});

test('a scorer that throws or gives no number refuses that department and says why; the rest go on', () => {
  const bad = (cols) => { if (cols.length === 2) throw new Error('boom'); return sum(cols); };
  const r = admit([col(0.6), col(0.1), col(0.2)], y, bad);
  assert.deepEqual(r.admitted, [0]);
  assert.equal(r.steps[1].oof, null); assert.match(r.steps[1].why, /failed: boom/);
  const n = admit([col(0.6), col(0.1)], y, (cols) => (cols.length === 2 ? NaN : sum(cols)));
  assert.deepEqual(n.admitted, [0]); assert.match(n.steps[1].why, /no number/);
  const t = admit([col(0.6)], y, () => { throw 'plain'; });
  assert.match(t.steps[0].why, /failed: plain/);
});

test('typed arrays are columns too', () => {
  const r = admit([Float64Array.of(0.6, 0, 0, 0)], Uint8Array.from(y), sum);
  assert.deepEqual(r.admitted, [0]);
});

test('nonsense is refused with the reason, never thrown', () => {
  for (const [c, yy, f] of [[null, y, sum], [[col(1)], null, sum], [[col(1)], y, null], [[[1, 2]], y, sum], [[col(1), 'abcd'], y, sum], [[new DataView(new ArrayBuffer(4))], y, sum], ['x', 'y', 'z']]) {
    const r = admit(c, yy, f);
    assert.equal(typeof r.error, 'string', JSON.stringify([c, yy]));
    assert.equal(r.admitted, undefined);
  }
  assert.match(admit([[1, 2]], y, sum).error, /one score per case \(4\)/);
  assert.deepEqual(admit([], y, sum), { admitted: [], steps: [], oof: COIN });
  assert.deepEqual(kept([1], null), []); assert.deepEqual(kept([1], {}), []);
});

test('fuzz: garbage never throws', () => {
  const junk = [undefined, null, 0, -1, NaN, '', 'x', {}, [], [[]], [null], () => 0, Symbol('s'), new Uint8Array(2), [new Float64Array(2)]];
  for (const a of junk) for (const b of junk) for (const f of [undefined, sum, () => 'x', () => { throw 0; }]) assert.doesNotThrow(() => { admit(a, b, f, a); kept(a, b); });
});
