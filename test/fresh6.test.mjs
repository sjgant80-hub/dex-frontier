// fresh6.test.mjs — organ 2k's dataset: the file is the one downloaded; every student is read into its departments with
// each column in its range, or the file is refused with the reason; the split is seeded and covers every student.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dropoutRows, loadDropout, plain, DROPOUT_COLUMNS, DROPOUT_SILOS, OUTCOME, OUTCOMES } from '../src/fresh6.mjs';

const at = (p) => new URL('../data/' + p, import.meta.url);
const IDS = Object.keys(DROPOUT_COLUMNS), HEAD = [...IDS.map((id) => DROPOUT_COLUMNS[id][0]), OUTCOME];
const row = (over = {}) => HEAD.map((h) => (h in over ? over[h] : h === OUTCOME ? 'Graduate' : String(DROPOUT_COLUMNS[IDS.find((id) => DROPOUT_COLUMNS[id][0] === h)][1]))).join(';');
const csv = (...rows) => [HEAD.join(';'), ...rows].join('\n');

test('the file is the one downloaded, byte for byte, as data/fresh6-sources.json records', () => {
  const src = JSON.parse(readFileSync(at('fresh6-sources.json'), 'utf8'));
  assert.equal(src.files.length, 1);
  for (const f of src.files) { const b = readFileSync(new URL('../' + f.path, import.meta.url)); assert.equal(createHash('sha256').update(b).digest('hex'), f.sha256, f.path); assert.equal(b.length, f.bytes); }
});

test('the departments are the columns, each once, none over seven; the outcome is dropping out', () => {
  const all = Object.values(DROPOUT_SILOS).flat();
  assert.deepEqual([...all].sort(), [...IDS].sort());
  assert.equal(new Set(all).size, all.length); assert.equal(all.length, 36);
  assert.ok(Object.values(DROPOUT_SILOS).every((s) => s.length <= 7));
  assert.deepEqual(Object.keys(DROPOUT_SILOS), ['person', 'family', 'finance', 'admission', 'semester1', 'semester2', 'economy']);
  assert.deepEqual(OUTCOMES, { Dropout: 1, Enrolled: 0, Graduate: 0 });
  assert.equal(plain('﻿"Daytime/evening attendance\t"'), 'Daytime/evening attendance'); assert.equal(plain(' x '), 'x'); assert.equal(plain(7), '7');
});

test('a student is read as numbers in range; anything else refuses the file, naming the student and the column', () => {
  const ok = dropoutRows('﻿' + csv(row(), row({ [OUTCOME]: 'Dropout', 'Admission grade': '200', 'Inflation rate': '-0.8', 'GDP': '-50' }), row({ [OUTCOME]: 'Enrolled' }), ''));
  assert.equal(ok.ok, true); assert.deepEqual(ok.y, [0, 1, 0]);
  assert.equal(ok.rows[1].admissionGrade, 200); assert.equal(ok.rows[1].inflation, -0.8); assert.equal(ok.rows[1].gdp, -50); assert.equal(ok.rows[0].course, 1);
  assert.equal(Object.keys(ok.rows[0]).length, 36);
  for (const [over, re] of [[{ 'Marital status': '0' }, /Marital status is outside 1…6/], [{ 'Marital status': '7' }, /Marital status/], [{ 'Admission grade': '200.5' }, /Admission grade is outside 0…200/],
    [{ 'Curricular units 1st sem (grade)': '20.1' }, /1st sem \(grade\) is outside 0…20/], [{ 'Age at enrollment': '14' }, /Age at enrollment is outside 15…100/], [{ 'GDP': '-50.5' }, /GDP is outside/],
    [{ 'Debtor': 'yes' }, /Debtor is outside/], [{ 'Debtor': '' }, /Debtor/], [{ 'Course': '1e3' }, /Course is outside/], [{ 'Inflation rate': '50.01' }, /Inflation rate/],
    [{ [OUTCOME]: 'dropout' }, /Target is not Dropout, Enrolled or Graduate/], [{ [OUTCOME]: '' }, /Target is not/], [{ [OUTCOME]: 'hasOwnProperty' }, /Target is not/]])
    assert.match(dropoutRows(csv(row(), row(over))).error, re, JSON.stringify(over));
  assert.match(dropoutRows(csv(row(), row()) + '\n1;0').error, /student 3 has 2 cells, not 37/);
  assert.equal(dropoutRows('Target').error, 'no students'); assert.equal(dropoutRows('').error, 'no students');
  assert.match(dropoutRows(HEAD.filter((h) => h !== 'GDP').join(';') + '\n' + row()).error, /no column GDP/);
  assert.match(dropoutRows(HEAD.filter((h) => h !== OUTCOME).join(';') + '\n' + row()).error, /no column Target/);
  assert.equal(dropoutRows(csv(row()).replace(/\n/g, '\r\n')).ok, true, 'CRLF lines read the same');
  assert.equal(dropoutRows(csv(row()).replace('Daytime/evening attendance', '"Daytime/evening attendance\t"')).ok, true, 'the stray tab in the real header is read past');
  assert.equal(loadDropout('x').ok, false);
});

test('the real file: every student reads; split 30% TEST, the rest 75 / 25 FIT / GATE', () => {
  const text = readFileSync(at('fresh6/students-dropout.csv'), 'utf8'), r = dropoutRows(text);
  assert.equal(r.ok, true); assert.equal(r.rows.length, 4424); assert.equal(r.y.reduce((a, v) => a + v, 0), 1421);
  const d = loadDropout(text), d2 = loadDropout(text);
  assert.equal(d.ok, true); assert.equal(d.name, 'dropout'); assert.equal(d.all, 4424); assert.equal(d.n, 4424);
  assert.deepEqual([d.fitRows.length, d.gateRows.length, d.testRows.length], [2325, 773, 1326]);
  assert.deepEqual(d.testRows, d2.testRows, 'the split is seeded');
  assert.equal(new Set([...d.fitRows, ...d.gateRows, ...d.testRows]).size, d.n, 'the three parts are disjoint and cover every student');
  assert.deepEqual(d.features, Object.values(DROPOUT_SILOS).flat());
  for (const f of d.features) assert.equal(d.cols[f].length, d.n);
  assert.deepEqual(d.picked, Array.from({ length: 4424 }, (_, i) => i));
  const yes = d.testRows.filter((i) => d.y[i] === 1).length;
  assert.ok(yes >= 400 && d.testRows.length - yes >= 800, 'TEST holds the 400 dropouts and 800 others the frontier test draws');
});
