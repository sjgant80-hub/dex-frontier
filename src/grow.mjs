// src/grow.mjs — the mesh grows only by what it can tell apart from noise. In organ 2i the sixth department to join the
// news articles' mesh raised its out-of-fold score on GATE by 0.0013 and lowered TEST by 0.0011: a gain that small is
// inside the noise of the cases it was measured on, so it could fall either way (diagnose-7: a rule that admits on any
// gain at all admits every department, and changes nothing). Here the relay and the join are one step. Departments are
// offered strongest first; each grows on its own columns and the scores of the departments ADMITTED before it, and joins
// only if the mesh's out-of-fold GATE predictions with it lead the predictions without it (at first, a coin) beyond the
// noise: the 95% lower bound of the paired bootstrap's AUC lead (src/stats.mjs, the bound every claim here is judged by)
// above 0. A department refused sends no score and holds no seat, so the mesh at every size is made only of what joined.
// How the mesh predicts out of fold, how a department fields a body, grows one and scores one are passed in, so the rule
// is the same for any body and any coupling. Pure and total: wrong arguments are refused with the reason, never thrown;
// a mesh that throws or gives no prediction per case refuses that department, said in its step.
import { withSent, foldsOf } from './relay.mjs';
import { pairedLow } from './stats.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

/** the lead a department must show, at its 95% lower bound */
export const BEYOND = 0;

/** a coupling's out-of-fold predictions on the rows given: every row predicted by a coupling that never learned from it
 *  (folds by position, as src/select.mjs oofAuc holds them out) */
export function oofPredict(coupler, columns, y, folds = 4) {
  const pred = new Array(y.length);
  for (let f = 0; f < folds; f++) {
    const tr = [], ho = [];
    y.forEach((_, i) => (i % folds === f ? ho : tr).push(i));
    const m = coupler.learn(columns.map((c) => tr.map((i) => c[i])), tr.map((i) => y[i]));
    for (const i of ho) pred[i] = m.predict(columns.map((c) => c[i]));
  }
  return pred;
}

/** the mesh's out-of-fold predictions: those of the coupling with the best out-of-fold AUC (the first, on a tie) — the
 *  coupling src/select.mjs choose() would pick */
export function chosenOof(couplers, columns, y, folds = 4) {
  const all = couplers.map((c) => oofPredict(c, columns, y, folds)), a = all.map((p) => auc(p, y));
  return all[a.indexOf(Math.max(...a))];
}

const isSeq = (x) => Array.isArray(x) || (ArrayBuffer.isView(x) && !(x instanceof DataView));
const fns = ['viewOf', 'field', 'grow', 'score', 'mesh'];

/**
 * grow({ order, viewOf, field, grow, score, mesh, y, fitRows, gateRows, otherRows, n, folds, max, resamples, seed })
 *   order      department names, strongest first
 *   viewOf     name → its own view { features, cols, y }
 *   field      view → { body, ... }: grows on FIT and fields one body (the caller's rule)
 *   grow       (view, rows, fielded) → a body of the fielded kind grown on rows
 *   score      (body, view, i) → a number
 *   mesh       (gateColumns, gateY) → the mesh's out-of-fold prediction for every GATE case
 *   y          every row's outcome; fitRows the rows bodies grow on; gateRows the rows the join is judged on;
 *              otherRows every row the full body scores besides GATE (TEST)
 * → { ok, departments: [{ name, took, view, fielded, col, joins, before, with, bound, why }], admitted: [names] } —
 *   col holds a score for every GATE and other row, and, for a department that joins and is not the last offered, a
 *   cross-fitted score for every FIT row (a score sent for a FIT case comes from a body that never grew on it)
 */
export function grow(args) {
  const a = args && typeof args === 'object' ? args : {};
  const { order, y, fitRows, gateRows, otherRows, n, folds = 4, max = 16, resamples = 2000, seed = 99 } = a;
  if (!Array.isArray(order) || !order.length || !fns.every((f) => typeof a[f] === 'function') || !isSeq(y) || ![fitRows, gateRows, otherRows].every(Array.isArray) || !gateRows.length || !Number.isInteger(n) || n < 1) return { ok: false, error: 'growing a mesh needs an order, its five functions, the outcomes, the rows and n' };
  if (!foldsOf(fitRows, folds).length) return { ok: false, error: 'folds must be a whole number of at least 2' };
  const gy = gateRows.map((i) => y[i]), sent = [], seats = [], departments = [];
  let without = gy.map(() => 0.5);
  for (const [k, name] of order.entries()) {
    const own = a.viewOf(name);
    if (!own || !Array.isArray(own.features)) return { ok: false, error: 'no view for ' + name };
    const { view, took } = withSent(own, sent, max), fielded = a.field(view), col = new Float64Array(n);
    for (const i of [...gateRows, ...otherRows]) col[i] = a.score(fielded.body, view, i);
    let pred = null, why = null;
    try { pred = a.mesh([...seats, gateRows.map((i) => col[i])], gy); } catch (e) { why = 'the mesh failed: ' + String((e && e.message) || e); }
    if (why === null && !(isSeq(pred) && pred.length === gy.length && Array.from(pred).every(Number.isFinite))) why = 'the mesh gave no prediction for every GATE case';
    const bound = why === null ? pairedLow(Array.from(pred), without, gy, resamples, seed) : null, joins = why === null && bound > BEYOND;
    departments.push({ name, took, view, fielded, col, joins, before: round6(auc(without, gy)), with: why === null ? round6(auc(Array.from(pred), gy)) : null, bound,
      why: why || (joins ? 'with it the mesh leads beyond the noise' : 'with it the mesh does not lead beyond the noise') });
    if (!joins) continue;
    if (k < order.length - 1) for (const [train, held] of foldsOf(fitRows, folds)) { const b = a.grow(view, train, fielded); for (const i of held) col[i] = a.score(b, view, i); }
    sent.push({ name, col }); seats.push(gateRows.map((i) => col[i])); without = Array.from(pred);
  }
  return { ok: true, departments, admitted: departments.filter((d) => d.joins).map((d) => d.name) };
}
