#!/usr/bin/env node
// tools/measure-2.mjs — organ 2, THE COMPOSITION PROOF (the critical gate). In each of two real domains, every silo grows
// a node of its own (a contributor's sealed grow-seed, grown on that silo's FIT records only); the nodes that clear the
// bar on GATE join the mesh; the coupling learns each node's weight from GATE outcomes; then, on TEST, the composed mesh
// is measured against its best single node (the best on TEST — the strictest rival), the shams (random routing; a
// coupling taught shuffled outcomes; a mesh grown on shuffled outcomes), its own growth one node at a time, the poured
// monolith (every column pooled in one place: boosted trees and logistic regression), and, on the 300, the 14B and a
// frontier model. Then breadth: both domains' TEST cases in one unlabelled stream, routed by fit.
// Deterministic given the committed answers:  node tools/measure-2.mjs [--check] → data/organ-2/record.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { loadTelco, loadShop, silo, pooled } from '../src/silos.mjs';
import { contributor, sealNode, growNode, scores, advert, route } from '../src/node.mjs';
import { couple, coupled, calibrate, randomRoute, shuffled, size as couplingSize } from '../src/compose.mjs';
import { lead, median } from '../src/stats.mjs';
import { logistic, boosted, size as modelSize } from '../vendor/living-seed/src/baseline.mjs';
import { caseOf } from '../vendor/living-seed/src/germinate.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { sampleOf } from './contest.mjs';
import { scrambleTest } from './measure-1.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const SEED = 1, ROUTE_SEED = 7, SHUFFLE_SEED = 13, NOISE_SEED = 17;

/** the same dataset with FIT and GATE outcomes shuffled (seeded): what a mesh grown on nothing true looks like */
function noiseOf(ds) {
  const known = [...ds.fitRows, ...ds.gateRows], ys = shuffled(known.map((i) => ds.y[i]), NOISE_SEED), y = Uint8Array.from(ds.y);
  known.forEach((i, k) => { y[i] = ys[k]; });
  return { ...ds, y };
}

/** grow every silo's node; the live ones, with their scores on GATE and TEST */
async function mesh(ds) {
  const out = [];
  for (const name of Object.keys(ds.silos)) {
    const view = silo(ds, name), g = await sealNode(view, await contributor(name), { seed: SEED }), n = await growNode(g.text, view);
    out.push({ name, view, genome: g, grown: n, advert: advert(n.organism, view) });
  }
  return out;
}

