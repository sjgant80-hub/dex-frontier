// fresh3.test.mjs — organ 2h's datasets are read one way, sampled and split one way, and refused when wrong. Structure only:
// no test here scores a held-out row, so nothing here can steer a measurement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { loadCoupon, couponRows, loadCover, coverCells, coverCell, COUPON_SILOS, COUPON_CODES, COVER_SILOS, COVER_COLUMNS, COVER_SAMPLE, ELU, COMMON_SOILS } from '../src/fresh3.mjs';
import { silo } from '../src/silos.mjs';

const at = (p) => new URL('../data/' + p, import.meta.url);
const CSV = readFileSync(at('in-vehicle-coupon-recommendation.csv'), 'utf8'), COVER = gunzipSync(readFileSync(at('covtype.data.gz'))).toString('utf8');
const C = loadCoupon(CSV), V = loadCover(COVER);
const disjointCover = (ds) => { const all = [...ds.fitRows, ...ds.gateRows, ...ds.testRows]; return new Set(all).size === all.length && all.length === ds.n; };
const rate = (ds, rows) => rows.reduce((a, i) => a + ds.y[i], 0) / rows.length;
const row = (ds, i) => Object.fromEntries(ds.features.map((f) => [f, ds.cols[f][i]]));

test('the files are the ones downloaded, byte for byte, as data/fresh3-sources.json records', () => {
  const src = JSON.parse(readFileSync(at('fresh3-sources.json'), 'utf8'));
  for (const f of src.files) assert.equal(createHash('sha256').update(readFileSync(new URL('../' + f.path, import.meta.url))).digest('hex'), f.sha256, f.path);
  assert.deepEqual(src.files.map((f) => f.licence), ['CC BY 4.0', 'CC BY 4.0', 'CC BY 4.0']);
});

test('coupon: 12,684 real answers, 33 encoded features in four departments, the first answer exactly', () => {
  assert.ok(C.ok, C.error);
  assert.equal(C.n, 12684);
  assert.deepEqual(C.features, Object.values(COUPON_SILOS).flat());
  assert.deepEqual(Object.fromEntries(Object.entries(COUPON_SILOS).map(([k, v]) => [k, v.length])), { trip: 12, coupon: 5, driver: 11, habits: 5 });
  assert.equal(C.y.reduce((a, v) => a + v, 0), 7210);
  assert.deepEqual(row(C, 0), { dest_home: 0, dest_work: 0, with_friends: 0, with_partner: 0, with_kids: 0, snowy: 0, rainy: 0, temperature: 55, hour: 14, far15: 0, far25: 0, same_way: 0, coffee: 0, cheap_meal: 1, carry_out: 0, bar: 0, lasts_a_day: 1, female: 1, age: 21, married: 0, single: 0, partnered: 1, children: 1, education: 3, income: 4, student: 0, unemployed: 1, retired: 0, bar_visits: 0, coffee_visits: 0, carry_out_visits: -1, cheap_meal_visits: 3, mid_meal_visits: 2 });
  assert.equal(C.y[0], 1);
  assert.ok(disjointCover(C)); assert.deepEqual([C.fitRows.length, C.gateRows.length, C.testRows.length], [6660, 2219, 3805]);
  for (const rows of [C.fitRows, C.gateRows, C.testRows]) assert.ok(Math.abs(rate(C, rows) - 7210 / 12684) < 0.002, 'stratified');
  for (const [name, feats] of Object.entries(COUPON_SILOS)) assert.deepEqual(Object.keys(silo(C, name).cols), feats);
  assert.equal(C.cols.bar_visits.filter((v) => v === -1).length, 107, 'the 107 who did not answer how often they go to a bar');
});

