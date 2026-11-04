// src/meshcase.mjs — the cost case for ONE question answered across several departments' records (churn, dropout, a
// referral, a fault), for the "For your business" brochure: what the question costs a team in staff time today, what the
// rented routes add, and what the mesh costs to run on the departments' own machines. Every external figure is read from
// the vendored, sourced basis (vendor/sovereign-enterprise/data/basis.json, byte for byte sovereign-enterprise's
// data/basis.json); the hours, the share, the counts and the tokens are the reader's own. Floors, never top ends: staff
// time at the UK median wage with on-costs left out; CPI applied to every later year; the mesh's own cost is priced high
// (every department's machine drawing its extra power all day, every day). Like for like: the two cloud routes take the
// SAME share of the work off as the mesh (organs 2j and 2k measured the mesh level with a frontier model on fresh cases),
// so they differ only in the per-call bill and in where each case's records go; rented assistant seats help each person
// but take no work off, so the staff time stays. No price of ours appears here: these are the buyer's costs.
// Pure, total, deterministic (CPI by repeated multiplication): garbage in gives { ok: false, why }, never a throw.

export const DEFAULTS = Object.freeze({ hoursPerWeek: 20, share: 0.5, departments: 3, seats: 5, casesPerWeek: 500, tokensIn: 1000, tokensOut: 50, years: 3 });
export const BASIS_KEYS = Object.freeze(['wageMedianHourly', 'cpi', 'electricityPencePerKwh', 'laptopExtraWatts', 'hoursPerYear', 'seat.copilot', 'frontier', 'bedrockGptOss120b', 'fxGbpPerUsd']);

const isNum = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const r2 = (x) => Math.round(x * 100) / 100;

/** the basis entries the case reads, each a sourced number; null when one is missing or unreadable */
function figures(basis) {
  const b = basis || {}, f = (k) => b[k] || {};
  const out = {
    wage: f('wageMedianHourly').value, cpi: f('cpi').value, pence: f('electricityPencePerKwh').value, watts: f('laptopExtraWatts').value,
    hours: f('hoursPerYear').value, seat: f('seat.copilot').value, apiIn: f('frontier').inPerM, apiOut: f('frontier').outPerM,
    openIn: f('bedrockGptOss120b').inPerM, openOut: f('bedrockGptOss120b').outPerM, fx: f('fxGbpPerUsd').value,
  };
  return Object.values(out).every(isNum) ? out : null;
}

/** where each figure came from, for the page to list beside the numbers */
export function sourcesOf(basis) {
  try { return BASIS_KEYS.map((k) => ({ key: k, what: basis[k].what || basis[k].product, source: basis[k].source })); } catch { return []; }
}

/** a yearly cost carried over `years`, rising by CPI each year after the first */
export function over(perYear, cpi, years) {
  let total = 0, factor = 1;
  for (let y = 0; y < years; y++) { total += perYear * factor; factor *= 1 + cpi; }
  return r2(total);
}

/** a model called once per case: cases a week, tokens in and out per case, its USD prices per million, in GBP a year */
const perCall = (i, inPerM, outPerM, fx) => r2(i.casesPerWeek * 52 * (i.tokensIn * inPerM + i.tokensOut * outPerM) / 1e6 * fx);

/**
 * the case. input (all optional, defaults above): hoursPerWeek, share (0 to 1), departments (1 to 100), seats,
 * casesPerWeek, tokensIn, tokensOut, years (1 to 10)
 */
export function meshCase(basis, input) {
  try {
    const f = figures(basis);
    if (!f) return { ok: false, why: 'a sourced basis with every figure the case reads' };
    const i = { ...DEFAULTS, ...(input || {}) };
    if (!isNum(i.hoursPerWeek) || i.hoursPerWeek > 168) return { ok: false, why: 'hours a week: 0 to 168' };
    if (!isNum(i.share) || i.share > 1) return { ok: false, why: 'the share of the work taken off: 0 to 1' };
    if (!Number.isInteger(i.departments) || i.departments < 1 || i.departments > 100) return { ok: false, why: 'departments: a whole number, 1 to 100' };
    if (!Number.isInteger(i.seats) || i.seats < 0) return { ok: false, why: 'seats: a whole number' };
    if (!isNum(i.casesPerWeek) || !isNum(i.tokensIn) || !isNum(i.tokensOut)) return { ok: false, why: 'cases and tokens: numbers' };
    if (!Number.isInteger(i.years) || i.years < 1 || i.years > 10) return { ok: false, why: 'years: 1 to 10' };
    const staff = r2(i.hoursPerWeek * 52 * f.wage);                                   // the question, in staff time, a year
    const takenOff = r2(staff * i.share);                                             // the share the mesh (or a cloud model) does
    const seats = r2(i.seats * 12 * f.seat);                                          // rented assistants: help, take nothing off
    const frontier = perCall(i, f.apiIn, f.apiOut, f.fx);                             // a hosted frontier model on every case
    const open = perCall(i, f.openIn, f.openOut, f.fx);                               // a hosted open model, in London, on every case
    const power = r2(i.departments * f.watts * f.hours / 1000 * f.pence / 100);       // the mesh: each department's extra draw, always on
    const perYear = { today: staff, rentSeats: r2(staff + seats), cloudFrontier: r2(staff - takenOff + frontier), cloudOpen: r2(staff - takenOff + open), mesh: r2(staff - takenOff + power) };
    const total = Object.fromEntries(Object.entries(perYear).map(([k, v]) => [k, over(v, f.cpi, i.years)]));
    return {
      ok: true, inputs: i, lines: { staff, takenOff, seats, frontier, open, power }, perYear, over: total,
      savingPerYear: r2(perYear.today - perYear.mesh), savingOver: r2(total.today - total.mesh),
      versusFrontierOver: r2(total.cloudFrontier - total.mesh), versusOpenOver: r2(total.cloudOpen - total.mesh),
    };
  } catch { return { ok: false, why: 'the inputs could not be read' }; }
}

export default { DEFAULTS, BASIS_KEYS, sourcesOf, over, meshCase };
