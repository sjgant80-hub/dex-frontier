// src/breed.mjs — breeding (organ 3) redesigned on the mechanism that held the gate (organs 2j and 2k). There a department
// fields whichever of five bodies does best on GATE: four grown rule bodies (src/deep.mjs, staged scorecards found by
// the seed library's ribosome) or boosted trees. Breeding gives a department a population of rule bodies instead of
// one: founders grown from different contributors' seeds on the same records, and children of two of them, their
// stages crossed one by one (⋈) and, half the time, one stage changed (μ). A child is born only if it leads the better
// of its parents beyond the noise (𝟙: the paired bootstrap's 95% lower bound above 0, the bound every join here uses)
// on CHECK rows that no founder and no child grew on, so birth never spends GATE, which the mechanism keeps for
// fielding, the join and the coupling; parents are picked with a chance that rises with their rank on CHECK (f); every
// child names both parents (lineage). The champion is the best on CHECK, re-expressed on every training row; the
// department then fields it only if it beats the department's other bodies on GATE, as any body must.
// Pure, seeded and deterministic; wrong arguments are refused with the reason, never thrown.
import { genomeOps, fitter, growDeep, scoreDeep } from './deep.mjs';
import { RULE_KINDS, readBy } from './bodies.mjs';
import { pairedLow } from './stats.mjs';
import { rng, coin, draw, auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

/** the lead a child must show over its better parent, at its 95% lower bound */
export const BEYOND = 0;

/** a rule body's genomes, stage by stage (what breeds; thresholds are refitted wherever the body is expressed) */
export const genomesOf = (body) => (body && body.deep && Array.isArray(body.deep.stages) ? body.deep.stages.map((c) => c.genome) : []);

/** ⋈ then μ: stages crossed one by one; a stage only one parent has is taken half the time; half the time one stage of the
 *  child changes once. Pairs carry their second condition through both, as src/deep.mjs's own operations do. */
export function cross(ga, gb, pairs, r) {
  const G = genomeOps(pairs), out = [];
  for (let s = 0; s < Math.max(ga.length, gb.length); s++) {
    if (s < ga.length && s < gb.length) out.push(G.cross(ga[s], gb[s], r));
    else if (coin(r)) out.push(s < ga.length ? ga[s] : gb[s]);
  }
  if (out.length && coin(r)) { const k = draw(r, out.length); out[k] = G.mutate(out[k], r); }
  return out;
}

/** a body of this rule kind with exactly these genomes, every threshold fitted on `rows` of the view */
export function express(kind, genomes, view, rows) {
  if (!Object.hasOwn(RULE_KINDS, kind) || !Array.isArray(genomes) || !view || !Array.isArray(view.features) || !Array.isArray(rows)) return null;
  const card = fitter(readBy(kind, view), rows, RULE_KINDS[kind].cuts);
  return { kind, deep: { stages: genomes.map((g) => card(g)) } };
}

/** f: a member picked with a chance proportional to its rank on CHECK (the best the likeliest), seeded; ties keep their order */
export function pickBy(pop, r) {
  const ranked = [...pop].sort((p, q) => q.check - p.check), total = (ranked.length * (ranked.length + 1)) / 2, t = r() * total;
  let acc = 0;
  return ranked.find((_, k) => (acc += ranked.length - k) > t);
}

/** the first member with the best CHECK score (a tie keeps the earlier) */
export const bestOf = (pop) => pop.reduce((b, m) => (m.check > b.check ? m : b), pop[0]);

/** 𝟙: a child is born only if its scores lead its better parent's on the CHECK outcomes, and beyond the noise. A child
 *  that does not lead at all is refused before the bootstrap is drawn (the bound is not needed to refuse it). */
export function bornIf(child, parent, y, resamples = 2000, seed = 99) {
  const lead = round6(auc(child, y) - auc(parent, y));
  if (!(lead > 0)) return { born: false, lead, bound: null };
  const bound = pairedLow(child, parent, y, resamples, seed);
  return { born: bound > BEYOND, lead, bound };
}

/**
 * evolve({ kind, view, growRows, checkRows, founders, generations, attempts, size, resamples, seed, grow })
 *   kind        one of src/bodies.mjs's rule kinds; founders are that kind, grown on growRows from each contributor seed
 *   grow        optional settings for the founders' growth (src/deep.mjs DEEP; the defaults are the bodies' own)
 * → { ok, founders: [{ id, check }], born, refused, lineage: [{ child, parents, check, bound }], history: [best CHECK per
 *   generation, from the founders], champion: { id, genomes, check }, bestFounder: { id, genomes, check } }
 */
export function evolve(args) {
  const a = args && typeof args === 'object' ? args : {};
  const { kind, view, growRows, checkRows, founders = [1, 2, 3, 4], generations = 3, attempts = 4, size = founders.length, resamples = 2000, seed = 1, grow = {} } = a;
  if (!Object.hasOwn(RULE_KINDS, kind) || !view || !Array.isArray(view.features) || !view.features.length || !view.y || !Array.isArray(growRows) || !Array.isArray(checkRows) || !growRows.length || !checkRows.length) return { ok: false, error: 'breeding needs a rule kind, a view with columns and outcomes, and grow and check rows' };
  if (!Array.isArray(founders) || founders.length < 2 || !founders.every(Number.isInteger) || new Set(founders).size !== founders.length) return { ok: false, error: 'breeding needs at least two founders, each a different whole-number seed' };
  if (![generations, attempts, size].every(Number.isInteger) || generations < 0 || attempts < 0 || size < 2) return { ok: false, error: 'generations and attempts are whole numbers, and the population keeps at least two' };
  const cy = checkRows.map((i) => view.y[i]), on = readBy(kind, view);
  const member = (id, genomes) => { const body = express(kind, genomes, view, growRows), s = checkRows.map((i) => scoreDeep(body.deep, on, i)); return { id, genomes, scores: s, check: round6(auc(s, cy)) }; };
  let pop = founders.map((s) => member('f' + s, genomesOf({ deep: growDeep(on, growRows, s, { ...RULE_KINDS[kind], ...grow }) })));
  const first = pop.map(({ id, check }) => ({ id, check })), bestFounder = bestOf(pop), history = [bestFounder.check], lineage = [], r = rng(seed * 7907 + 3);
  let refused = 0, k = 0;
  for (let gen = 0; gen < generations; gen++) {
    const kids = [];
    for (let t = 0; t < attempts; t++) {
      const x = pickBy(pop, r), y = pickBy(pop.filter((m) => m.id !== x.id), r), child = member('c' + ++k, cross(x.genomes, y.genomes, RULE_KINDS[kind].pairs === true, r));
      const gate = child.genomes.length ? bornIf(child.scores, bestOf([x, y]).scores, cy, resamples, seed + k) : { born: false };
      if (gate.born) { kids.push(child); lineage.push({ child: child.id, parents: [x.id, y.id], check: child.check, bound: gate.bound }); } else refused++;
    }
    pop = [...pop, ...kids].sort((p, q) => q.check - p.check).slice(0, size);
    history.push(bestOf(pop).check);
  }
  const champ = bestOf(pop), out = (m) => ({ id: m.id, genomes: m.genomes, check: m.check });
  return { ok: true, founders: first, born: lineage.length, refused, lineage, history, champion: out(champ), bestFounder: out(bestFounder) };
}
