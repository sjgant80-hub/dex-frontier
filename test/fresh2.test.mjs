// fresh2.test.mjs — organ 2g's datasets are read one way, split one way, and refused when wrong; the .xls reader reads the
// publisher's file exactly. Structure only: no test here scores a held-out row, so nothing here can steer a measurement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readXls, rk } from '../tools/xls.mjs';
import { convert } from '../tools/convert-credit.mjs';
import { loadHospital, loadCredit, hospitalRows, creditRows, icdGroup, HOSPITAL_SILOS, CREDIT_SILOS, HOSPITAL_CODES, CREDIT_CODES, ENDED } from '../src/fresh2.mjs';
import { silo } from '../src/silos.mjs';

const at = (p) => new URL('../data/' + p, import.meta.url);
const CSV = readFileSync(at('diabetic_data.csv'), 'utf8'), XLS = new Uint8Array(readFileSync(at('credit-default.xls'))), CREDIT = readFileSync(at('credit-default.csv'), 'utf8');
const H = loadHospital(CSV), C = loadCredit(CREDIT);
const disjointCover = (ds) => { const all = [...ds.fitRows, ...ds.gateRows, ...ds.testRows]; return new Set(all).size === all.length && all.length === ds.n; };
const rate = (ds, rows) => rows.reduce((a, i) => a + ds.y[i], 0) / rows.length;

test('the files are the ones downloaded, byte for byte, as data/fresh2-sources.json records', () => {
  const src = JSON.parse(readFileSync(at('fresh2-sources.json'), 'utf8'));
  for (const f of src.files) assert.equal(createHash('sha256').update(readFileSync(new URL('../' + f.path, import.meta.url))).digest('hex'), f.sha256, f.path);
  assert.deepEqual(src.files.map((f) => f.licence), ['CC BY 4.0', 'CC BY 4.0', 'CC BY 4.0', 'CC BY 4.0']);
  assert.equal(convert(XLS).csv, CREDIT, 'the credit CSV is the publisher’s .xls, re-derived');
  assert.equal(convert(new Uint8Array(8)).error, 'not an OLE2 compound file');
});

test('the .xls reader: the publisher’s 30,000 clients, 25 columns each, 6,636 defaults, the first and last client exactly', () => {
  const x = readXls(XLS);
  assert.ok(x.ok, x.error);
  assert.equal(x.rows.length, 30002);
  assert.deepEqual(x.rows[1], ['ID', 'LIMIT_BAL', 'SEX', 'EDUCATION', 'MARRIAGE', 'AGE', 'PAY_0', 'PAY_2', 'PAY_3', 'PAY_4', 'PAY_5', 'PAY_6', 'BILL_AMT1', 'BILL_AMT2', 'BILL_AMT3', 'BILL_AMT4', 'BILL_AMT5', 'BILL_AMT6', 'PAY_AMT1', 'PAY_AMT2', 'PAY_AMT3', 'PAY_AMT4', 'PAY_AMT5', 'PAY_AMT6', 'default payment next month']);
  assert.deepEqual(x.rows[0].slice(1, 4), ['X1', 'X2', 'X3']);
  assert.equal(x.rows[0][0], undefined);
  assert.deepEqual(x.rows[2], [1, 20000, 2, 2, 1, 24, 2, 2, -1, -1, -2, -2, 3913, 3102, 689, 0, 0, 0, 0, 689, 0, 0, 0, 0, 1]);
  assert.deepEqual(x.rows[30001], [30000, 50000, 1, 2, 1, 46, 0, 0, 0, 0, 0, 0, 47929, 48905, 49764, 36535, 32428, 15313, 2078, 1800, 1430, 1000, 1000, 1000, 1]);
  const data = x.rows.slice(2);
  assert.ok(data.every((r, k) => r.length === 25 && r[0] === k + 1 && r.every((v) => typeof v === 'number')));
  assert.equal(data.reduce((a, r) => a + r[24], 0), 6636);
});

test('RK numbers: an integer, an integer ×100, a double’s top bits, and the same ×100', () => {
  assert.equal(rk((123 << 2) | 2), 123); assert.equal(rk((-5 << 2) | 2), -5); assert.equal(rk((12345 << 2) | 3), 123.45);
  assert.equal(rk(0x3ff00000), 1); assert.equal(rk(0x3ff00000 | 1), 0.01); assert.equal(rk(0x40240000), 10);
});

test('the .xls reader refuses what it cannot read, and never throws', () => {
  assert.equal(readXls(new Uint8Array(10)).error, 'not an OLE2 compound file');
  assert.equal(readXls('not bytes').error, 'not an OLE2 compound file');
  assert.equal(readXls(new Uint8Array(4096)).error, 'not an OLE2 compound file');
  const cut = XLS.slice(0, 2048);
  assert.equal(readXls(cut).ok, false);
  for (const f of [(b) => b.fill(0xff, 600, 700), (b) => b.fill(0, 512, 4096), (b) => b.fill(7, 0x4c, 0x200)]) { const b = XLS.slice(); f(b); assert.doesNotThrow(() => readXls(b)); assert.equal(typeof readXls(b).ok, 'boolean'); }
});

