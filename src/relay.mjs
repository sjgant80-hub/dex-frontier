// src/relay.mjs — the relay: departments grow in turn, strongest first, each on its own columns AND the scores the
// stronger departments send it, so a pattern that needs one department's columns crossed with another's can be learned
// while still nothing but a score crosses. A genome reads at most a fixed number of columns, so a department takes the
// sent scores that fit beside its own, strongest sender first, and says how many it took. A score sent for a FIT case
// comes from a body that never grew on that case (cross-fitted, k folds by position); for every other case (GATE, TEST),
// from the body grown on all of FIT, scored in the same order a live relay would answer. The bodies, how a department
// fields one and how it scores are passed in, so the relay is the same for any body. Pure and total: wrong arguments
// are refused with the reason, never thrown.

/** how many sent scores fit beside `own` columns when a body reads at most `max` */
export const room = (own, max) => (Number.isInteger(own) && Number.isInteger(max) && own >= 0 ? Math.max(0, max - own) : 0);

/** names ordered strongest first by score (a tie keeps alphabetical order); a name with no finite score goes last */
export function strongestFirst(scores) {
  const v = (s) => (Number.isFinite(scores[s]) ? scores[s] : -Infinity);
  return Object.keys(scores || {}).sort().sort((a, b) => v(b) - v(a));   // alphabetical first; the sort by score is stable, so a tie keeps it
}

/** rows split into k folds by position: [train, held] for each fold */
export function foldsOf(rows, k) {
  if (!Array.isArray(rows) || !Number.isInteger(k) || k < 2) return [];
  return Array.from({ length: k }, (_, f) => [rows.filter((_, j) => j % k !== f), rows.filter((_, j) => j % k === f)]);
}

/** a department's view with the sent scores that fit: its own columns first, then the strongest senders' scores */
export function withSent(view, sent, max) {
  if (!view || !Array.isArray(view.features)) return { view, took: [] };
  const took = (Array.isArray(sent) ? sent : []).filter((x) => x && typeof x.name === 'string').slice(0, room(view.features.length, max));
  return { view: { ...view, features: [...view.features, ...took.map((s) => 'sent_' + s.name)], cols: { ...view.cols, ...Object.fromEntries(took.map((s) => ['sent_' + s.name, s.col])) } }, took: took.map((s) => s.name) };
}

/**
 * relay({ order, viewOf, field, grow, score, fitRows, otherRows, n, folds, max })
 *   order      department names, strongest first
 *   viewOf     name → its own view { features, cols, y }
 *   field      view → { body, ... }: grows on FIT and fields one body (the caller's rule)
 *   grow       (view, rows, fielded) → a body of the fielded kind grown on rows
 *   score      (body, view, i) → a number
 *   fitRows    the rows bodies grow on; otherRows every row scored by the full body (GATE and TEST)
 * → { ok, departments: [{ name, took, view, fielded, col }] } — col holds a score for every FIT row (cross-fitted; not for
 *   the last department, which sends to no one) and every other row
 */
export function relay(args) {
  const { order, viewOf, field, grow, score, fitRows, otherRows, n, folds = 4, max = 16 } = args && typeof args === 'object' ? args : {};
  if (!Array.isArray(order) || !order.length || ![viewOf, field, grow, score].every((f) => typeof f === 'function') || !Array.isArray(fitRows) || !Array.isArray(otherRows) || !Number.isInteger(n) || n < 1) return { ok: false, error: 'a relay needs an order, its four functions, the rows and n' };
  if (!foldsOf(fitRows, folds).length) return { ok: false, error: 'folds must be a whole number of at least 2' };
  const sent = [], departments = [];
  for (const [k, name] of order.entries()) {
    const own = viewOf(name);
    if (!own || !Array.isArray(own.features)) return { ok: false, error: 'no view for ' + name };
    const { view, took } = withSent(own, sent, max), fielded = field(view), col = new Float64Array(n);
    if (k < order.length - 1) for (const [train, held] of foldsOf(fitRows, folds)) { const b = grow(view, train, fielded); for (const i of held) col[i] = score(b, view, i); }
    for (const i of otherRows) col[i] = score(fielded.body, view, i);
    sent.push({ name, col });
    departments.push({ name, took, view, fielded, col });
  }
  return { ok: true, departments };
}
