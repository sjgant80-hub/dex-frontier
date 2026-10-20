// spread.test.mjs — sovereign spread: a node travels as a card and back, a forged card is refused, the ledger measures
// each contributor's share, revoking changes nothing but the coupling, and an answer carries scores only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carry, ledger, revoke, message } from '../src/spread.mjs';
import { contributor, sealNode } from '../src/node.mjs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { readCard, cardOf } from '../vendor/living-seed/src/card.mjs';
import { couple } from '../src/compose.mjs';

const view = { name: 'demo-silo', features: ['a'], cols: { a: new Float64Array(10) }, y: new Uint8Array(10), trainRows: [], heldRows: [] };

test('a node travels as a card and comes back byte for byte; a card from an untrusted maker is refused', async () => {
  const alice = await contributor('alice'), g = await sealNode(view, alice, { seed: 2 }), c = await carry(g.text);
  assert.ok(c.ok, c.why); assert.equal(c.back, g.text); assert.equal(c.id, g.id); assert.ok(c.bytes > 1000);
  const bob = await contributor('bob');
  const refused = await carry(g.text, { trust: [bob.pub] });
  assert.equal(refused.ok, false);
  assert.ok((await carry(g.text, { trust: [alice.pub] })).ok, 'trusted when the device trusts alice');
  const card = (await cardOf(g.text)).png.slice(); card[card.length - 40] ^= 1;
  assert.equal((await readCard(card)).ok, false, 'a changed card is refused');
  assert.equal((await carry('◊ life.v1 not-a-genome')).ok, false);
});

test('the ledger: useful nodes earn a share, a useless one earns none; the shares sum to one; makers are named', () => {
  const r = rng(6), n = 900, y = [], a = [], b = [], c = [];
  for (let i = 0; i < n; i++) { const u = r() * 4 - 2, v = r() * 4 - 2; y.push(Number(r() < 1 / (1 + Math.exp(-(1.4 * u + 0.7 * v))))); a.push(u + r() - 0.5); b.push(v + r() - 0.5); c.push(r()); }
  const ads = [{ node: 'n1', silo: 's1', maker: 'm1' }, { node: 'n2', silo: 's2', maker: 'm2' }, { node: 'n3', silo: 's3', maker: 'm3' }];
  const L = ledger(ads, [a, b, c], y);
  assert.deepEqual(L.map((x) => x.maker), ['m1', 'm2', 'm3']);
  assert.ok(L[0].share > L[1].share && L[1].share > 0, 'the stronger node earns more');
  assert.ok(L[2].share < 0.1, 'the useless node earns little or nothing: ' + L[2].share);
  assert.ok(Math.abs(L.reduce((s, x) => s + x.share, 0) - 1) < 1e-12);
  assert.ok(L.every((x) => x.share >= 0 && x.share <= 1));
  const flat = new Array(n).fill(2), none = ledger([{ node: 'x', silo: 's', maker: 'm' }, { node: 'y', silo: 't', maker: 'm' }], [flat, flat.slice()], y);
  assert.deepEqual(none.map((x) => x.contribution), [0, 0], 'two nodes that never vary add exactly nothing');
  assert.deepEqual(none.map((x) => x.share), [0, 0], 'and with nothing to share out, each share is 0, not 0/0');
});

test('revoke: the coupling re-learns without the node; the last node cannot leave; an answer carries scores only', () => {
  const y = [0, 1, 0, 1, 1, 0, 1, 0], a = [0.1, 0.9, 0.2, 0.8, 0.7, 0.3, 0.6, 0.4], b = [1, 0, 1, 1, 0, 0, 1, 1];
  const v = revoke([a, b], y, 1);
  assert.ok(v.ok); assert.equal(v.left, 1); assert.equal(v.coupling.weights.length, 2);
  assert.equal(revoke([a], y, 0).ok, false);
  const c = [0.5, 0.2, 0.7, 0.1, 0.9, 0.3, 0.4, 0.6];
  assert.deepEqual(revoke([a, b, c], y, 1).coupling, couple([a, c], y), 'the coupling of exactly the nodes that stay');
  const m = message([1.25, -0.5, null]);
  assert.equal(m.text, '[1.25,-0.5,null]'); assert.equal(m.bytes, 16); assert.equal(m.numbers, 3);
  assert.equal(message([1 / 3]).text, '[0.333333]', 'six places');
});