async function domain(ds) {
  const nodes = await mesh(ds), again = await mesh(ds), blind = await mesh(scrambleTest(ds)), noise = await mesh(noiseOf(ds));
  const live = nodes.filter((n) => n.advert.state === 'live').sort((a, b) => b.advert.gateAuc - a.advert.gateAuc || (a.name < b.name ? -1 : 1));
  const gateY = ds.gateRows.map((i) => ds.y[i]), testY = ds.testRows.map((i) => ds.y[i]);
  const col = (n, rows) => scores(n.grown.organism, n.view, rows);
  const gateCols = live.map((n) => col(n, ds.gateRows)), testCols = live.map((n) => col(n, ds.testRows));
  const c = couple(gateCols, gateY), composed = ds.testRows.map((_, r) => coupled(c, testCols.map((t) => t[r])));
  const singles = live.map((n, k) => ({ node: n.name, gateAuc: n.advert.gateAuc, testAuc: round6(auc(testCols[k], testY)) }));
  const bestK = singles.reduce((b, s, k) => (s.testAuc > singles[b].testAuc ? k : b), 0);
  const routed = randomRoute(gateCols.map((g) => calibrate(g, gateY)), testCols, ROUTE_SEED);
  const shamC = couple(gateCols, shuffled(gateY, SHUFFLE_SEED)), sham = ds.testRows.map((_, r) => coupled(shamC, testCols.map((t) => t[r])));
  const growth = live.map((_, k) => { const ck = couple(gateCols.slice(0, k + 1), gateY); return { nodes: k + 1, added: live[k].name, testAuc: round6(auc(ds.testRows.map((_, r) => coupled(ck, testCols.slice(0, k + 1).map((t) => t[r]))), testY)) }; });
  const P = pooled(ds), boost = boosted(P, P.rows), logit = logistic(P, P.rows);
  const boostS = ds.testRows.map((i) => boost.score(i)), logitS = ds.testRows.map((i) => logit.score(i));
  // the 300: the composed mesh against the 14B and the frontier model, each shown every column
  const rows = sampleOf(ds), y300 = rows.map((i) => ds.y[i]), at = new Map(ds.testRows.map((i, r) => [i, r])), comp300 = rows.map((i) => composed[at.get(i)]);
  const answers = (file) => { const d = JSON.parse(read(file)), m = new Map(d.calls.map((x) => [x.row, x])); return { d, p: rows.map((i) => (m.get(i) && m.get(i).p !== null ? m.get(i).p : 0.5)), unread: rows.filter((i) => !m.get(i) || m.get(i).p === null).length, answered: rows.filter((i) => m.has(i)).length }; };
  const local = answers('data/llm/qwen2.5-14b-' + ds.name + '.json'), front = answers('data/llm/frontier-' + ds.name + '.json');
  const numbers = live.reduce((a, n) => a + n.grown.organ.body.rules.length * 3 + 2, 0) + couplingSize(c);
  return {
    nodes: nodes.map((n) => ({ silo: n.name, columns: n.view.features.length, genomeBytes: Buffer.byteLength(n.genome.text), state: n.advert.state, gateAuc: n.advert.gateAuc, rules: n.advert.rules, maker: n.advert.maker })),
    live: live.map((n) => n.name),
    viewsOwnColumnsOnly: nodes.every((n) => Object.keys(n.view.cols).every((f) => ds.silos[n.name].includes(f))),
    deterministic: nodes.every((n, k) => n.grown.organism.id === again[k].grown.organism.id),
    testNeverRead: nodes.every((n, k) => n.grown.organism.id === blind[k].grown.organism.id),
    noiseMeshLive: noise.filter((n) => n.advert.state === 'live').map((n) => n.name),
    answered: ds.testRows.filter((_, r) => testCols.some((t) => t[r] !== null)).length, cases: ds.testRows.length, outcomes: testY.reduce((a, v) => a + v, 0),
    coupling: { weights: c.weights.map(round6), steps: c.steps, numbers: couplingSize(c) },
    composedAuc: round6(auc(composed, testY)), singles, best: singles[bestK],
    vsBest: lead(composed, testCols[bestK], testY), vsRoute: lead(composed, routed, testY), vsShuffled: lead(composed, sham, testY),
    growth,
    monolith: { boosted: { numbers: modelSize(boost), vs: lead(composed, boostS, testY) }, logistic: { numbers: modelSize(logit), vs: lead(composed, logitS, testY) } },
    sample: { cases: rows.length, outcomes: y300.reduce((a, v) => a + v, 0), sha: sha256Hex(JSON.stringify(rows)).slice(0, 16), composedAuc: round6(auc(comp300, y300)) },
    local: { model: local.d.model, answered: local.answered, unreadable: local.unread, longestPrompt: Math.max(...local.d.calls.map((x) => x.promptTokens)), numCtx: local.d.options.num_ctx, medianMs: median(local.d.calls.map((x) => x.wallMs)), vs: lead(comp300, local.p, y300) },
    frontier: { model: front.d.model, answered: front.answered, unreadable: front.unread, vs: lead(comp300, front.p, y300) },
    meshNumbers: numbers,
    adverts: live.map((n) => n.advert),
  };
}

export async function measure() {
  const T = loadTelco(read('data/telco-churn.csv')), S = loadShop(read('data/online_shoppers_intention.csv'));
  const telco = await domain(T), shop = await domain(S);
  // breadth: every TEST case of both domains in one stream, no label of which domain it is; routed by fit alone
  const ads = [...telco.adverts.map((a) => ({ ...a, domain: 'telco' })), ...shop.adverts.map((a) => ({ ...a, domain: 'shop' }))];
  const stream = [...T.testRows.map((i) => ['telco', caseOf(T, i)]), ...S.testRows.map((i) => ['shop', caseOf(S, i)])];
  const reached = stream.map(([d, x]) => { const r = route(ads, x); return { own: r.filter((a) => a.domain === d).length, other: r.filter((a) => a.domain !== d).length, d }; });
  const breadth = {
    cases: stream.length, liveNodes: ads.length,
    everyCaseReachesAllItsOwnLiveNodes: reached.every((r) => r.own === (r.d === 'telco' ? telco.live.length : shop.live.length)),
    casesReachingTheOtherDomain: reached.filter((r) => r.other > 0).length,
    domainsPerNode: Math.max(...ads.map((a) => new Set(stream.filter(([, x]) => route([a], x).length).map(([d]) => d)).size)),
    domainsCovered: new Set(reached.filter((r) => r.own > 0).map((r) => r.d)).size,
  };
  return { kind: 'dex-frontier.organ-2.record', v: 1, seeds: { node: SEED, route: ROUTE_SEED, shuffle: SHUFFLE_SEED, noise: NOISE_SEED }, telco, shop, breadth };
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-2.mjs');
if (isMain) {
  const r = await measure();
  for (const d of [r.telco, r.shop]) delete d.adverts;
  const text = JSON.stringify(r, null, 1) + '\n';
  if (process.argv.includes('--check')) {
    const committed = read('data/organ-2/record.json');
    if (committed !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(committed).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); }
    console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16));
  } else { mkdirSync(new URL('data/organ-2/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-2/record.json', ROOT), text); console.log('wrote data/organ-2/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
