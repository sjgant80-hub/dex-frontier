// src/join.mjs — the join rule a growing mesh keeps. Organ 2i's mesh grew by every department the relay sent it, and on
// the news articles the sixth lowered it: growth that can fall is not the growth the spec asks for. Here a department
// enters the mesh only if the mesh's out-of-fold score on GATE, coupled with it, is at least the score without it — the
// score never falls as the mesh grows, on the cases the mesh may learn from. Whether that carries to TEST is what a seal
// predicts; this kernel only keeps the rule. Departments are offered in the order given (the relay's, strongest first);
// a department kept out still sent its score down the relay — only its seat in the coupling is refused. The out-of-fold
// scorer is passed in, so the rule is the same for any coupling. Pure and total: wrong arguments are refused with the
// reason, never thrown; a scorer that throws or gives no number refuses that department, said in its step.

/** the floor a first department must reach: a coin */
export const COIN = 0.5;

const isSeq = (x) => Array.isArray(x) || (ArrayBuffer.isView(x) && !(x instanceof DataView));

/** admit(columns, y, oofOf, { floor }) → { admitted, steps, oof } — columns in the order offered, one score per case each;
 *  oofOf(columnsInTheMesh, y) → the mesh's out-of-fold score on those cases. A department joins if, with it, that score is
 *  at least the best so far (at first, the floor). */
export function admit(columns, y, oofOf, opts = {}) {
  if (!Array.isArray(columns) || !isSeq(y)) return { error: 'columns must be an array of score columns, y the outcomes' };
  if (typeof oofOf !== 'function') return { error: 'oofOf must be a function: (columns, y) → an out-of-fold score' };
  if (columns.some((c) => !isSeq(c) || c.length !== y.length)) return { error: 'every column must hold one score per case (' + y.length + ')' };
  const floor = opts && Number.isFinite(opts.floor) ? opts.floor : COIN;
  const admitted = [], steps = [];
  let best = floor;
  for (let k = 0; k < columns.length; k++) {
    let oof, why = null;
    try { oof = oofOf([...admitted, k].map((j) => columns[j]), y); } catch (e) { why = 'the scorer failed: ' + String((e && e.message) || e); }
    if (why === null && !Number.isFinite(oof)) why = 'the scorer gave no number';
    const joins = why === null && oof >= best;
    steps.push({ k, before: best, oof: why === null ? oof : null, joins, why: why || (joins ? 'with it the mesh scores at least as well' : 'with it the mesh would score lower') });
    if (joins) { admitted.push(k); best = oof; }
  }
  return { admitted, steps, oof: best };
}

/** the columns a mesh keeps, in the order offered */
export const kept = (columns, result) => (result && Array.isArray(result.admitted) ? result.admitted.map((k) => columns[k]) : []);