test('credit: 30,000 clients, 24 encoded features in four departments, the encodings fixed, a stratified split', () => {
  assert.ok(C.ok, C.error);
  assert.equal(C.n, 30000);
  assert.deepEqual(C.features, Object.values(CREDIT_SILOS).flat());
  assert.deepEqual(Object.fromEntries(Object.entries(CREDIT_SILOS).map(([k, v]) => [k, v.length])), { customer: 6, collections: 6, billing: 6, payments: 6 });
  assert.deepEqual(Object.fromEntries(C.features.map((f) => [f, C.cols[f][0]])), { limit: 20000, female: 1, education: 2, married: 1, single: 0, age: 24, PAY_0: 2, PAY_2: 2, PAY_3: -1, PAY_4: -1, PAY_5: -2, PAY_6: -2, BILL_AMT1: 3913, BILL_AMT2: 3102, BILL_AMT3: 689, BILL_AMT4: 0, BILL_AMT5: 0, BILL_AMT6: 0, PAY_AMT1: 0, PAY_AMT2: 689, PAY_AMT3: 0, PAY_AMT4: 0, PAY_AMT5: 0, PAY_AMT6: 0 });
  assert.equal(C.y[0], 1); assert.equal(C.y.reduce((a, v) => a + v, 0), 6636);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 1.5].map(CREDIT_CODES.education).map(String), ['0', '3', '2', '1', '0', '0', '0', 'NaN', 'NaN']);
  assert.deepEqual([0, 1, 2, 3, 4].map(CREDIT_CODES.married).map(String), ['0', '1', '0', '0', 'NaN']); assert.deepEqual([0, 1, 2, 3, 4].map(CREDIT_CODES.single).map(String), ['0', '0', '1', '0', 'NaN']);
  assert.deepEqual([1, 2, 3].map(CREDIT_CODES.female).map(String), ['0', '1', 'NaN']); assert.ok(Number.isNaN(CREDIT_CODES.limit(1.5)) && Number.isNaN(CREDIT_CODES.limit('5')));
  assert.ok(disjointCover(C)); assert.deepEqual([C.fitRows.length, C.gateRows.length, C.testRows.length], [15752, 5249, 8999]);
  for (const rows of [C.fitRows, C.gateRows, C.testRows]) assert.ok(Math.abs(rate(C, rows) - 6636 / 30000) < 0.002, 'stratified');
  for (const [name, feats] of Object.entries(CREDIT_SILOS)) assert.deepEqual(Object.keys(silo(C, name).cols), feats);
  assert.equal(creditRows('').error, 'no rows'); assert.equal(creditRows('ID').error, 'no rows');
  assert.match(creditRows(CREDIT.replace(',AGE,', ',YEARS,')).error, /^missing columns: AGE$/);
  const [head, first] = CREDIT.split('\n');
  assert.equal(creditRows(head + '\n1,2').error, 'row 1 has 2 cells, not 25');
  assert.equal(loadCredit(head + '\n' + first.replace(/^1,20000,2,/, '1,20000,3,')).error, 'client 1: female is not readable');
  assert.equal(loadCredit(head + '\n' + first.replace(/,1$/, ',2')).error, 'client 1: the outcome is not readable');
  assert.equal(loadCredit(head + '\n' + first.replace(/^1,20000,/, '1,2e4,')).error, 'client 1: limit is not readable');
});

test('hospital: one first stay per patient, deaths and hospice out, 46 encoded features in five departments', () => {
  assert.ok(H.ok, H.error);
  assert.equal(H.patients, 71518); assert.equal(H.n, 69973);
  assert.deepEqual(ENDED, [11, 13, 14, 19, 20, 21]);
  const h = hospitalRows(CSV);
  assert.ok(h.rows.every((r) => !ENDED.includes(Number(r.discharge_disposition_id))));
  assert.equal(new Set(h.rows.map((r) => r.patient_nbr)).size, h.rows.length, 'one stay a patient');
  assert.ok(h.rows.every((r, k) => k === 0 || Number(r.encounter_id) > Number(h.rows[k - 1].encounter_id)), 'in encounter order');
  const byPatient = new Map(); for (const l of CSV.split('\n').slice(1).filter(Boolean)) { const c = l.split(','); const e = Number(c[0]); if (!byPatient.has(c[1]) || e < byPatient.get(c[1])) byPatient.set(c[1], e); }
  assert.ok(h.rows.every((r) => byPatient.get(r.patient_nbr) === Number(r.encounter_id)), 'each the patient’s first stay');
  assert.deepEqual(H.features, Object.values(HOSPITAL_SILOS).flat());
  assert.deepEqual(Object.fromEntries(Object.entries(HOSPITAL_SILOS).map(([k, v]) => [k, v.length])), { admissions: 12, clinical: 15, pharmacy: 10, history: 3, discharge: 6 });
  assert.equal(H.y.reduce((a, v) => a + v, 0), 6277);
  assert.ok(disjointCover(H)); assert.deepEqual([H.fitRows.length, H.gateRows.length, H.testRows.length], [36737, 12245, 20991]);
  for (const rows of [H.fitRows, H.gateRows, H.testRows]) assert.ok(Math.abs(rate(H, rows) - 6277 / 69973) < 0.002, 'stratified');
  for (const [name, feats] of Object.entries(HOSPITAL_SILOS)) assert.deepEqual(Object.keys(silo(H, name).cols), feats);
  assert.deepEqual(loadHospital(CSV).testRows, H.testRows);
});

