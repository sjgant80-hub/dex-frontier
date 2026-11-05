// src/breedtrees.mjs — breeding what the mesh fields. In the design check of organ 3 (data/diagnose-9.json) a population
// of rule bodies bred no child beyond the noise, and boosted trees beat every rule body on GATE at 10 of 11 department
// turns, so breeding rule bodies could not change the mesh. Here what breeds is the body the mesh fields: depth-2 boosted
// trees (the Living Seed's own kernel, vendor/living-seed/src/baseline.mjs), bred by their recipe, which is what a seed is
// here: how many rounds, how fast, how finely each column is cut, how hard each leaf is held back, and which of the
// department's columns it reads. The first founder is the recipe a department fields today (the kernel's defaults, every
// column); the others are drawn from contributors' seeds. A child takes each gene from one parent or the other (⋈) and,
// half the time, one gene changes (μ); it is born only if it leads the better of its parents beyond the noise (𝟙) on
// CHECK rows that no founder and no child grew on, the bound src/breed.mjs uses; parents are picked by rank (f).
// Pure, seeded and deterministic; wrong arguments are refused with the reason, never thrown.
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { bornIf, pickBy, bestOf } from './breed.mjs';
import { rng, coin, draw, auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

/** the recipe a department fields today: the kernel's own defaults, reading every column */
export const INCUMBENT = Object.freeze({ rounds: 200, rate: 0.1, bins: 32, lambda: 1, minHess: 1, drop: Object.freeze([]) });

/** the values each gene may take (the incumbent's among them) */
export const GENES = Object.freeze({ rounds: [50, 100, 200, 300, 400], rate: [0.03, 0.05, 0.1, 0.2, 0.3], bins: [8, 16, 32, 64], lambda: [0.1, 1, 10], minHess: [1, 5, 20] });
const NAMES = Object.keys(GENES);

/** a recipe's columns left out, made legal: whole, distinct, in range, ascending, and never more than half of nf */
export function legalDrop(drop, nf) {
  const out = [...new Set((Array.isArray(drop) ? drop : []).filter((k) => Number.isInteger(k) && k >= 0 && k < nf))].sort((a, b) => a - b);
  return out.slice(0, Math.floor(nf / 2));
}

/** a contributor's recipe: each gene drawn from its values; each column left out with a chance of one in four */
export function randomRecipe(r, nf) {
  const g = Object.fromEntries(NAMES.map((k) => [k, GENES[k][draw(r, GENES[k].length)]]));
  return { ...g, drop: legalDrop(Array.from({ length: nf }, (_, k) => k).filter(() => draw(r, 4) === 0), nf) };
}

/** ⋈ then μ: each gene, and each column's in-or-out, from one parent or the other; half the time one gene is redrawn */
export function crossRecipe(a, b, nf, r) {
  const g = Object.fromEntries(NAMES.map((k) => [k, coin(r) ? a[k] : b[k]]));
  let drop = Array.from({ length: nf }, (_, k) => k).filter((k) => (coin(r) ? a.drop : b.drop).includes(k));
  if (coin(r)) {
    const k = draw(r, NAMES.length + 1);
    if (k < NAMES.length) g[NAMES[k]] = GENES[NAMES[k]][draw(r, GENES[NAMES[k]].length)];
    else { const c = draw(r, nf); drop = drop.includes(c) ? drop.filter((x) => x !== c) : [...drop, c]; }
  }
  return { ...g, drop: legalDrop(drop, nf) };
}

/** the view a recipe reads: the department's columns, less the ones it leaves out */
export const readOf = (view, drop) => ({ ...view, features: view.features.filter((_, k) => !drop.includes(k)) });

/** boosted trees grown on rows of the view by this recipe; null for a wrong argument */
export function growRecipe(view, rows, g) {
  if (!view || !Array.isArray(view.features) || !view.features.length || !view.cols || !view.y || !Array.isArray(rows) || !rows.length || !g || !Array.isArray(g.drop)) return null;
  const { rounds, rate, bins, lambda, minHess } = g;
  return { kind: 'boosted', recipe: g, model: boosted(readOf(view, legalDrop(g.drop, view.features.length)), rows, { rounds, rate, bins, lambda, minHess }) };
}

/**
 * evolveTrees({ view, growRows, checkRows, founders, generations, attempts, size, resamples, seed })
 *   founders  whole-number contributor seeds; the first founder is the incumbent recipe, the others drawn from their seeds
 * → { ok, founders: [{ id, recipe, check }], born, refused, lineage: [{ child, parents, recipe, check, bound }],
 *     history: [best CHECK per generation, from the founders], champion: { id, recipe, check }, incumbent: { check } }
 */
export function evolveTrees(args) {
  const a = args && typeof args === 'object' ? args : {};
  const { view, growRows, checkRows, founders = [1, 2, 3, 4], generations = 3, attempts = 4, size = founders.length, resamples = 2000, seed = 1 } = a;
  if (!view || !Array.isArray(view.features) || !view.features.length || !view.cols || !view.y || !Array.isArray(growRows) || !Array.isArray(checkRows) || !growRows.length || !checkRows.length) return { ok: false, error: 'breeding needs a view with columns and outcomes, and grow and check rows' };
  if (!Array.isArray(founders) || founders.length < 2 || !founders.every(Number.isInteger) || new Set(founders).size !== founders.length) return { ok: false, error: 'breeding needs at least two founders, each a different whole-number seed' };
  if (![generations, attempts, size].every(Number.isInteger) || generations < 0 || attempts < 0 || size < 2) return { ok: false, error: 'generations and attempts are whole numbers, and the population keeps at least two' };
  const nf = view.features.length, cy = checkRows.map((i) => view.y[i]);
  const member = (id, recipe) => { const m = growRecipe(view, growRows, recipe).model, s = checkRows.map((i) => m.score(i)); return { id, recipe, scores: s, check: round6(auc(s, cy)) }; };
  let pop = founders.map((s, k) => member('f' + s, k === 0 ? { ...INCUMBENT, drop: [] } : randomRecipe(rng(s * 7919 + 11), nf)));
  const first = pop.map(({ id, recipe, check }) => ({ id, recipe, check })), incumbent = { check: pop[0].check }, history = [bestOf(pop).check], lineage = [], r = rng(seed * 7907 + 5);
  let refused = 0, k = 0;
  for (let gen = 0; gen < generations; gen++) {
    const kids = [];
    for (let t = 0; t < attempts; t++) {
      const x = pickBy(pop, r), y = pickBy(pop.filter((m) => m.id !== x.id), r), child = member('c' + ++k, crossRecipe(x.recipe, y.recipe, nf, r));
      const gate = bornIf(child.scores, bestOf([x, y]).scores, cy, resamples, seed + k);
      if (gate.born) { kids.push(child); lineage.push({ child: child.id, parents: [x.id, y.id], recipe: child.recipe, check: child.check, bound: gate.bound }); } else refused++;
    }
    pop = [...pop, ...kids].sort((p, q) => q.check - p.check).slice(0, size);
    history.push(bestOf(pop).check);
  }
  const champ = bestOf(pop);
  return { ok: true, founders: first, born: lineage.length, refused, lineage, history, champion: { id: champ.id, recipe: champ.recipe, check: champ.check }, incumbent };
}
