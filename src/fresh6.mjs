// src/fresh6.mjs — one more real public dataset, for organ 2k: cases none of organs 2 to 2j touched, on which organ 2j's
// mechanism is taken again unchanged. Downloaded after organ 2j was judged (data/fresh6-sources.json). Cut into departments
// by the dataset authors' own grouping of its columns (demographic, socio-economic, macro-economic, academic at enrolment
// and at the end of each of the first two semesters), every encoding fixed here before any measurement. Pure and total:
// a bad file is refused with its reason, never thrown.
//   · dropout — Predict Students' Dropout and Academic Success (UCI id 697; CC BY 4.0): 4,424 students of a Portuguese
//     higher-education institution; the outcome is dropping out (Target "Dropout" = 1; "Enrolled" and "Graduate" = 0).
//     The file has a byte-order mark, semicolons and CRLF; one header holds a stray tab inside quotes. A code (course,
//     application mode, nationality, a parent's qualification or occupation) is a number here, as the file holds it; its
//     meaning is UCI's variable table (data/fresh6-codebook.json). Every cell is a number in its column's range; one
//     outside it is refused.
// No department holds more than 7 columns, so each can take up to nine other departments' scores within a genome's 16.
// Split as the other fresh datasets: a stratified 30% TEST, the rest 75 / 25 FIT / GATE. Every student is used.
import { splitRows } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { FRESH_SPLIT } from './fresh.mjs';

/** each column used: its header in the file, and its range (inclusive) */
export const DROPOUT_COLUMNS = {
  maritalStatus: ['Marital status', 1, 6], applicationMode: ['Application mode', 1, 57], applicationOrder: ['Application order', 0, 9], course: ['Course', 1, 9999],
  daytime: ['Daytime/evening attendance', 0, 1], previousQualification: ['Previous qualification', 1, 43], previousGrade: ['Previous qualification (grade)', 0, 200],
  nationality: ['Nacionality', 1, 109], motherQualification: ["Mother's qualification", 1, 44], fatherQualification: ["Father's qualification", 1, 44],
  motherOccupation: ["Mother's occupation", 0, 194], fatherOccupation: ["Father's occupation", 0, 195], admissionGrade: ['Admission grade', 0, 200],
  displaced: ['Displaced', 0, 1], specialNeeds: ['Educational special needs', 0, 1], debtor: ['Debtor', 0, 1], feesUpToDate: ['Tuition fees up to date', 0, 1],
  gender: ['Gender', 0, 1], scholarship: ['Scholarship holder', 0, 1], ageAtEnrollment: ['Age at enrollment', 15, 100], international: ['International', 0, 1],
  sem1Credited: ['Curricular units 1st sem (credited)', 0, 100], sem1Enrolled: ['Curricular units 1st sem (enrolled)', 0, 100], sem1Evaluations: ['Curricular units 1st sem (evaluations)', 0, 100],
  sem1Approved: ['Curricular units 1st sem (approved)', 0, 100], sem1Grade: ['Curricular units 1st sem (grade)', 0, 20], sem1WithoutEvaluations: ['Curricular units 1st sem (without evaluations)', 0, 100],
  sem2Credited: ['Curricular units 2nd sem (credited)', 0, 100], sem2Enrolled: ['Curricular units 2nd sem (enrolled)', 0, 100], sem2Evaluations: ['Curricular units 2nd sem (evaluations)', 0, 100],
  sem2Approved: ['Curricular units 2nd sem (approved)', 0, 100], sem2Grade: ['Curricular units 2nd sem (grade)', 0, 20], sem2WithoutEvaluations: ['Curricular units 2nd sem (without evaluations)', 0, 100],
  unemployment: ['Unemployment rate', 0, 100], inflation: ['Inflation rate', -50, 50], gdp: ['GDP', -50, 50],
};
export const DROPOUT_SILOS = {
  person: ['maritalStatus', 'nationality', 'displaced', 'specialNeeds', 'gender', 'ageAtEnrollment', 'international'],
  family: ['motherQualification', 'fatherQualification', 'motherOccupation', 'fatherOccupation'],
  finance: ['debtor', 'feesUpToDate', 'scholarship'],
  admission: ['applicationMode', 'applicationOrder', 'course', 'daytime', 'previousQualification', 'previousGrade', 'admissionGrade'],
  semester1: ['sem1Credited', 'sem1Enrolled', 'sem1Evaluations', 'sem1Approved', 'sem1Grade', 'sem1WithoutEvaluations'],
  semester2: ['sem2Credited', 'sem2Enrolled', 'sem2Evaluations', 'sem2Approved', 'sem2Grade', 'sem2WithoutEvaluations'],
  economy: ['unemployment', 'inflation', 'gdp'],
};
export const OUTCOME = 'Target', OUTCOMES = { Dropout: 1, Enrolled: 0, Graduate: 0 };

/** a header as the file writes it, read plainly: no byte-order mark, no quotes, no surrounding space or tab */
export const plain = (h) => String(h).replace(/^﻿/, '').replace(/^"|"$/g, '').trim();
const number = (v) => (typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v) ? Number(v) : NaN);

/** the students as rows of numbers: { ok, rows: [{ column: value }], y } or { ok: false, error } */
export function dropoutRows(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { ok: false, error: 'no students' };
  const head = lines[0].split(';').map(plain), at = Object.fromEntries(head.map((h, i) => [h, i]));
  for (const h of [OUTCOME, ...Object.values(DROPOUT_COLUMNS).map(([name]) => name)]) if (!(h in at)) return { ok: false, error: 'no column ' + h };
  const rows = [], y = [];
  for (let k = 1; k < lines.length; k++) {
    const cells = lines[k].split(';');
    if (cells.length !== head.length) return { ok: false, error: 'student ' + k + ' has ' + cells.length + ' cells, not ' + head.length };
    const out = plain(cells[at[OUTCOME]]);
    if (!Object.hasOwn(OUTCOMES, out)) return { ok: false, error: 'student ' + k + ': ' + OUTCOME + ' is not Dropout, Enrolled or Graduate' };
    const row = {};
    for (const [id, [name, lo, hi]] of Object.entries(DROPOUT_COLUMNS)) {
      const v = number(cells[at[name]]);
      if (!(v >= lo && v <= hi)) return { ok: false, error: 'student ' + k + ': ' + name + ' is outside ' + lo + '…' + hi };
      row[id] = v;
    }
    rows.push(row); y.push(OUTCOMES[out]);
  }
  return { ok: true, rows, y };
}

/** every student, then the split */
export function loadDropout(text) {
  const r = dropoutRows(text);
  if (!r.ok) return r;
  const features = Object.values(DROPOUT_SILOS).flat(), n = r.rows.length;
  const cols = Object.fromEntries(features.map((f) => [f, Float64Array.from(r.rows, (row) => row[f])]));
  const ds = { name: 'dropout', title: 'Students', outcome: 'dropped out', features, n, cols, y: Uint8Array.from(r.y), silos: DROPOUT_SILOS, all: n, picked: r.rows.map((_, i) => i) };
  const all = Array.from({ length: n }, (_, i) => i), t = splitRows({ y: ds.y }, all, FRESH_SPLIT.test, FRESH_SPLIT.testSeed), g = splitRows(ds, t.rest, FRESH_SPLIT.gate, FRESH_SPLIT.gateSeed);
  return { ok: true, ...ds, fitRows: g.rest, gateRows: g.held, testRows: t.held };
}
