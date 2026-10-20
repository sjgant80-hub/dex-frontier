// src/deep.mjs — a deeper grown body. The seed library's ribosome grows a scorecard of at most six single-column threshold
// rules; the diagnosis (data/diagnose.json, FIT and GATE only) found that too shallow to carry a department's signal on
// the telecom customers: one deep model per department, sending one score, came within 0.005 of every column pooled, the
// six-rule nodes 0.031 short. A deep body is the same ribosome grown in STAGES. Each stage evolves one more scorecard with
// the seed library's own genome, crossover and mutation; its fitness is the AUC of the body so far PLUS this stage, so
// each stage grows on what the stages before it missed. The department's training rows are cut three ways: thresholds
// are set on REST, the search selects on SELECT, and a stage is kept only if it beats the body so far on CHECK — rows the
// search never saw (𝟙), so a stage that only fits the search's own rows is refused, and growth stops when it stops
// paying. Pure, deterministic, total on its inputs.
import { splitRows, rng, draw, coin, fit, scoreRow, auc, round6, stemGenome, randomGenome, crossGenome, mutateGenome } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

export const DEEP = { population: 40, elites: 8, generations: 30, stages: 8 };

/**
 * grow a deep body on `trainRows` of `dataset` (features, cols, y) from `seed`.
 * → { stages: [scorecard], history: [CHECK AUC after each kept stage], rules, refused: the stage that did not pay, or null }
 */
export function growDeep(dataset, trainRows, seed, cfg = DEEP) {
  const { population, elites, generations, stages } = { ...DEEP, ...cfg };
  if (!dataset || !Array.isArray(dataset.features) || !dataset.features.length || !Array.isArray(trainRows)) return { stages: [], history: [], rules: 0, refused: null };
  // too few rows to hold any out: every stage scores 0.5 against a body of 0.5, so the first is refused and nothing grows
  const inner = splitRows(dataset, trainRows, 1 / 3, seed), cut = splitRows(dataset, inner.held, 1 / 2, seed + 1);
  const rest = inner.rest, select = cut.rest, check = cut.held, sy = select.map((i) => dataset.y[i]), cy = check.map((i) => dataset.y[i]);
  const r = rng(seed * 7919 + 1), onSelect = new Float64Array(select.length), onCheck = new Float64Array(check.length), cards = [], history = [];
  let so = auc(Array.from(onCheck), cy), refused = null;
  for (let s = 0; s < stages; s++) {
    let born = 0;
    const live = (g) => { const card = fit(dataset, rest, g); return { g, n: born++, fitness: auc(select.map((i, k) => onSelect[k] + scoreRow(card, dataset, i)), sy) }; };
    const better = (a, b) => a.fitness > b.fitness || (a.fitness === b.fitness && a.n < b.n);
    let pop = [stemGenome(), ...Array.from({ length: population - 1 }, () => randomGenome(r))].map(live);
    for (let gen = 1; gen < generations; gen++) {
      const battle = () => { const a = pop[draw(r, pop.length)], b = pop[draw(r, pop.length)]; return better(b, a) ? b : a; };
      const next = [...pop].sort((a, b) => (better(a, b) ? -1 : 1)).slice(0, elites);
      while (next.length < population) { const child = crossGenome(battle().g, battle().g, r); next.push(live(coin(r) ? mutateGenome(child, r) : child)); }
      pop = next;
    }
    const champ = pop.reduce((a, b) => (better(b, a) ? b : a)), card = fit(dataset, rest, champ.g);
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
