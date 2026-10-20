#!/usr/bin/env node
// tools/measure-4.mjs — organ 4, SELF-GROWING: a node grows as its work arrives. FIT records arrive over time (telco: in
// a seeded order, the data carries no dates; shop: month by month, February to October, read from the file). At each of
// four steps every silo's node re-grows from everything that has arrived (the same seed), is held to its bar on GATE,
// and the mesh is re-coupled; then the mesh is scored on TEST. Does it sharpen as it works?
// Deterministic:  node tools/measure-4.mjs [--check] → data/organ-4/record.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { arrivals, order, seenSoFar } from '../src/wisp.mjs';
import { lead } from '../src/stats.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf, mesh, testAuc } from './mesh.mjs';

export const STEPS = 4, ORDER_SEED = 4004;
const ROOT = new URL('../', import.meta.url);
const MONTHS = ['Feb', 'Mar', 'May', 'June', 'Jul', 'Aug', 'Sep', 'Oct'];
export const SHOP_STEPS = [['Feb', 'Mar'], ['May', 'June'], ['Jul', 'Aug'], ['Sep', 'Oct']];   // cumulative: each step adds two months

/** the FIT rows in arrival order, cut into the four cumulative steps */
function schedule(ds) {
  if (ds.name === 'telco') return arrivals(order(ds.fitRows, ORDER_SEED), STEPS);
  const month = read('data/online_shoppers_intention.csv').split(/\r?\n/).filter(Boolean).slice(1).map((l) => l.split(',')[10]);
  const fit = new Set(ds.fitRows);
  return SHOP_STEPS.map((_, k) => { const upTo = new Set(SHOP_STEPS.slice(0, k + 1).flat()); return ds.fitRows.filter((i) => fit.has(i) && upTo.has(month[i])); });
}

async function domain(ds) {
  const steps = schedule(ds), testY = ds.testRows.map((i) => ds.y[i]), out = [];
  let prev = null;
  for (const [k, rows] of steps.entries()) {
    const views = Object.keys(ds.silos).map((s) => seenSoFar(silo(ds, s), rows)), ns = await nodes(views), live = liveOf(ns), m = mesh(ds, live), s = m.score(ds.testRows);
    out.push({ step: k + 1, rowsSeen: rows.length, live: live.map((n) => n.name), gate: ns.map((n) => ({ silo: n.name, state: n.advert.state, gateAuc: n.advert.gateAuc })), testAuc: testAuc(ds, s), vsPrevious: prev ? lead(s, prev, testY) : null });
    prev = s;
  }
  const first = out[0], last = out[out.length - 1];
  return { steps: out, firstToLast: { from: first.testAuc, to: last.testAuc } };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.organ-4.record', v: 1, settings: { steps: STEPS, orderSeed: ORDER_SEED, shopSteps: SHOP_STEPS, monthsInFit: MONTHS } };
  for (const d of ['telco', 'shop']) out[d] = await domain(D[d]);
  const sched = schedule(D.telco), late = new Set(D.telco.fitRows.filter((i) => !sched[0].includes(i)));
  // the first step's nodes grew only on what had arrived: scramble every row that came later, and the first step is unchanged
  const cols = Object.fromEntries(Object.entries(D.telco.cols).map(([k, v]) => [k, Float64Array.from(v, (x, i) => (late.has(i) ? -7 : x))]));
  const scrambled = { ...D.telco, cols }, s1 = await nodes(Object.keys(scrambled.silos).map((s) => seenSoFar(silo(scrambled, s), sched[0])));
  out.onlyWhatArrived = s1.map((n) => n.organism.id).join() === (await nodes(Object.keys(D.telco.silos).map((s) => seenSoFar(silo(D.telco, s), sched[0])))).map((n) => n.organism.id).join();
  out.cumulative = ['telco', 'shop'].every((d) => out[d].steps.every((s, k) => k === 0 || s.rowsSeen > out[d].steps[k - 1].rowsSeen));
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-4.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-4/record.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { mkdirSync(new URL('data/organ-4/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-4/record.json', ROOT), text); console.log('wrote data/organ-4/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
