// src/deep.mjs — a deeper grown body. The seed library's ribosome grows a scorecard of at most six single-column threshold
// rules; the diagnosis (data/diagnose.json, FIT and GATE only) found that too shallow to carry a department's signal on
// the telecom customers: one deep model per department, sending one score, came within 0.005 of every column pooled, the
// six-rule nodes 0.031 short. A deep body is the same ribosome grown in STAGES. Each stage evolves one more scorecard with
// the seed library's own genome, crossover and mutation; its fitness is the AUC of the body so far PLUS this stage, so
// each stage grows on what the stages before it missed. The department's training rows are cut three ways: thresholds
// are set on REST, the search selects on SELECT, and a stage is kept only if it beats the body so far on CHECK — rows the
// search never saw (𝟙), so a stage that only fits the search's own rows is refused, and growth stops when it stops
// paying. HELD sets the share of the training rows held out for SELECT and CHECK together (a larger CHECK judges each
// stage on more rows). No step damping: fitness is AUC, which ignores scale, so damping every stage alike changes
// nothing (a test showed it), and each rule's weight grid already sets a stage's size. Pure, deterministic, total.
import { splitRows, rng, draw, coin, fit, scoreRow, auc, round6, stemGenome, randomGenome, crossGenome, mutateGenome, MAXRULES, QGRID, WGRID } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

export const DEEP = { population: 40, elites: 8, generations: 30, stages: 8, held: 1 / 3 };

/** the seed library's fit(dataset, rows, genome), exactly, with each column's values on `rows` sorted once, not once per rule */
export function fitter(dataset, rows) {
  const feats = dataset.features, nf = feats.length, sorted = new Map(), base = rows.length ? rows.reduce((a, i) => a + dataset.y[i], 0) / rows.length : 0;
  const at = (feat, q) => { if (!sorted.has(feat)) sorted.set(feat, rows.map((i) => dataset.cols[feat][i]).sort((a, b) => a - b)); const xs = sorted.get(feat); return xs[Math.floor(q * (xs.length - 1))]; };   // no rows: undefined, which round6 reads as 0, as the library does
  const slots = Array.from({ length: MAXRULES }, (_, r) => r);
  return (genome) => ({ genome, base: round6(base), rules: slots.filter((r) => (genome.on >> r) & 1).map((r) => {
    const feat = feats[genome['f' + r] % nf];
    return { feat, op: genome['d' + r] & 1 ? '>' : '<=', v: round6(at(feat, QGRID[genome['q' + r] % QGRID.length])), w: WGRID[genome['w' + r] % WGRID.length] };
  }) });
}

/**
 * grow a deep body on `trainRows` of `dataset` (features, cols, y) from `seed`.
 * → { stages: [scorecard], history: [CHECK AUC after each kept stage], rules, refused: the stage that did not pay, or null }
 */
export function growDeep(dataset, trainRows, seed, cfg = DEEP) {
  const { population, elites, generations, stages, held } = { ...DEEP, ...cfg };
  if (!dataset || !Array.isArray(dataset.features) || !dataset.features.length || !Array.isArray(trainRows)) return { stages: [], history: [], rules: 0, refused: null };
  // too few rows to hold any out: every stage scores 0.5 against a body of 0.5, so the first is refused and nothing grows
  const inner = splitRows(dataset, trainRows, held, seed), cut = splitRows(dataset, inner.held, 1 / 2, seed + 1);
  const rest = inner.rest, select = cut.rest, check = cut.held, sy = select.map((i) => dataset.y[i]), cy = check.map((i) => dataset.y[i]);
  const express = fitter(dataset, rest), r = rng(seed * 7919 + 1), onSelect = new Float64Array(select.length), onCheck = new Float64Array(check.length), cards = [], history = [];
  let so = auc(Array.from(onCheck), cy), refused = null;
  for (let s = 0; s < stages; s++) {
    const live = (g) => { const card = express(g); return { g, fitness: auc(select.map((i, k) => onSelect[k] + scoreRow(card, dataset, i)), sy) }; };
    const rank = (p) => [...p].sort((a, b) => b.fitness - a.fitness);   // stable: on a tie the one already ahead stays ahead
    let pop = rank([stemGenome(), ...Array.from({ length: population - 1 }, () => randomGenome(r))].map(live));
    for (let gen = 1; gen < generations; gen++) {
      const battle = () => { const a = pop[draw(r, pop.length)], b = pop[draw(r, pop.length)]; return b.fitness > a.fitness ? b : a; };
      const next = pop.slice(0, elites);
      while (next.length < population) { const child = crossGenome(battle().g, battle().g, r); next.push(live(coin(r) ? mutateGenome(child, r) : child)); }
      pop = rank(next);
    }
    const champ = pop[0], card = express(champ.g);
    const passed = auc(check.map((i, k) => onCheck[k] + scoreRow(card, dataset, i)), cy);
    if (!(passed > so)) { refused = { stage: s + 1, check: round6(passed), bodySoFar: round6(so) }; break; }
    select.forEach((i, k) => { onSelect[k] += scoreRow(card, dataset, i); });
    check.forEach((i, k) => { onCheck[k] += scoreRow(card, dataset, i); });
    so = passed;
    cards.push(fit(dataset, trainRows, champ.g));   // expressed on all of the department's training rows, as the seed library does
    history.push(round6(so));
  }
  return { stages: cards, history, rules: cards.reduce((a, c) => a + c.rules.length, 0), refused };
}

/** a deep body's score for row i: the sum of its stages */
export const scoreDeep = (deep, dataset, i) => deep.stages.reduce((a, c) => a + scoreRow(c, dataset, i), 0);
