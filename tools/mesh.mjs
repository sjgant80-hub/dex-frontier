// tools/mesh.mjs — building a mesh, shared by the organs after the gate (organ 2's own code stays pinned, untouched):
// grow a node per view from its contributor's seed, keep the live ones in GATE order, learn the coupling on GATE, and
// score any rows composed. The same steps organ 2 measured, as functions.
import { readFileSync } from 'node:fs';
import { loadTelco, loadShop, silo } from '../src/silos.mjs';
import { contributor, sealNode, growNode, scores, advert } from '../src/node.mjs';
import { couple, coupled } from '../src/compose.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

const ROOT = new URL('../', import.meta.url);
export const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const datasets = () => ({ telco: loadTelco(read('data/telco-churn.csv')), shop: loadShop(read('data/online_shoppers_intention.csv')) });

/** one node per view (seed 1, the contributor named by the silo), grown */
export async function nodes(views, { seed = 1, maker = (v) => v.name.split('-').slice(1).join('-') } = {}) {
  const out = [];
  for (const view of views) {
    const keys = await contributor(maker(view)), g = await sealNode(view, keys, { seed }), n = await growNode(g.text, view);
    out.push({ name: view.name, view, genome: g, grown: n, organism: n.organism, organ: n.organ, advert: advert(n.organism, view), keys });
  }
  return out;
}

/** the live nodes, best GATE first (ties by name) */
export const liveOf = (ns) => ns.filter((n) => n.advert.state === 'live').sort((a, b) => b.advert.gateAuc - a.advert.gateAuc || (a.name < b.name ? -1 : 1));

/** a mesh: the coupling learned on GATE over these live nodes (organ 2's free coupling unless another is given) */
export function mesh(ds, live, coupler = couple) {
  const gateY = ds.gateRows.map((i) => ds.y[i]), gateCols = live.map((n) => scores(n.organism, n.view, ds.gateRows)), c = coupler(gateCols, gateY);
  const cols = (rows) => live.map((n) => scores(n.organism, n.view, rows));
  return { c, gateCols, gateY, cols, score: (rows) => { const k = cols(rows); return rows.map((_, r) => coupled(c, k.map((x) => x[r]))); } };
}

/** test AUC of scores on TEST */
export const testAuc = (ds, s) => round6(auc(s, ds.testRows.map((i) => ds.y[i])));

/** organ 2's coarse silos for a domain, as views */
export const coarse = (ds) => Object.keys(ds.silos).map((s) => silo(ds, s));
