#!/usr/bin/env node
// tools/contest-2g.mjs — organ 2g's frontier rival, defined once and pinned by its seal. Organ 2f asked 300 cases a domain,
// too few for its own 0.02 bar (its noise band was about ±0.025). Here: 1,200 TEST cases a domain (400 that ended in the
// outcome, 800 that did not, seeded), asked in four batches of 300, each batch a fresh cold subagent (Claude Opus 5.5)
// that sees only its prompt: the fields explained, the same 24 FIT cases, then its 300 cases. Each case is shown in the
// dataset's own words (admission and discharge in the codebook's words, the diagnosis as its ICD-9 code): every field the
// departments hold between them, in the form a reader understands best — an advantage the frontier model is given.
//   node tools/contest-2g.mjs prompt <hospital|credit> <1-4>          → data/llm/frontier-<domain>-<batch>.prompt.txt
//   node tools/contest-2g.mjs record <hospital|credit> <1-4> <reply>  → data/llm/frontier-<domain>-<batch>.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { loadHospital, hospitalRows, loadCredit, creditRows } from '../src/fresh2.mjs';
import { FRONTIER, parseProbability } from './contest.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const DOMAINS = ['hospital', 'credit'], BATCH = 300, CASES = { yes: 400, no: 800 };
export const SEEDS = { hospital: [3501, 3502, 3503], credit: [3601, 3602, 3603] };
export const SHOTS = { hospital: [81, 82, 83], credit: [91, 92, 93] };

/** the hospital codebook (data/IDS_mapping.csv): what each admission type, admission source and discharge code means */
export function codebook(text) {
  const out = {}; let table = null;
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^([a-z_]+_id),description$/.exec(line);
    if (m) { table = m[1]; out[table] = {}; continue; }
    const c = /^(\d+),"?(.*?)"?$/.exec(line);
    if (table && c) out[table][c[1]] = c[2].trim();
  }
  return out;
}

const months = ['September', 'August', 'July', 'June', 'May', 'April'];
export const TEXT = {
  hospital: {
    head: 'You are predicting whether a diabetic patient is readmitted to hospital within 30 days of being discharged. The data are real hospital stays from 130 US hospitals, 1999 to 2008 (the UCI Diabetes 130-US Hospitals dataset), one stay per patient. Each stay is described by:',
    yes: 'readmitted within 30 days', no: 'not readmitted within 30 days', fields: {
      age: 'age band in years', gender: 'gender', race: 'race ("?" = not recorded)', admission_type: 'type of admission', admission_source: 'where the patient was admitted from',
      time_in_hospital: 'days in hospital', num_lab_procedures: 'lab tests during the stay', num_procedures: 'procedures (other than lab tests)', num_medications: 'distinct medications given', number_diagnoses: 'diagnoses recorded',
      max_glu_serum: 'glucose serum test result', A1Cresult: 'HbA1c test result', diag_1: 'primary diagnosis (ICD-9 code)',
      insulin: 'insulin (No / Steady / Up / Down: dose changed during the stay)', metformin: 'metformin (same scale)', glipizide: 'glipizide (same scale)', glyburide: 'glyburide (same scale)', glimepiride: 'glimepiride (same scale)', pioglitazone: 'pioglitazone (same scale)', rosiglitazone: 'rosiglitazone (same scale)', repaglinide: 'repaglinide (same scale)',
      change: 'diabetes medication changed (Ch) or not (No)', diabetesMed: 'any diabetes medication prescribed', number_outpatient: 'outpatient visits in the year before', number_emergency: 'emergency visits in the year before', number_inpatient: 'inpatient stays in the year before', discharge: 'where the patient was discharged to',
    },
  },
  credit: {
    head: 'You are predicting whether a credit-card holder defaults on next month’s payment. The data are real card holders of one bank in Taiwan, 2005 (the UCI Default of Credit Card Clients dataset). Each client is described by:',
    yes: 'defaulted', no: 'did not default', fields: {
      LIMIT_BAL: 'credit limit (New Taiwan dollars)', SEX: '1 = male, 2 = female', EDUCATION: '1 = graduate school, 2 = university, 3 = high school, 4 = other, 0, 5 and 6 = not known', MARRIAGE: '1 = married, 2 = single, 3 = other, 0 = not known', AGE: 'age in years',
      ...Object.fromEntries(['PAY_0', 'PAY_2', 'PAY_3', 'PAY_4', 'PAY_5', 'PAY_6'].map((f, k) => [f, 'repayment status in ' + months[k] + ' 2005 (−1 = paid duly; 1 to 9 = that many months late; −2 and 0 as the bank recorded them)'])),
      ...Object.fromEntries(months.map((m, k) => ['BILL_AMT' + (k + 1), 'bill statement for ' + m + ' 2005 (dollars)'])),
      ...Object.fromEntries(months.map((m, k) => ['PAY_AMT' + (k + 1), 'amount paid in ' + m + ' 2005 (dollars)'])),
    },
  },
};

