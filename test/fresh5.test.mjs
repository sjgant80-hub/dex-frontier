// fresh5.test.mjs — organ 2j's dataset: the file is the one downloaded; every answer is read into its departments with
// each column in the survey's own range, or the file is refused with the reason; the sample and the split are seeded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { healthRows, loadHealth, HEALTH_RANGES, HEALTH_SILOS, HEALTH_SAMPLE, OUTCOME } from '../src/fresh5.mjs';

const at = (p) => new URL('../data/' + p, import.meta.url);
const HEAD = ['ID', OUTCOME, ...Object.keys(HEALTH_RANGES)];
const row = (over = {}) => HEAD.map((h) => (h in over ? over[h] : h === 'ID' ? '0' : h === OUTCOME ? '0' : String(HEALTH_RANGES[h][0]))).join(',');
const csv = (...rows) => [HEAD.join(','), ...rows].join('\n');

test('the file is the one downloaded, byte for byte, as data/fresh5-sources.json records', () => {
  const src = JSON.parse(readFileSync(at('fresh5-sources.json'), 'utf8'));
  for (const f of src.files) assert.equal(createHash('sha256').update(readFileSync(new URL('../' + f.path, import.meta.url))).digest('hex'), f.sha256, f.path);
});

test('the departments are the columns, each once, none over six', () => {
  const all = Object.values(HEALTH_SILOS).flat();
  assert.deepEqual([...all].sort(), Object.keys(HEALTH_RANGES).sort());
  assert.equal(new Set(all).size, all.length);
  assert.ok(Object.values(HEALTH_SILOS).every((s) => s.length <= 6));
  assert.deepEqual(Object.keys(HEALTH_SILOS), ['conditions', 'habits', 'access', 'wellbeing', 'person']);
  assert.deepEqual(HEALTH_SAMPLE, { share: 60000 / 253680, seed: 2031 });
});

test('an answer is read as whole numbers in range; anything else refuses the file, naming the answer and the column', () => {
  const ok = healthRows(csv(row(), row({ [OUTCOME]: '1', BMI: '98', Age: '13.0' }), ''));
  assert.equal(ok.ok, true); assert.deepEqual(ok.y, [0, 1]); assert.equal(ok.rows[1].BMI, 98); assert.equal(ok.rows[1].Age, 13); assert.equal(ok.rows[0].BMI, 12);
  assert.equal(ok.rows[0].ID, undefined, 'the row ID is not used');
  for (const [over, re] of [[{ BMI: '11' }, /BMI is outside 12…98/], [{ BMI: '99' }, /BMI is outside/], [{ Age: '0' }, /Age is outside 1…13/], [{ GenHlth: '6' }, /GenHlth/],
    [{ Sex: '1.5' }, /Sex is outside/], [{ BMI: '25.5' }, /BMI is outside/], [{ Smoker: 'yes' }, /Smoker is outside/], [{ Income: '' }, /Income/], [{ MentHlth: '-1' }, /MentHlth/], [{ [OUTCOME]: '2' }, /Diabetes_binary is not 0 or 1/], [{ [OUTCOME]: 'x' }, /not 0 or 1/]])
    assert.match(healthRows(csv(row(), row(over))).error, re, JSON.stringify(over));
  assert.match(healthRows(csv(row(), row()) + '\n1,0').error, /answer 3 has 2 cells, not 23/);
  assert.equal(healthRows('ID').error, 'no answers'); assert.equal(healthRows('').error, 'no answers');
  assert.match(healthRows(HEAD.filter((h) => h !== 'Veggies').join(',') + '\n' + row()).error, /no column Veggies/);
  assert.match(healthRows(HEAD.filter((h) => h !== OUTCOME).join(',') + '\n' + row()).error, /no column Diabetes_binary/);
  assert.equal(healthRows(csv(row()).replace(/\n/g, '\r\n')).ok, true, 'CRLF lines read the same');
  assert.equal(loadHealth('x').ok, false);
});

test('the real file: every answer reads; a seeded sample of about 60,000 is split 30% TEST, the rest 75 / 25 FIT / GATE', () => {
  const text = readFileSync(at('fresh5/cdc-diabetes-health-indicators.csv'), 'utf8'), r = healthRows(text);
  assert.equal(r.ok, true); assert.equal(r.rows.length, 253680);
  const d = loadHealth(text), d2 = loadHealth(text);
  assert.equal(d.ok, true); assert.equal(d.name, 'health'); assert.equal(d.all, 253680);
  assert.equal(d.n, 59999); assert.deepEqual([d.fitRows.length, d.gateRows.length, d.testRows.length], [31500, 10500, 17999]);
  assert.deepEqual(d.picked, d2.picked, 'the sample is seeded'); assert.deepEqual(d.testRows, d2.testRows, 'so is the split');
  assert.equal(new Set([...d.fitRows, ...d.gateRows, ...d.testRows]).size, d.n, 'the three parts are disjoint and cover the sample');
  assert.deepEqual(d.features, Object.values(HEALTH_SILOS).flat());
  for (const f of d.features) assert.equal(d.cols[f].length, d.n);
  assert.ok(d.picked.every((v, i) => i === 0 || v > d.picked[i - 1]), 'the sample is in file order');
});