test('coupon encodings: every answer to its number, the blank habit answer as −1, anything else refused', () => {
  const E = COUPON_CODES;
  assert.deepEqual(['Home', 'Work', 'No Urgent Place', 'Mars'].map((v) => [E.dest_home(v), E.dest_work(v)].join()), ['1,0', '0,1', '0,0', 'NaN,NaN']);
  assert.deepEqual(['Alone', 'Friend(s)', 'Partner', 'Kid(s)', 'Dog'].map((v) => [E.with_friends(v), E.with_partner(v), E.with_kids(v)].join('')), ['000', '100', '010', '001', 'NaNNaNNaN']);
  assert.deepEqual(['Sunny', 'Snowy', 'Rainy', 'Foggy'].map((v) => [E.snowy(v), E.rainy(v)].join('')), ['00', '10', '01', 'NaNNaN']);
  assert.deepEqual(['30', '55', '80', '70'].map(E.temperature).map(String), ['30', '55', '80', 'NaN']);
  assert.deepEqual(['7AM', '10AM', '2PM', '6PM', '10PM', '3PM'].map(E.hour).map(String), ['7', '10', '14', '18', '22', 'NaN']);
  assert.deepEqual(['Coffee House', 'Restaurant(<20)', 'Carry out & Take away', 'Bar', 'Restaurant(20-50)', 'Spa'].map((v) => [E.coffee, E.cheap_meal, E.carry_out, E.bar].map((f) => f(v)).join('')), ['1000', '0100', '0010', '0001', '0000', 'NaNNaNNaNNaN']);
  assert.deepEqual(['1d', '2h', '3d'].map(E.lasts_a_day).map(String), ['1', '0', 'NaN']);
  assert.deepEqual(['below21', '21', '50plus', '60'].map(E.age).map(String), ['18', '21', '55', 'NaN']);
  assert.deepEqual(['Married partner', 'Single', 'Unmarried partner', 'Divorced', 'Widowed', 'x'].map((v) => [E.married(v), E.single(v), E.partnered(v)].join('')), ['100', '010', '001', '000', '000', 'NaNNaNNaN']);
  assert.deepEqual(['Some High School', 'Graduate degree (Masters or Doctorate)', 'PhD'].map(E.education).map(String), ['1', '6', 'NaN']);
  assert.deepEqual(['Less than $12500', '$100000 or More', '$1'].map(E.income).map(String), ['1', '9', 'NaN']);
  assert.deepEqual(['Student', 'Unemployed', 'Retired', 'Sales & Related', ''].map((v) => [E.student(v), E.unemployed(v), E.retired(v)].join('')), ['100', '010', '001', '000', 'NaNNaNNaN']);
  assert.deepEqual(['never', 'less1', '1~3', '4~8', 'gt8', '', 'often'].map(E.bar_visits).map(String), ['0', '1', '2', '3', '4', '-1', 'NaN']);
  assert.deepEqual(['0', '1', '2'].map(E.far15).map(String), ['0', '1', 'NaN']);
  const [head, first] = CSV.split(/\r?\n/);
  assert.equal(loadCoupon(head + '\n' + first.replace('No Urgent Place', 'Moon')).error, 'answer 1: dest_home is not readable');
  assert.equal(loadCoupon(head + '\n' + first.replace(/,1$/, ',2')).error, 'answer 1: the outcome is not readable');
  assert.equal(couponRows(CSV.replace(',Bar,', ',Pub,')).error, 'missing columns: Bar');
  assert.equal(couponRows(head + '\n1,2').error, 'row 1 has 2 cells, not 26');
  assert.equal(couponRows('').error, 'no rows'); assert.equal(couponRows(head).error, 'no rows');
});

test('cover: a stratified seeded sample of 59,999 of the 581,012 cells, 30 features in five departments, split the same every time', () => {
  assert.ok(V.ok, V.error);
  assert.equal(V.all, 581012); assert.equal(V.n, 59999);
  assert.deepEqual(COVER_SAMPLE, { share: 60000 / 581012, seed: 2028 });
  assert.deepEqual(V.features, Object.values(COVER_SILOS).flat());
  assert.deepEqual(Object.fromEntries(Object.entries(COVER_SILOS).map(([k, v]) => [k, v.length])), { terrain: 3, distances: 4, light: 3, land: 4, soil: 16 });
  assert.equal(V.y.reduce((a, v) => a + v, 0), 21876);
  assert.ok(Math.abs(21876 / 59999 - 211840 / 581012) < 0.001, 'the sample keeps spruce/fir’s share of every cell');
  assert.deepEqual(row(V, 0), { elevation: 2590, aspect: 56, slope: 2, water_across: 212, water_up: -6, road: 390, fire_point: 6225, shade_9am: 220, shade_noon: 235, shade_3pm: 151, rawah: 1, neota: 0, comanche_peak: 0, cache_la_poudre: 0, climate_zone: 7, geology_zone: 7, soil_29: 1, soil_23: 0, soil_32: 0, soil_33: 0, soil_22: 0, soil_10: 0, soil_30: 0, soil_12: 0, soil_31: 0, soil_24: 0, soil_13: 0, soil_38: 0, soil_39: 0, soil_11: 0 });
  assert.equal(V.y[0], 0);
  assert.ok(disjointCover(V)); assert.deepEqual([V.fitRows.length, V.gateRows.length, V.testRows.length], [31502, 10499, 17998]);
  for (const rows of [V.fitRows, V.gateRows, V.testRows]) assert.ok(Math.abs(rate(V, rows) - 21876 / 59999) < 0.002, 'stratified');
  for (const [name, feats] of Object.entries(COVER_SILOS)) assert.deepEqual(Object.keys(silo(V, name).cols), feats);
});

