// src/fresh5.mjs — one more real public dataset, for organ 2j: cases none of organs 2 to 2i touched. Downloaded after
// organ 2i was judged and diagnose-7 dropped 2j as first designed (data/fresh5-sources.json). Cut into departments by what
// its columns mean, every encoding fixed here before any measurement. Pure and total: a bad file is refused with its
// reason, never thrown.
//   · health — CDC Diabetes Health Indicators (UCI id 891; the CDC's 2015 BRFSS survey; CC0): 253,680 answers; the outcome
//     is Diabetes_binary (diabetes or prediabetes = 1). A stratified seeded sample of about 60,000, drawn before the split,
//     as the hotel bookings were. Departments: conditions (blood pressure, cholesterol and its check, BMI, stroke, heart
//     disease) / habits (smoking, exercise, fruit, vegetables, heavy drinking) / access (any health cover, a doctor not
//     seen for cost) / wellbeing (general, mental and physical health, difficulty walking) / person (sex, age band,
//     education, income band). The row ID is not used. Every cell is a whole number in the survey's own range; one
//     outside it is refused.
// No department holds more than 6 columns, so each can take up to ten other departments' scores within a genome's 16.
// Split as the other fresh datasets: a stratified 30% TEST, the rest 75 / 25 FIT / GATE.
import { splitRows } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { FRESH_SPLIT } from './fresh.mjs';

/** each column used, its range in the survey's codebook (inclusive) */
export const HEALTH_RANGES = {
  HighBP: [0, 1], HighChol: [0, 1], CholCheck: [0, 1], BMI: [12, 98], Stroke: [0, 1], HeartDiseaseorAttack: [0, 1],
  Smoker: [0, 1], PhysActivity: [0, 1], Fruits: [0, 1], Veggies: [0, 1], HvyAlcoholConsump: [0, 1],
  AnyHealthcare: [0, 1], NoDocbcCost: [0, 1],
  GenHlth: [1, 5], MentHlth: [0, 30], PhysHlth: [0, 30], DiffWalk: [0, 1],
  Sex: [0, 1], Age: [1, 13], Education: [1, 6], Income: [1, 8],
};
export const HEALTH_SILOS = {
  conditions: ['HighBP', 'HighChol', 'CholCheck', 'BMI', 'Stroke', 'HeartDiseaseorAttack'],
  habits: ['Smoker', 'PhysActivity', 'Fruits', 'Veggies', 'HvyAlcoholConsump'],
  access: ['AnyHealthcare', 'NoDocbcCost'],
  wellbeing: ['GenHlth', 'MentHlth', 'PhysHlth', 'DiffWalk'],
  person: ['Sex', 'Age', 'Education', 'Income'],
};
export const OUTCOME = 'Diabetes_binary';
export const HEALTH_SAMPLE = { share: 60000 / 253680, seed: 2031 };

const whole = (v) => (typeof v === 'string' && /^\d+(\.0+)?$/.test(v.trim()) ? Number(v.trim()) : NaN);

/** the answers as rows of numbers: { ok, rows: [{ column: value }], y } or { ok: false, error } */
export function healthRows(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { ok: false, error: 'no answers' };
  const head = lines[0].split(',').map((h) => h.trim());
  const at = Object.fromEntries(head.map((h, i) => [h, i]));
  for (const c of [OUTCOME, ...Object.keys(HEALTH_RANGES)]) if (!(c in at)) return { ok: false, error: 'no column ' + c };
  const rows = [], y = [];
  for (let k = 1; k < lines.length; k++) {
    const cells = lines[k].split(',');
    if (cells.length !== head.length) return { ok: false, error: 'answer ' + k + ' has ' + cells.length + ' cells, not ' + head.length };
    const out = whole(cells[at[OUTCOME]]);
    if (out !== 0 && out !== 1) return { ok: false, error: 'answer ' + k + ': ' + OUTCOME + ' is not 0 or 1' };
    const row = {};
    for (const [c, [lo, hi]] of Object.entries(HEALTH_RANGES)) {
      const v = whole(cells[at[c]]);
      if (!(v >= lo && v <= hi)) return { ok: false, error: 'answer ' + k + ': ' + c + ' is outside ' + lo + '…' + hi };
      row[c] = v;
    }
    rows.push(row); y.push(out);
  }
  return { ok: true, rows, y };
}

/** the sample first (stratified, seeded, from every answer), then the split */
export function loadHealth(text) {
  const r = healthRows(text);
  if (!r.ok) return r;
  const keep = splitRows({ y: Uint8Array.from(r.y) }, r.y.map((_, i) => i), HEALTH_SAMPLE.share, HEALTH_SAMPLE.seed).held.sort((a, b) => a - b);
  const features = Object.values(HEALTH_SILOS).flat(), n = keep.length;
  const cols = Object.fromEntries(features.map((f) => [f, Float64Array.from(keep, (i) => r.rows[i][f])]));
  const ds = { name: 'health', title: 'Health survey answers', outcome: 'diabetes or prediabetes', features, n, cols, y: Uint8Array.from(keep, (i) => r.y[i]), silos: HEALTH_SILOS, all: r.y.length, picked: keep };
  const all = Array.from({ length: n }, (_, i) => i), t = splitRows({ y: ds.y }, all, FRESH_SPLIT.test, FRESH_SPLIT.testSeed), g = splitRows(ds, t.rest, FRESH_SPLIT.gate, FRESH_SPLIT.gateSeed);
  return { ok: true, ...ds, fitRows: g.rest, gateRows: g.held, testRows: t.held };
}