test('hospital encodings: every code to its number, the ICD-9 groups as Strack et al. group them, anything else refused', () => {
  const E = HOSPITAL_CODES;
  assert.deepEqual(['[0-10)', '[90-100)', '[70-80)', '70', '[a-b)'].map(E.age).map(String), ['5', '95', '75', 'NaN', 'NaN']);
  assert.deepEqual(['Female', 'Male', 'Unknown/Invalid', 'x'].map(E.female).map(String), ['1', '0', '0.5', 'NaN']);
  assert.deepEqual(['Caucasian', 'Other', '?', 'Martian'].map(E.race_Caucasian).map(String), ['1', '0', '0', 'NaN']);
  assert.deepEqual(['1', '2', '3', 'x'].map(E.adm_urgent).map(String), ['0', '1', '0', 'NaN']);
  assert.deepEqual(['7', '1', '2', '3', '4', '26', '9'].map((v) => [E.src_er(v), E.src_referral(v), E.src_transfer(v)].join('')), ['100', '010', '010', '010', '001', '001', '000']);
  assert.deepEqual(['None', 'Norm', '>200', '>300', '>100'].map(E.glucose).map(String), ['0', '1', '2', '3', 'NaN']);
  assert.deepEqual(['None', 'Norm', '>7', '>8', '>9'].map(E.a1c).map(String), ['0', '1', '2', '3', 'NaN']);
  assert.deepEqual(['No', 'Down', 'Steady', 'Up', 'Yes'].map(E.insulin).map(String), ['0', '1', '2', '3', 'NaN']);
  assert.deepEqual(['1', '6', '3', '2', '22', '7', '25'].map((v) => [E.dis_home, E.dis_home_health, E.dis_snf, E.dis_short_term, E.dis_rehab, E.dis_ama].map((f) => f(v)).join('')), ['100000', '010000', '001000', '000100', '000010', '000001', '000000']);
  assert.deepEqual(['428', '459.9', '785', '486', '786', '520', '787', '250', '250.83', '800', '999', '715', '580', '788', '140', '239', 'V57', 'E909', '?', '389', '1000', '240'].map(icdGroup), ['circulatory', 'circulatory', 'circulatory', 'respiratory', 'respiratory', 'digestive', 'digestive', 'diabetes', 'diabetes', 'injury', 'injury', 'musculoskeletal', 'genitourinary', 'genitourinary', 'neoplasms', 'neoplasms', 'other', 'other', 'other', 'other', 'other', 'other']);
  // every boundary, both sides
  assert.deepEqual(['389.99', '390', '459.99', '460', '519.99', '520', '579.99', '580', '629.99', '630', '709.99', '710', '739.99', '740', '799.99', '139.99', '785.5', '786.09', '787.91', '788.2', '250.1x'].map(icdGroup), ['other', 'circulatory', 'circulatory', 'respiratory', 'respiratory', 'digestive', 'digestive', 'genitourinary', 'genitourinary', 'other', 'other', 'musculoskeletal', 'musculoskeletal', 'other', 'other', 'other', 'circulatory', 'respiratory', 'digestive', 'genitourinary', 'other']);
  assert.deepEqual(['428', '486', '250.02', 'V57'].map((v) => ['circulatory', 'respiratory', 'diabetes'].map((g) => E['dx_' + g](v)).join('')), ['100', '010', '001', '000']);
  assert.deepEqual(['0', '12', '-1', '1.5', 'x'].map(E.number_inpatient).map(String), ['0', '12', '-1', '1.5', 'NaN']);
  const head = CSV.slice(0, CSV.indexOf('\n'));
  assert.match(loadHospital(CSV.replace('Caucasian', 'Martian')).error, /^stay \d+: race_Caucasian is not readable$/);
  const lines = CSV.split('\n'), firstStay = lines.slice(1).filter(Boolean).sort((a, b) => Number(a.split(',')[0]) - Number(b.split(',')[0]))[0];
  assert.equal(loadHospital(lines[0] + '\n' + firstStay.replace(',Caucasian,', ',Martian,')).error, 'stay 1: race_Caucasian is not readable');
  assert.match(loadHospital(head + '\n' + CSV.split('\n')[1].replace(/,NO$/, ',SOON')).error, /^stay 1: the outcome is not readable$/);
  assert.match(loadHospital(CSV.replace(',readmitted', ',back')).error, /^missing columns: readmitted$/);
  assert.match(loadHospital(head + '\n1,2').error, /^row 1 has 2 cells, not 50$/);
  assert.equal(loadHospital('').error, 'no rows');
});
