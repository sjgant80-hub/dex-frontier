#!/usr/bin/env node
// tools/measure-7.mjs — organ 7, SOVEREIGN SPREAD. Every live node of organ 2's meshes travels as a card and is grown
// again from the card on its silo; a device that trusts other makers refuses it; a changed card is refused. The ledger
// gives each contributor their node's share of the mesh, from its out-of-fold contribution on GATE — and is checked
// against what each node is really worth on TEST (the composed AUC lost when it is revoked). Revoking any one node
// re-learns the coupling and changes no other node. And one answer is counted: what crosses is a score per live node.
// Deterministic:  node tools/measure-7.mjs [--check] → data/organ-7/record.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { growNode, scores } from '../src/node.mjs';
import { carry, ledger, revoke, message } from '../src/spread.mjs';
import { coupled } from '../src/compose.mjs';
import { contributor } from '../src/node.mjs';
import { readCard, cardOf } from '../vendor/living-seed/src/card.mjs';
import { round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf, mesh, testAuc } from './mesh.mjs';

const ROOT = new URL('../', import.meta.url);

/** Spearman rank correlation of two equal-length lists (ties get their average rank) */
export function spearman(a, b) {
  const rank = (xs) => { const o = xs.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(xs.length); for (let i = 0; i < o.length;) { let j = i; while (j < o.length && o[j][0] === o[i][0]) j++; for (let k = i; k < j; k++) r[o[k][1]] = (i + j - 1) / 2; i = j; } return r; };
  const ra = rank(a), rb = rank(b), n = a.length, ma = ra.reduce((s, v) => s + v, 0) / n, mb = rb.reduce((s, v) => s + v, 0) / n;
  const cov = ra.reduce((s, v, i) => s + (v - ma) * (rb[i] - mb), 0), va = ra.reduce((s, v) => s + (v - ma) ** 2, 0), vb = rb.reduce((s, v) => s + (v - mb) ** 2, 0);
  return va && vb ? cov / Math.sqrt(va * vb) : 0;
}

async function domain(ds) {
  const live = liveOf(await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)))), m = mesh(ds, live), full = testAuc(ds, m.score(ds.testRows));
  const cards = [];
  for (const n of live) {
    const c = await carry(n.genome.text), regrown = c.ok ? await growNode(c.back, n.view) : null, stranger = await contributor('stranger-' + n.name);
    const png = (await cardOf(n.genome.text)).png.slice(); png[png.length - 40] ^= 1;
    cards.push({ node: n.name, cardBytes: c.bytes, roundTrip: c.ok && c.back === n.genome.text, sameOrganism: !!regrown && regrown.organism.id === n.organism.id,
      untrustedRefused: !(await readCard((await cardOf(n.genome.text)).png, { trust: [stranger.pub] })).ok, changedRefused: !(await readCard(png)).ok });
  }
  const L = ledger(live.map((n) => n.advert), m.gateCols, m.gateY);
  const revoked = [];
  for (const [k, n] of live.entries()) {
    const r = revoke(m.gateCols, m.gateY, k), others = live.filter((_, j) => j !== k), cols = others.map((o) => scores(o.organism, o.view, ds.testRows));
    const regrown = await nodes(others.map((o) => o.view));   // grown again from scratch without the revoked node: each must come out the same
    const s = r.ok ? ds.testRows.map((_, i) => coupled(r.coupling, cols.map((c) => c[i]))) : null;
    revoked.push({ node: n.name, ok: r.ok, testAuc: s ? testAuc(ds, s) : null, loss: s ? round6(full - testAuc(ds, s)) : null, othersUnchanged: regrown.every((o, j) => o.organism.id === others[j].organism.id), answered: s ? s.every(Number.isFinite) : false });
  }
  const msg = message(m.cols([ds.testRows[0]]).map((c) => c[0]));
  return { nodes: live.map((n) => n.name), meshAuc: full, cards, ledger: L.map((x) => ({ node: x.silo, maker: x.maker, contribution: round6(x.contribution), share: round6(x.share) })), revoked,
    ledgerTracksValue: round6(spearman(L.map((x) => x.contribution), revoked.map((x) => (x.loss === null ? 0 : x.loss)))), answer: { bytes: msg.bytes, numbers: msg.numbers, onlyScores: msg.numbers === live.length } };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.organ-7.record', v: 1 };
  for (const d of ['telco', 'shop']) out[d] = await domain(D[d]);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-7.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-7/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-7/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-7/record.json', ROOT), text); console.log('wrote data/organ-7/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
