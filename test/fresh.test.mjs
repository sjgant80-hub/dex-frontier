// fresh.test.mjs — the two datasets for the gate's retest are read one way, split one way, and refused when wrong.
// Structure only: no test here scores a held-out row, so nothing here can steer a sealed measurement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadBank, loadAdult, BANK_SILOS, ADULT_SILOS, BANK_CODES, ADULT_CODES, FRESH_SPLIT } from '../src/fresh.mjs';
import { silo } from '../src/silos.mjs';

const read = (p) => readFileSync(new URL('../data/' + p, import.meta.url), 'utf8');
const BANK = read('bank-additional-full.csv'), AD = read('adult.data'), AT = read('adult.test');
const B = loadBank(BANK), A = loadAdult(AD, AT);
const disjointCover = (ds) => { const all = [...ds.fitRows, ...ds.gateRows, ...ds.testRows]; return new Set(all).size === all.length && all.length === ds.n; };
const rate = (ds, rows) => rows.reduce((a, i) => a + ds.y[i], 0) / rows.length;
const row = (ds, i) => Object.fromEntries(ds.features.map((f) => [f, ds.cols[f][i]]));

test('the files are the ones downloaded, byte for byte, as data/fresh-sources.json records', () => {
  const src = JSON.parse(read('fresh-sources.json'));
  for (const f of src.files) assert.equal(createHash('sha256').update(readFileSync(new URL('../' + f.path, import.meta.url))).digest('hex'), f.sha256, f.path);
  assert.deepEqual(src.files.map((f) => f.licence), ['CC BY 4.0', 'CC BY 4.0', 'CC BY 4.0']);
});

test('bank: 41,188 real calls, 30 encoded features in four departments, the call’s duration left out', () => {
  assert.ok(B.ok, B.error);
  assert.equal(B.n, 41188);
  assert.deepEqual(B.features, Object.values(BANK_SILOS).flat());
  assert.deepEqual(Object.fromEntries(Object.entries(BANK_SILOS).map(([k, v]) => [k, v.length])), { profile: 15, credit: 3, campaign: 7, economy: 5 });
  assert.ok(!B.features.includes('duration') && !Object.keys(BANK_CODES).includes('duration'));
  assert.equal(B.y.reduce((a, v) => a + v, 0), 4640);
  assert.deepEqual(row(B, 0), { age: 56, 'job_admin.': 0, 'job_blue-collar': 0, job_entrepreneur: 0, job_housemaid: 1, job_management: 0, job_retired: 0, 'job_self-employed': 0, job_services: 0, job_student: 0, job_technician: 0, job_unemployed: 0, married: 1, single: 0, education: 1, default: 0, housing: 0, loan: 0, cellular: 0, month: 5, day: 1, campaign: 1, pdays: 999, previous: 0, poutcome: 0, 'emp.var.rate': 1.1, 'cons.price.idx': 93.994, 'cons.conf.idx': -36.4, euribor3m: 4.857, 'nr.employed': 5191 });
  assert.equal(B.y[0], 0);
  for (const [name, feats] of Object.entries(BANK_SILOS)) assert.deepEqual(Object.keys(silo(B, name).cols), feats);
});

test('bank encodings: every category to its number, unknowns kept as their own value, anything else refused', () => {
  const E = BANK_CODES;
  assert.equal(E['job_admin.']('admin.'), 1); assert.equal(E['job_admin.']('retired'), 0); assert.equal(E['job_admin.']('unknown'), 0); assert.ok(Number.isNaN(E['job_admin.']('astronaut')));
  assert.deepEqual(['married', 'single', 'divorced', 'unknown'].map(E.married), [1, 0, 0, 0]); assert.deepEqual(['married', 'single', 'divorced', 'unknown'].map(E.single), [0, 1, 0, 0]);
  assert.ok(Number.isNaN(E.married('engaged')) && Number.isNaN(E.single('engaged')));
  assert.deepEqual(['illiterate', 'basic.4y', 'basic.6y', 'basic.9y', 'high.school', 'professional.course', 'university.degree', 'unknown'].map(E.education), [0, 1, 2, 3, 4, 5, 6, -1]);
  for (const f of ['default', 'housing', 'loan']) assert.deepEqual(['no', 'unknown', 'yes', 'maybe'].map(E[f]).map(String), ['0', '0.5', '1', 'NaN']);
  assert.deepEqual(['cellular', 'telephone', 'fax'].map(E.cellular).map(String), ['1', '0', 'NaN']);
  assert.deepEqual(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].map(E.month), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(E.day).map(String), ['1', '2', '3', '4', '5', 'NaN']);
  assert.deepEqual(['nonexistent', 'failure', 'success', 'toString'].map(E.poutcome).map(String), ['0', '1', '2', 'NaN']);
  assert.deepEqual(['-1.8', '93.994', '5191', 'x', ''].map(E['emp.var.rate']).map(String), ['-1.8', '93.994', '5191', 'NaN', 'NaN']);
  assert.match(loadBank(BANK.replace('"housemaid"', '"astronaut"')).error, /^call 1: job_admin\. is not readable$/);
  assert.match(loadBank(BANK.replace(/"no"\r?\n/, '"perhaps"\n')).error, /^call 1: the outcome is not readable$/);
  assert.match(loadBank(BANK.replace('"euribor3m"', '"rate"')).error, /^missing columns: euribor3m$/);
  assert.match(loadBank(BANK.split(/\r?\n/)[0] + '\n1').error, /^row 1 has 1 cells, not 21$/);
  assert.match(loadBank('').error, /^no rows$/);
  assert.match(loadBank('"age"').error, /^no rows$/);
});