/** the domain loaded, with each row's raw fields in the dataset's own words (row i is the loader's row i) */
export function load(domain) {
  if (domain === 'hospital') {
    const csv = read('data/diabetic_data.csv'), book = codebook(read('data/IDS_mapping.csv')), rows = hospitalRows(csv).rows;
    const raw = rows.map((r) => ({ ...r, admission_type: book.admission_type_id[r.admission_type_id] || r.admission_type_id, admission_source: book.admission_source_id[r.admission_source_id] || r.admission_source_id, discharge: book.discharge_disposition_id[r.discharge_disposition_id] || r.discharge_disposition_id }));
    return { ds: loadHospital(csv), raw };
  }
  const csv = read('data/credit-default.csv');
  return { ds: loadCredit(csv), raw: creditRows(csv).rows };
}

function draw(rows, k, seed) {
  const r = rng(seed), xs = rows.slice();
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs.slice(0, k);
}

/** the 1,200 TEST cases the frontier model is graded on, in one seeded order; batch b is cases 300b+1 … 300b+300 */
export function sampleOf(ds) {
  const [a, b, c] = SEEDS[ds.name], yes = ds.testRows.filter((i) => ds.y[i] === 1), no = ds.testRows.filter((i) => ds.y[i] === 0);
  return draw([...draw(yes, CASES.yes, a), ...draw(no, CASES.no, b)], CASES.yes + CASES.no, c);
}
export const batchOf = (ds, b) => sampleOf(ds).slice(b * BATCH, (b + 1) * BATCH);

/** the 24 FIT cases shown first in every batch: 12 with the outcome, 12 without, in a seeded order */
export function examplesOf(ds) {
  const [a, b, c] = SHOTS[ds.name], yes = ds.fitRows.filter((i) => ds.y[i] === 1), no = ds.fitRows.filter((i) => ds.y[i] === 0);
  return draw([...draw(yes, 12, a), ...draw(no, 12, b)], 24, c);
}

export const caseLine = (name, row) => Object.keys(TEXT[name].fields).map((f) => f + '=' + row[f]).join(', ');

/** batch b's prompt: the fields explained, the 24 examples, then its 300 cases numbered 1 … 300 */
export function batchPrompt(ds, raw, b) {
  const t = TEXT[ds.name];
  return t.head + '\n' + Object.entries(t.fields).map(([f, d]) => '- ' + f + ': ' + d).join('\n') + '\n\nHere are 24 past cases and what happened:\n'
    + examplesOf(ds).map((i) => caseLine(ds.name, raw[i]) + ' -> ' + (ds.y[i] ? t.yes : t.no)).join('\n') + '\n\nNow 300 new cases. For each, give the probability from 0 to 100 that the answer is ' + t.yes + '.\n'
    + batchOf(ds, b).map((i, k) => (k + 1) + '. ' + caseLine(ds.name, raw[i])).join('\n')
    + '\n\nAnswer from this text alone: use no tools and read no files. Reply with exactly 300 lines and nothing else, one per case in order, each "<case number>: <probability>".';
}

/** read a batch's reply: line "n: p" for every case n; a missing or unreadable one is null (scored as a coin) */
export function readReply(ds, reply, b) {
  const got = new Map();
  for (const line of String(reply).split(/\r?\n/)) { const m = /^\s*(\d+)\s*[:.)-]\s*(.+)$/.exec(line); if (m) got.set(Number(m[1]), parseProbability(m[2])); }
  return batchOf(ds, b).map((row, k) => ({ row, p: got.has(k + 1) ? got.get(k + 1) : null }));
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/contest-2g.mjs');
if (isMain) {
  const [what, domain, batch, file] = process.argv.slice(2), b = Number(batch) - 1;
  if (!['prompt', 'record'].includes(what) || !DOMAINS.includes(domain) || !(b >= 0 && b < 4)) { console.log('usage: node tools/contest-2g.mjs <prompt|record> <hospital|credit> <1-4> [reply file]'); process.exit(2); }
  const { ds, raw } = load(domain), prompt = batchPrompt(ds, raw, b), name = 'data/llm/frontier-' + domain + '-' + (b + 1);
  mkdirSync(new URL('data/llm/', ROOT), { recursive: true });
  if (what === 'prompt') { writeFileSync(new URL(name + '.prompt.txt', ROOT), prompt + '\n'); console.log('wrote ' + name + '.prompt.txt · ' + prompt.length + ' chars · ' + sha256Hex(prompt).slice(0, 16)); }
  else {
    const reply = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), calls = readReply(ds, reply, b);
    writeFileSync(new URL(name + '.json', ROOT), JSON.stringify({ kind: 'dex-frontier.frontier-answers', v: 1, domain, batch: b + 1, model: { name: FRONTIER, asked: 'a fresh Claude Code subagent, cold: this prompt only, no tools' }, prompt: sha256Hex(prompt).slice(0, 16), reply, calls }, null, 1) + '\n');
    console.log('recorded ' + calls.filter((c) => c.p !== null).length + ' of 300 readable answers');
  }
}
