// bodies.test.mjs — every kind of body grows on FIT alone, the best on GATE is fielded, a rule body reads at most a genome's
// columns (its own first), boosted trees read every column; wrong arguments are refused, never thrown.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULE_KINDS, KINDS, readBy, growKind, scoreKind, field } from '../src/bodies.mjs';
import { DEEP_BODIES } from '../tools/measure-2h.mjs';
import { growDeep, scoreDeep } from '../src/deep.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { MAXFEATS, rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

// a small real-shaped view: an outcome that turns on a OR (b AND c), plus noise columns, 400 rows
const N = 400, r = rng(11), cols = {}, names = ['a', 'b', 'c', ...Array.from({ length: 16 }, (_, k) => 'z' + k)];
for (const f of names) cols[f] = Float64Array.from({ length: N }, () => Math.floor(r() * 10));
const y = Uint8Array.from({ length: N }, (_, i) => (cols.a[i] > 6 || (cols.b[i] > 4 && cols.c[i] > 4) ? 1 : 0) ^ (r() < 0.1 ? 1 : 0));
const view = (features) => ({ features, cols, y });
const FIT = Array.from({ length: 240 }, (_, i) => i), GATE = Array.from({ length: 160 }, (_, i) => 240 + i);

test('the rule kinds are organ 2h’s four, and boosted trees are the fifth', () => {
  assert.deepEqual(RULE_KINDS, DEEP_BODIES);
  assert.deepEqual(KINDS, ['deep-quantile', 'deep-values', 'pairs-quantile', 'pairs-values', 'boosted']);
});

test('what a body reads: a rule body its first MAXFEATS columns, boosted trees all of them, the view itself untouched', () => {
  const wide = view(names), narrow = view(['a', 'b', 'c']);
  assert.equal(names.length, 19);
  assert.deepEqual(readBy('deep-values', wide).features, names.slice(0, MAXFEATS));
  assert.equal(readBy('deep-values', narrow), narrow, 'a narrow view is read as it is');
  assert.equal(readBy('boosted', wide), wide);
  const v16 = view(names.slice(0, MAXFEATS));
  assert.equal(readBy('pairs-quantile', v16), v16, 'exactly MAXFEATS columns: read as it is');
  assert.equal(wide.features.length, 19, 'never changed');
});

test('each kind grows and scores exactly as its own kernel does', () => {
  const v = view(['a', 'b', 'c', 'z0']);
  const d = growKind('pairs-values', v, FIT, 3), b = growKind('boosted', v, FIT);
  const dRef = growDeep(v, FIT, 3, RULE_KINDS['pairs-values']), bRef = boosted(v, FIT);
  for (const i of GATE.slice(0, 20)) { assert.equal(scoreKind(d, v, i), scoreDeep(dRef, v, i)); assert.equal(scoreKind(b, v, i), bRef.score(i)); }
  const wide = view(names), w = growKind('deep-quantile', wide, FIT), wRef = growDeep({ ...wide, features: names.slice(0, MAXFEATS) }, FIT, 1, RULE_KINDS['deep-quantile']);
  for (const i of GATE.slice(0, 20)) assert.equal(scoreKind(w, wide, i), scoreDeep(wRef, { ...wide, features: names.slice(0, MAXFEATS) }, i), 'a wide view is read as its first MAXFEATS columns');
  assert.equal(growKind('forest', v, FIT), null);
  for (const bad of [{ features: ['a'], y }, { features: ['a'], cols }, { cols, y }, { features: 'a', cols, y }]) assert.equal(growKind('boosted', bad, FIT), null, JSON.stringify(Object.keys(bad)));
  assert.equal(growKind('boosted', v, 'rows'), null); assert.equal(growKind('boosted', null, FIT), null);
});