test('bank split: a stratified 30% test, the rest 75 / 25 fit / gate, disjoint, covering every call, the same every time', () => {
  assert.deepEqual(FRESH_SPLIT, { test: 0.3, gate: 0.25, testSeed: 2026, gateSeed: 2027 });
  assert.ok(disjointCover(B));
  assert.deepEqual([B.fitRows.length, B.gateRows.length, B.testRows.length], [21624, 7208, 12356]);
  for (const rows of [B.fitRows, B.gateRows, B.testRows]) assert.ok(Math.abs(rate(B, rows) - 4640 / 41188) < 0.002, 'stratified');
  assert.deepEqual(loadBank(BANK).testRows, B.testRows);
});

test('adult: 48,842 real people, 40 encoded features in four departments; TEST is the official test file, its "." labels read', () => {
  assert.ok(A.ok, A.error);
  assert.equal(A.n, 32561 + 16281);
  assert.deepEqual(A.features, Object.values(ADULT_SILOS).flat());
  assert.deepEqual(Object.fromEntries(Object.entries(ADULT_SILOS).map(([k, v]) => [k, v.length])), { person: 16, work: 15, employer: 7, tax: 2 });
  assert.ok(!A.features.includes('fnlwgt') && !Object.keys(ADULT_CODES).includes('fnlwgt'));
  assert.deepEqual(A.testRows, Array.from({ length: 16281 }, (_, k) => 32561 + k), 'TEST is exactly the official test file, in order');
  assert.equal(A.testRows.reduce((a, i) => a + A.y[i], 0), 3846);
  assert.equal([...A.fitRows, ...A.gateRows].reduce((a, i) => a + A.y[i], 0), 7841);
  assert.ok(disjointCover(A));
  assert.deepEqual([A.fitRows.length, A.gateRows.length], [24421, 8140]);
  for (const rows of [A.fitRows, A.gateRows]) assert.ok(Math.abs(rate(A, rows) - 7841 / 32561) < 0.002, 'stratified');
  const p = row(A, 0);
  assert.deepEqual([p.age, p.male, p.race_White, p.usBorn, p['marital_Never-married'], p['rel_Not-in-family'], p.educationYears, p.hours, p['occ_Adm-clerical'], p['work_State-gov'], p.capitalGain, p.capitalLoss], [39, 1, 1, 1, 1, 1, 13, 40, 1, 1, 2174, 0]);
  assert.equal(Object.values(p).reduce((a, v) => a + v, 0), 39 + 1 + 1 + 1 + 1 + 1 + 13 + 40 + 1 + 1 + 2174);
  assert.deepEqual([A.cols.age[32561], A.cols.educationYears[32561], A.cols.hours[32561], A.y[32561]], [25, 7, 40, 0]);
  assert.equal([...Array(A.n).keys()].filter((i) => ADULT_SILOS.employer.every((w) => A.cols[w][i] === 0)).length, 2809, 'workclass unknown, never worked or none listed');
  for (const [name, feats] of Object.entries(ADULT_SILOS)) assert.deepEqual(Object.keys(silo(A, name).cols), feats);
  assert.deepEqual(loadAdult(AD, AT).gateRows, A.gateRows);
});

test('adult encodings: every category to its number, the census’s "?" as unknown, anything else refused', () => {
  const E = ADULT_CODES;
  assert.deepEqual(['Male', 'Female', 'x'].map(E.male).map(String), ['1', '0', 'NaN']);
  assert.deepEqual(['White', 'Black', 'Other', 'Martian'].map(E.race_White).map(String), ['1', '0', '0', 'NaN']);
  assert.deepEqual(['United-States', 'Mexico', '?', ''].map(E.usBorn).map(String), ['1', '0', '0', 'NaN']);
  assert.deepEqual(['Married-civ-spouse', 'Married-AF-spouse', 'Wed'].map(E['marital_Married-civ-spouse']).map(String), ['1', '0', 'NaN']);
  assert.deepEqual(['Husband', 'Other-relative', 'Cousin'].map(E.rel_Husband).map(String), ['1', '0', 'NaN']);
  assert.deepEqual(['Sales', 'Armed-Forces', '?', 'Pirate'].map(E.occ_Sales).map(String), ['1', '0', '0', 'NaN']);
  assert.deepEqual(['Private', 'Never-worked', '?', 'Guild'].map(E.work_Private).map(String), ['1', '0', '0', 'NaN']);
  assert.deepEqual(['13', '-2', '1.5', 'x'].map(E.educationYears).map(String), ['13', '-2', 'NaN', 'NaN']);
  assert.match(loadAdult(AD.replace('State-gov', 'Guild'), AT).error, /^person 1: work_Private is not readable$/);
  assert.match(loadAdult(AD.replace(/<=50K\n/, 'rich\n'), AT).error, /^person 1: the outcome is not readable$/);
  assert.match(loadAdult(AD, AT.replace(/<=50K\.\n/, '<=50K?\n')).error, /^person 32562: the outcome is not readable$/);
  assert.match(loadAdult('1, 2\n', AT).error, /^training file: line 1 has 2 cells, not 15$/);
  assert.match(loadAdult(AD, '|comment\n1, 2\n').error, /^test file: line 1 has 2 cells, not 15$/);
  assert.match(loadAdult('', AT).error, /^no rows$/);
  assert.match(loadAdult(AD, '|only a comment\n').error, /^no rows$/);
});
