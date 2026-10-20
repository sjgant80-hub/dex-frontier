// scale.test.mjs — the finer silos cover every column exactly once, and a fine node sees only its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FINE, fine, fineNames } from '../src/scale.mjs';
import { loadTelco, loadShop, TELCO_SILOS, SHOP_SILOS } from '../src/silos.mjs';

const read = (p) => readFileSync(new URL('../data/' + p, import.meta.url), 'utf8');
const T = loadTelco(read('telco-churn.csv')), S = loadShop(read('online_shoppers_intention.csv'));

test('every column is in exactly one fine silo: telco 7 silos, shop 6', () => {
  for (const [ds, coarse, k] of [[T, TELCO_SILOS, 7], [S, SHOP_SILOS, 6]]) {
    const cols = Object.values(FINE[ds.name]).flat();
    assert.equal(new Set(cols).size, cols.length, 'no column twice');
    assert.deepEqual([...cols].sort(), [...Object.values(coarse).flat()].sort(), 'every column once');
    assert.equal(fineNames(ds).length, k);
  }
});

test('a fine silo is only its own columns, grown on FIT and graded on GATE', () => {
  const v = fine(T, 'charges');
  assert.ok(v.ok); assert.equal(v.name, 'telco-charges'); assert.deepEqual(v.features, ['MonthlyCharges', 'TotalCharges']);
  assert.deepEqual(Object.keys(v.cols), v.features); assert.equal(v.cols.MonthlyCharges, T.cols.MonthlyCharges);
  assert.equal(v.trainRows, T.fitRows); assert.equal(v.heldRows, T.gateRows); assert.equal(v.n, T.n); assert.equal(v.y, T.y);
  assert.match(fine(T, 'value').error, /no fine silo value in telco/);
  assert.match(fine({ name: 'nowhere' }, 'x').error, /no fine silo x in nowhere/);
  assert.deepEqual(fineNames({ name: 'nowhere' }), []);
  assert.deepEqual(fine(S, 'value').features, ['PageValues']);
});
