// src/bodies.mjs — the bodies a department may field, and how it fields one. Four are grown by the seed library's ribosome
// in stages (src/deep.mjs: threshold rules, single or paired, cut at quantiles or at a column's own values); the fifth is
// depth-2 boosted trees (the Living Seed's own mutation-gated baseline kernel, the learner the pooled rival uses), which
// can carry a score another department sends at full resolution where a body of threshold rules keeps only a coarse
// step of it (data/diagnose-5.json, data/diagnose-6.json). Each is grown on FIT alone; the one with the best AUC on GATE
// is fielded (a tie fields the earlier kind). A rule body's genome reads at most MAXFEATS columns, so it reads a
// department's own columns first and then the sent scores that fit, and says how many it read; boosted trees read all.
// Pure and deterministic; wrong arguments are refused with the reason, never thrown.
import { growDeep, scoreDeep } from './deep.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6, MAXFEATS } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

/** the four grown rule bodies' settings (as organs 2g and 2h grew them) */
export const RULE_KINDS = { 'deep-quantile': { cuts: 'quantile' }, 'deep-values': { cuts: 'values' }, 'pairs-quantile': { cuts: 'quantile', pairs: true }, 'pairs-values': { cuts: 'values', pairs: true } };
export const KINDS = [...Object.keys(RULE_KINDS), 'boosted'];

/** the view a body of this kind reads: a rule body the first MAXFEATS columns (a department's own come first), boosted trees every one */
export const readBy = (kind, view) => (!view || !Array.isArray(view.features) || kind === 'boosted' || view.features.length <= MAXFEATS ? view : { ...view, features: view.features.slice(0, MAXFEATS) });

/** a body of one kind grown on rows of a view; null for a kind it does not know */
export function growKind(kind, view, rows, seed = 1) {
  if (!view || !Array.isArray(view.features) || !view.cols || !view.y || !Array.isArray(rows)) return null;
  if (kind === 'boosted') return { kind, model: boosted(view, rows) };
  return Object.hasOwn(RULE_KINDS, kind) ? { kind, deep: growDeep(readBy(kind, view), rows, seed, RULE_KINDS[kind]) } : null;
}

/** a body's score for row i of the view it was grown on */
export const scoreKind = (body, view, i) => (!body || !view || !view.cols ? NaN : body.kind === 'boosted' && body.model ? body.model.score(i) : body.deep ? scoreDeep(body.deep, readBy(body.kind, view), i) : NaN);

/** grow every kind on fitRows; field the best on gateRows → { kind, body, gate: {kind: AUC}, gateAuc, read } */
export function field(view, fitRows, gateRows, options) {
  const { kinds = KINDS, seed = 1 } = options && typeof options === 'object' ? options : {};
  if (!view || !Array.isArray(view.features) || !view.features.length || !view.y || !Array.isArray(fitRows) || !fitRows.length || !Array.isArray(gateRows) || !gateRows.length) return { error: 'a body needs a view with columns and outcomes, and FIT and GATE rows' };
  const use = (Array.isArray(kinds) ? kinds : []).filter((k) => KINDS.includes(k));
  if (!use.length) return { error: 'no kind of body to grow' };
  const gy = gateRows.map((i) => view.y[i]), bodies = use.map((k) => growKind(k, view, fitRows, seed));
  const gate = bodies.map((b) => round6(auc(gateRows.map((i) => scoreKind(b, view, i)), gy))), k = gate.reduce((best, g, j) => (g > gate[best] ? j : best), 0);
  return { kind: use[k], body: bodies[k], gate: Object.fromEntries(use.map((x, j) => [x, gate[j]])), gateAuc: gate[k], read: readBy(use[k], view).features.length };
}