test('fielding: every kind grown on FIT, the best on GATE fielded, its read columns said; GATE never grown on', () => {
  const v = view(['a', 'b', 'c', 'z0', 'z1']), f = field(v, FIT, GATE);
  assert.deepEqual(Object.keys(f.gate), KINDS);
  assert.equal(f.gateAuc, Math.max(...Object.values(f.gate)));
  assert.equal(f.gate[f.kind], f.gateAuc);
  assert.ok(f.gateAuc > 0.7, 'a learnable outcome is learned');
  assert.equal(f.read, 5);
  // growing never reads GATE: scramble GATE's columns and outcomes, and every body grown is the same
  const scrambled = { ...v, cols: Object.fromEntries(Object.entries(cols).map(([k, c]) => [k, Float64Array.from(c, (x, i) => (i >= 240 ? 9 - x : x))])), y: Uint8Array.from(y, (x, i) => (i >= 240 ? 1 - x : x)) };
  const g = field(scrambled, FIT, GATE);
  for (const i of FIT.slice(0, 30)) assert.equal(scoreKind(g.body.kind === f.body.kind ? g.body : growKind(f.kind, scrambled, FIT), v, i), scoreKind(f.body, v, i));
  const only = field(v, FIT, GATE, { kinds: ['deep-quantile', 'boosted'] });
  assert.deepEqual(Object.keys(only.gate), ['deep-quantile', 'boosted']);
  // a column of many distinct values is cut at quantiles by both kinds, so the two grow the same body: a tie, the earlier fielded
  const smooth = { features: ['w'], cols: { w: Float64Array.from({ length: N }, (_, i) => (cols.a[i] * 7919 + i * 0.37) % 101) }, y };
  const tie = field(smooth, FIT, GATE, { kinds: ['deep-values', 'deep-quantile'] });
  assert.equal(tie.gate['deep-values'], tie.gate['deep-quantile']);
  assert.equal(tie.kind, 'deep-values', 'a tie fields the earlier kind');
  assert.equal(field(smooth, FIT, GATE, { kinds: ['deep-quantile', 'deep-values'] }).kind, 'deep-quantile');
  const wide = field(view(names), FIT, GATE, { kinds: ['deep-quantile'] });
  assert.equal(wide.read, MAXFEATS);
  assert.equal(field(view(names), FIT, GATE, { kinds: ['boosted'] }).read, 19);
});

test('fielding refuses what it cannot grow, and never throws', () => {
  const bad = 'a body needs a view with columns and outcomes, and FIT and GATE rows';
  for (const args of [[], [null, FIT, GATE], [{}, FIT, GATE], [view([]), FIT, GATE], [{ features: ['a'], cols }, FIT, GATE], [view(['a']), [], GATE], [view(['a']), FIT, []], [view(['a']), 'x', GATE], [view(['a']), FIT, null]]) assert.equal(field(...args).error, bad);
  assert.equal(field(view(['a']), FIT, GATE, { kinds: ['forest'] }).error, 'no kind of body to grow');
  assert.equal(field(view(['a']), FIT, GATE, { kinds: 'boosted' }).error, 'no kind of body to grow');
  assert.ok(!field(view(['a']), FIT, GATE, null).error, 'no options is the default options');
});

test('fuzz: no garbage makes any of them throw', () => {
  const junk = [undefined, null, 0, 2.5, NaN, '', 'boosted', [], [null], {}, { features: 'a' }, { features: [] }, { features: ['a'] }, { kind: 'boosted' }, { kind: 'deep-values' }];
  for (const a of junk) for (const b of junk) {
    assert.doesNotThrow(() => readBy(a, b)); assert.doesNotThrow(() => growKind(a, b, [0, 1])); assert.doesNotThrow(() => growKind('boosted', a, b));
    assert.doesNotThrow(() => scoreKind(a, b, 0)); assert.doesNotThrow(() => field(a, b, [0]));
  }
  for (const a of junk) assert.doesNotThrow(() => field(view(['a']), FIT.slice(0, 20), GATE.slice(0, 20), a));
  assert.ok(Number.isNaN(scoreKind(null, view(['a']), 0))); assert.ok(Number.isNaN(scoreKind({ kind: 'deep-values' }, view(['a']), 0)));
  assert.ok(Number.isNaN(scoreKind({ kind: 'boosted' }, view(['a']), 0)), 'a boosted body with no model scores nothing');
});
