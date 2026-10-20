// node.test.mjs — a specialist node seals, grows on its own silo, is cut when it has not earned its place, and routes
// only what it covers. Synthetic silos only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contributor, recipeOf, sealNode, growNode, scores, advert, route, GROW, BAR } from '../src/node.mjs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { open } from '../vendor/living-seed/src/genome.mjs';

function view(name, signal, seed) {
  const r = rng(seed), n = 400, cols = { p: new Float64Array(n), q: new Float64Array(n) }, y = new Uint8Array(n);
  for (let i = 0; i < n; i++) { cols.p[i] = r() * 10; cols.q[i] = r() * 10; y[i] = Number(r() < (signal ? (cols.p[i] > 5 ? 0.8 : 0.15) : 0.4)); }
  const rows = Array.from({ length: n }, (_, i) => i);
  return { ok: true, name, features: ['p', 'q'], cols, y, n, trainRows: rows.filter((i) => i % 3), heldRows: rows.filter((i) => !(i % 3)) };
}
const QUICK = { population: 12, elites: 3, generations: 6 };

test('a contributor’s keys come from a public phrase: the same name, the same key; another name, another', async () => {
  const a = await contributor('alice'), a2 = await contributor('alice'), b = await contributor('bob');
  assert.equal(a.pub, a2.pub); assert.notEqual(a.pub, b.pub); assert.match(a.pub, /^[0-9a-f]{64}$/);
});

test('a node is one grow-seed for one silo, sealed: it opens, names its silo, carries the bar and no parents', async () => {
  const v = view('demo-signal', true, 1), keys = await contributor('alice'), g = await sealNode(v, keys, { seed: 3, grow: QUICK });
  assert.ok(g.ok, g.why);
  assert.equal(recipeOf('demo-signal', 3, QUICK).split(' ')[4], 'g:12.3.6');
  const o = await open(g.text);
  assert.ok(o.ok, o.why);
  assert.equal(o.fields.name, 'node-demo-signal');
  assert.deepEqual(o.fields.organs, [recipeOf('demo-signal', 3, QUICK)]);
  assert.equal(o.fields.gate.auc, BAR); assert.deepEqual(o.fields.parents, []);
  assert.deepEqual(GROW, { population: 40, elites: 8, generations: 30 }); assert.equal(BAR, 0.6);
  const bred = await sealNode(v, keys, { seed: 3, grow: QUICK, parents: ['0123456789abcdef'], bar: 0.7 });
  const ob = await open(bred.text);
  assert.deepEqual(ob.fields.parents, ['0123456789abcdef']); assert.equal(ob.fields.gate.auc, 0.7);
});

test('a node grows its body on its silo and answers; one with no signal is cut and abstains; a forgery grows nothing', async () => {
  const keys = await contributor('alice');
  const good = view('demo-signal', true, 1), g = await sealNode(good, keys, { seed: 3, grow: QUICK }), n = await growNode(g.text, good);
  assert.ok(n.ok); assert.equal(n.organ.state, 'live'); assert.ok(n.organ.heldAuc > 0.7);
  const s = scores(n.organism, good, good.heldRows.slice(0, 20));
  assert.equal(s.length, 20); assert.ok(s.every((x) => typeof x === 'number'));
  const a = advert(n.organism, good);
  assert.deepEqual({ ...a, gateAuc: null }, { node: n.organism.id, silo: 'demo-signal', features: ['p', 'q'], state: 'live', gateAuc: null, bar: 0.6, rules: n.organ.body.rules.length, maker: keys.pub });
  assert.equal(a.gateAuc, n.organ.heldAuc); assert.ok(a.rules >= 1);
  const noise = view('demo-noise', false, 2), gn = await sealNode(noise, keys, { seed: 3, grow: QUICK }), nn = await growNode(gn.text, noise);
  assert.equal(nn.organ.state, 'cut');
  assert.ok(scores(nn.organism, noise, noise.heldRows.slice(0, 5)).every((x) => x === null), 'a cut node says nothing');
  assert.equal(advert(nn.organism, noise).state, 'cut'); assert.equal(advert(nn.organism, noise).rules, 0);
  const forged = await growNode(g.text.replace('node-demo-signal', 'node-demo-signam'), good);
  assert.equal(forged.ok, false);
  const other = await growNode(g.text, { ...good, name: 'elsewhere' });
  assert.equal(other.organ, undefined, 'a node grows only on the silo it names');
  assert.equal(advert(other.organism, { ...good, name: 'elsewhere' }).state, 'absent');
});

test('route by fit: a case goes only to live nodes whose silo it carries every measurement of', () => {
  const ads = [{ silo: 'a', state: 'live', features: ['x', 'y'] }, { silo: 'b', state: 'live', features: ['z'] }, { silo: 'c', state: 'cut', features: ['x'] }];
  assert.deepEqual(route(ads, { x: 1, y: 2 }).map((a) => a.silo), ['a']);
  assert.deepEqual(route(ads, { x: 1, y: 2, z: 0 }).map((a) => a.silo), ['a', 'b']);
  assert.deepEqual(route(ads, { x: 1, y: NaN, z: 3 }).map((a) => a.silo), ['b']);
  assert.deepEqual(route(ads, { x: '1', y: 2 }).map((a) => a.silo), []);
  assert.deepEqual(route(ads, {}), []);
});
