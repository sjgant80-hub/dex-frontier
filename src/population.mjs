// src/population.mjs — μ ⋈κ f 𝟙 for the nodes of one silo: the spec's breeding, gated. Several contributors grow nodes
// on the same silo from different seeds; two of them breed a child whose genome is theirs crossed rule by rule (⋈,
// seed-library's crossover) and, half the time, changed once (μ, seed-library's mutation); the child is sealed naming
// both parents and grown on the silo like any node; it is born only if it beats BOTH parents on GATE (𝟙 — a child is
// never a promise, it is what grew); fitter nodes are picked to breed more often (f); the population keeps its best.
// Every child's lineage is in its seal: its parents' genome ids. Pure apart from the signatures, seeded, total.
import { encodeSeed, makeSeed, crossGenome, mutateGenome, unpackGenome, fromHex, rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { seal } from '../vendor/living-seed/src/genome.mjs';
import { growNode } from './node.mjs';

/** a grown node's rule genome, read back from its body */
export const genomeOf = (organ) => unpackGenome(fromHex(organ.body.genome));

/** a fixed recipe: this exact genome for this silo (thresholds are still fitted to the silo's own records) */
export const fixedRecipe = (domain, seed, genome) => encodeSeed(makeSeed({ domain, seed, genome }));

/** a node as the population holds it */
export const member = (sealed, grown) => ({ id: sealed.id, text: sealed.text, organism: grown.organism, organ: grown.organ, gateAuc: grown.organ.heldAuc });

/** breed a and b on the silo. → { born: true, child, parents } | { born: false, why, parents } */
export async function breed(a, b, view, keys, seed) {
  const r = rng(seed);
  let g = crossGenome(genomeOf(a.organ), genomeOf(b.organ), r);
  if (r() < 0.5) g = mutateGenome(g, r);
  const parents = [a.id, b.id], bar = Math.max(a.organism.gate.auc, b.organism.gate.auc);
  const sealed = await seal({ name: 'node-' + view.name, parents, gate: { auc: bar }, organs: [fixedRecipe(view.name, seed, g)] }, keys);
  if (!sealed.ok) return { born: false, why: 'it could not be sealed: ' + sealed.why, parents };
  const grown = await growNode(sealed.text, view);
  if (!grown.ok || !grown.organ) return { born: false, why: 'it could not grow here', parents };
  const beat = Math.max(a.gateAuc, b.gateAuc);
  if (grown.organ.state !== 'live') return { born: false, why: 'it was cut at its gate', parents };
  if (!(grown.organ.heldAuc > beat)) return { born: false, why: 'GATE ' + grown.organ.heldAuc + ' does not beat both parents (' + beat + ')', parents };
  return { born: true, child: member(sealed, grown), parents };
}

/** f: a parent picked with probability proportional to its rank (the fittest is the likeliest), seeded */
export function pick(pop, r) {
  const ranked = [...pop].sort((p, q) => q.gateAuc - p.gateAuc || (p.id < q.id ? -1 : 1)), total = (ranked.length * (ranked.length + 1)) / 2;
  let t = r() * total;
  for (let k = 0; k < ranked.length; k++) { t -= ranked.length - k; if (t < 0) return ranked[k]; }
  return ranked[ranked.length - 1];
}

/**
 * Evolve a silo's population: each generation, `attempts` breedings between two distinct parents picked by fitness;
 * children born through the gate join; the population keeps its `size` best. The best GATE score never falls.
 * → { pop, history: [best GATE per generation, from the start], born, refused, lineage: [{ child, parents }] }
 */
export async function evolve(pop, view, keys, { generations = 4, attempts = 6, size = pop.length, seed = 1 } = {}) {
  const r = rng(seed), lineage = [];
  let refused = 0, k = 0;
  const best = (p) => Math.max(...p.map((m) => m.gateAuc));
  const history = [best(pop)];
  for (let gen = 0; gen < generations; gen++) {
    const kids = [];
    for (let t = 0; t < attempts; t++) {
      const a = pick(pop, r);
      let b = pick(pop, r);
      for (let tries = 0; b.id === a.id && tries < 8; tries++) b = pick(pop, r);
      if (b.id === a.id) continue;
      const out = await breed(a, b, view, keys, seed * 1000 + ++k);
      if (out.born) { kids.push(out.child); lineage.push({ child: out.child.id, parents: out.parents, childGate: out.child.gateAuc, parentGates: [a.gateAuc, b.gateAuc] }); } else refused++;
    }
    pop = [...pop, ...kids].sort((p, q) => q.gateAuc - p.gateAuc || (p.id < q.id ? -1 : 1)).slice(0, size);
    history.push(best(pop));
  }
  return { pop, history, born: lineage.length, refused, lineage };
}