test('a cell: its numbers as published, its soil’s land-type zones, and anything malformed refused', () => {
  assert.equal(COVER_COLUMNS.length, 55); assert.equal(ELU.length, 40);
  assert.deepEqual([COVER_COLUMNS[0], COVER_COLUMNS[9], COVER_COLUMNS[10], COVER_COLUMNS[13], COVER_COLUMNS[14], COVER_COLUMNS[53], COVER_COLUMNS[54]], ['Elevation', 'Horizontal_Distance_To_Fire_Points', 'Wilderness_Area1', 'Wilderness_Area4', 'Soil_Type1', 'Soil_Type40', 'Cover_Type']); assert.deepEqual(COMMON_SOILS, [29, 23, 32, 33, 22, 10, 30, 12, 31, 24, 13, 38, 39, 11]);
  const first = COVER.slice(0, COVER.indexOf('\n')), c = coverCell(first);
  assert.deepEqual([c.elevation, c.aspect, c.slope, c.water_across, c.water_up, c.road, c.shade_9am, c.shade_noon, c.shade_3pm, c.fire_point, c.rawah, c.soilType, c.coverType, c.climate_zone, c.geology_zone, c.soil_29], [2596, 51, 3, 258, 0, 510, 221, 232, 148, 6279, 1, 29, 5, 7, 7, 1]);
  const cells = first.split(',');
  const withSoil = (k) => [...cells.slice(0, 14), ...Array.from({ length: 40 }, (_, j) => (j === k - 1 ? '1' : '0')), '1'].join(',');
  assert.deepEqual([1, 7, 14, 15, 18, 35, 40].map((k) => { const x = coverCell(withSoil(k)); return [x.climate_zone, x.geology_zone].join(''); }), ['27', '35', '51', '51', '67', '87', '87']);
  assert.equal(coverCell(withSoil(11)).soil_11, 1); assert.equal(coverCell(withSoil(4)).soil_11, 0);
  assert.equal(coverCell(cells.slice(0, 54).join(',')), null, 'too few columns');
  assert.equal(coverCell(first.replace(/^2596/, '25.96')), null, 'not an integer');
  assert.equal(coverCell([...cells.slice(0, 10), '1', '1', '0', '0', ...cells.slice(14)].join(',')), null, 'two wilderness areas');
  assert.equal(coverCell([...cells.slice(0, 10), '0', '0', '0', '0', ...cells.slice(14)].join(',')), null, 'no wilderness area');
  assert.equal(coverCell([...cells.slice(0, 14), ...Array(40).fill('0'), '5'].join(',')), null, 'no soil type');
  assert.equal(coverCell([...cells.slice(0, 10), '2', '0', '0', '0', ...cells.slice(14)].join(',')), null, 'a flag that is not 0 or 1');
  assert.equal(coverCell([...cells.slice(0, 10), '1', '1', '-1', '0', ...cells.slice(14)].join(',')), null, 'wilderness flags that sum to 1 but are not all 0 or 1');
  assert.equal(coverCell([...cells.slice(0, 14), '1', '1', '-1', ...Array(37).fill('0'), '5'].join(',')), null, 'soil flags that sum to 1 but are not all 0 or 1');
  assert.equal(coverCell([...cells.slice(0, 54), '8'].join(',')), null); assert.equal(coverCell([...cells.slice(0, 54), '0'].join(',')), null);
  assert.equal(coverCell([...cells.slice(0, 54), '7'].join(',')).coverType, 7); assert.equal(coverCell([...cells.slice(0, 54), '1'].join(',')).coverType, 1);
  assert.equal(coverCells('').error, 'no rows'); assert.equal(coverCells(first + '\n1,2').error, 'cell 2 is not readable');
  assert.equal(loadCover('').error, 'no rows');
  assert.deepEqual(coverCells(first + '\n' + first).all, 2);
});
