// silos.test.mjs — the real data is read one way, split one way, and refused when it is wrong. Structure only: no test
// here scores a held-out row, so nothing here can steer a sealed measurement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTelco, loadShop, silo, pooled, TELCO_SILOS, SHOP_SILOS, TELCO_CODES, SPLIT } from '../src/silos.mjs';

const read = (p) => readFileSync(new URL('../data/' + p, import.meta.url), 'utf8');
const TELCO = read('telco-churn.csv'), SHOP = read('online_shoppers_intention.csv');
const T = loadTelco(TELCO), S = loadShop(SHOP);
const disjointCover = (ds) => {
  const all = [...ds.fitRows, ...ds.gateRows, ...ds.testRows];
  return new Set(all).size === all.length && all.length === ds.n;
};

test('telco: 7,043 real customers, 20 encoded features in three silos, churn read as 1', () => {
  assert.ok(T.ok, T.error);
  assert.equal(T.n, 7043);
  assert.deepEqual(T.features, Object.values(TELCO_SILOS).flat());
  assert.equal(T.features.length, 20);
  assert.equal(T.y.reduce((a, v) => a + v, 0), 1869, 'IBM’s file holds 1,869 churners');
  // the first customer of IBM’s file, encoded: female, no partner flag issues, DSL, month-to-month, electronic check
  const c = Object.fromEntries(T.features.map((f) => [f, T.cols[f][0]]));
  assert.deepEqual(c, { gender: 1, SeniorCitizen: 0, Partner: 1, Dependents: 0, PhoneService: 0, MultipleLines: 0, InternetService: 1, OnlineSecurity: 0, OnlineBackup: 1, DeviceProtection: 0, TechSupport: 0, StreamingTV: 0, StreamingMovies: 0, tenure: 1, Contract: 0, PaperlessBilling: 1, ElectronicCheck: 1, AutoPay: 0, MonthlyCharges: 29.85, TotalCharges: 29.85 });
  assert.equal(T.y[0], 0);
});

test('telco encodings: every category to its number, blank charges to 0, an unknown category refused', () => {
  assert.equal(TELCO_CODES.InternetService('Fiber optic'), 2); assert.equal(TELCO_CODES.InternetService('No'), 0);
  assert.equal(TELCO_CODES.Contract('Two year'), 2); assert.equal(TELCO_CODES.Contract('One year'), 1);
  assert.equal(TELCO_CODES.AutoPay(null, { PaymentMethod: 'Credit card (automatic)' }), 1);
  assert.equal(TELCO_CODES.AutoPay(null, { PaymentMethod: 'Mailed check' }), 0);
  assert.equal(TELCO_CODES.ElectronicCheck(null, { PaymentMethod: 'Electronic check' }), 1);
  assert.equal(TELCO_CODES.TotalCharges(' '), 0); assert.equal(TELCO_CODES.gender('Male'), 0);
  assert.equal(TELCO_CODES.MultipleLines('No phone service'), 0); assert.equal(TELCO_CODES.OnlineSecurity('No internet service'), 0);
  const blankRows = T.testRows.concat(T.fitRows, T.gateRows).filter((i) => T.cols.TotalCharges[i] === 0);
  assert.ok(blankRows.length === 11 && blankRows.every((i) => T.cols.tenure[i] === 0), 'the 11 blank charges are the 11 first-month customers');
  const bad = TELCO.replace('Month-to-month', 'Fortnightly');
  assert.match(loadTelco(bad).error, /customer 1: Contract is not readable/);
  assert.match(loadTelco(TELCO.replace(',Churn', ',Left')).error, /missing columns: Churn/);
  assert.match(loadTelco('a,b\n1').error, /row 1 has 1 cells, not 2/);
  assert.match(loadTelco('').error, /no rows/);
  assert.equal(loadTelco(TELCO.replace(/,No\n/, ',Maybe\n')).error, 'customer 1: Churn is not Yes or No');
});

test('telco split: a stratified 30% test, the rest 75 / 25 fit / gate, disjoint, covering every customer', () => {
  assert.ok(disjointCover(T));
  assert.equal(T.testRows.length, 2112);
  assert.equal(T.gateRows.length + T.fitRows.length, 7043 - 2112);
  const rate = (rows) => rows.reduce((a, i) => a + T.y[i], 0) / rows.length;
  for (const rows of [T.fitRows, T.gateRows, T.testRows]) assert.ok(Math.abs(rate(rows) - 1869 / 7043) < 0.002, 'stratified');
  assert.equal(T.gateRows.length, 1232);
  assert.deepEqual(SPLIT, { telcoTest: 0.3, gate: 0.25, telcoSeed: 2026, gateSeed: 2027 });
  assert.deepEqual(loadTelco(TELCO).testRows, T.testRows, 'the same split every time');
});

test('shop: 12,330 real sessions, 16 features in three silos; test is November–December, the rest fit / gate', () => {
  assert.ok(S.ok, S.error);
  assert.equal(S.n, 12330);
  assert.deepEqual(S.features, Object.values(SHOP_SILOS).flat());
  assert.equal(S.testRows.length, 4725, 'every November and December session, as every shop organ before');
  assert.ok(disjointCover(S));
  assert.equal(S.gateRows.length + S.fitRows.length, 7605);
  assert.equal(S.y.reduce((a, v) => a + v, 0), 1908, 'UCI’s file holds 1,908 sessions that ended in a purchase'); assert.equal(S.y[0], 0);
  assert.equal(S.cols.VisitorType[0], 1, 'a returning visitor'); assert.equal(S.cols.Weekend[0], 0);
  assert.ok([...S.cols.VisitorType].every((v) => v === 0 || v === 0.5 || v === 1));
  assert.match(loadShop(SHOP.replace('Returning_Visitor', 'Robot')).error, /session 1: VisitorType is not readable/);
  assert.match(loadShop(SHOP.replace(',FALSE,FALSE', ',FALSE,MAYBE')).error, /session 1: Revenue is not TRUE or FALSE/);
  assert.match(loadShop(SHOP.replace(',FALSE,FALSE', ',NOPE,FALSE')).error, /Weekend is not readable/);
  assert.match(loadShop(SHOP.replace(/^0,/m, 'x,')).error, /Administrative is not readable/);
  assert.match(loadShop(SHOP.replace('PageValues', 'Value')).error, /missing columns: PageValues/);
  assert.match(loadShop('').error, /no rows/);
  assert.match(loadShop('a,b\n1').error, /row 1 has 1 cells/);
});

test('a silo is only its own columns, grown on FIT and graded on GATE; pooled is everything in one place', () => {
  const v = silo(T, 'account');
  assert.ok(v.ok);
  assert.equal(v.name, 'telco-account');
  assert.deepEqual(Object.keys(v.cols), TELCO_SILOS.account);
  assert.equal(v.trainRows, T.fitRows); assert.equal(v.heldRows, T.gateRows);
  assert.equal(v.cols.tenure, T.cols.tenure);
  assert.ok(!('gender' in v.cols), 'a node never sees another silo’s records');
  assert.match(silo(T, 'browsing').error, /no silo browsing in telco/);
  const p = pooled(T);
  assert.equal(p.rows.length, T.fitRows.length + T.gateRows.length);
  assert.ok(p.rows.every((i, k) => k === 0 || i > p.rows[k - 1]), 'sorted');
  assert.ok(!p.rows.some((i) => T.testRows.includes(i)), 'never a test row');
  assert.equal(p.features, T.features);
});
