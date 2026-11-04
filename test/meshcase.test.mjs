// the For-your-business cost case: every figure from the sourced basis (vendored byte for byte), floors for the buyer's
// side and a high figure for the mesh's own, like for like, never a throw
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DEFAULTS, BASIS_KEYS, sourcesOf, over, meshCase } from '../src/meshcase.mjs';

const RAW = readFileSync(new URL('../vendor/sovereign-enterprise/data/basis.json', import.meta.url));
const BASIS = JSON.parse(RAW.toString('utf8'));
const base = (patch) => ({ ...BASIS, ...patch });
const r2 = (x) => Math.round(x * 100) / 100;

test('the basis is sovereign-enterprise’s data/basis.json, byte for byte (the hash vendor/SOURCES-basis.json names)', () => {
  const pinned = JSON.parse(readFileSync(new URL('../vendor/SOURCES-basis.json', import.meta.url), 'utf8'));
  assert.equal(createHash('sha256').update(RAW).digest('hex'), pinned.sha256);
  assert.equal(pinned.path, 'vendor/sovereign-enterprise/data/basis.json');
  assert.equal(pinned.src, 'data/basis.json');
});

test('meshCase · the default case, every line from the sourced basis', () => {
  const r = meshCase(BASIS, {});
  assert.equal(r.ok, true);
  assert.deepEqual(r.inputs, DEFAULTS);
  assert.deepEqual(r.lines, { staff: 20456.8, takenOff: 10228.4, seats: 1386, frontier: 49.01, open: 5.42, power: 96.62 });
  assert.deepEqual(r.perYear, { today: 20456.8, rentSeats: 21842.8, cloudFrontier: 10277.41, cloudOpen: 10233.82, mesh: 10325.02 });
  assert.deepEqual(r.over, { today: 63292.54, rentSeats: 67580.77, cloudFrontier: 31797.91, cloudOpen: 31663.04, mesh: 31945.21 });
  assert.deepEqual([r.savingPerYear, r.savingOver, r.versusFrontierOver, r.versusOpenOver], [10131.78, 31347.33, -147.3, -282.17]);
  assert.deepEqual(meshCase(BASIS), r, 'no input reads as the defaults');
});

test('meshCase · like for like: seats take nothing off; both cloud routes and the mesh take the same share off', () => {
  const r = meshCase(BASIS, { share: 0.8, seats: 2, departments: 7, casesPerWeek: 1000, tokensIn: 2000, tokensOut: 500 });
  assert.equal(r.inputs.departments, 7);
  assert.equal(r.perYear.rentSeats, r2(r.lines.staff + r.lines.seats));
  assert.equal(r.perYear.cloudFrontier, r2(r.lines.staff - r.lines.takenOff + r.lines.frontier));
  assert.equal(r.perYear.cloudOpen, r2(r.lines.staff - r.lines.takenOff + r.lines.open));
  assert.equal(r.perYear.mesh, r2(r.lines.staff - r.lines.takenOff + r.lines.power));
  assert.equal(r.lines.takenOff, r2(r.lines.staff * 0.8));
  assert.equal(r.lines.seats, r2(2 * 12 * BASIS['seat.copilot'].value));
  assert.equal(r.lines.power, r2(7 * 15 * 8760 / 1000 * BASIS.electricityPencePerKwh.value / 100));
  assert.equal(r.lines.frontier, r2(1000 * 52 * (2000 * 2 + 500 * 10) / 1e6 * BASIS.fxGbpPerUsd.value));
  assert.equal(r.lines.open, r2(1000 * 52 * (2000 * 0.23 + 500 * 0.93) / 1e6 * BASIS.fxGbpPerUsd.value));
  assert.equal(r.versusFrontierOver, r2(r.over.cloudFrontier - r.over.mesh));
  assert.equal(r.versusOpenOver, r2(r.over.cloudOpen - r.over.mesh));
  assert.equal(r.savingOver, r2(r.over.today - r.over.mesh));
});

test('meshCase · the figures move with the basis, not with anything typed', () => {
  assert.equal(meshCase(base({ wageMedianHourly: { ...BASIS.wageMedianHourly, value: 30 } }), {}).lines.staff, 20 * 52 * 30);
  assert.equal(meshCase(base({ electricityPencePerKwh: { ...BASIS.electricityPencePerKwh, value: 10 } }), {}).lines.power, r2(3 * 15 * 8760 / 1000 * 10 / 100));
  assert.equal(meshCase(base({ laptopExtraWatts: { ...BASIS.laptopExtraWatts, value: 30 } }), {}).lines.power, r2(3 * 30 * 8760 / 1000 * 24.51 / 100));
  assert.equal(meshCase(base({ hoursPerYear: { value: 1000 } }), {}).lines.power, r2(3 * 15 * 1000 / 1000 * 24.51 / 100));
  assert.equal(meshCase(base({ fxGbpPerUsd: { ...BASIS.fxGbpPerUsd, value: 1 } }), {}).lines.frontier, r2(500 * 52 * (1000 * 2 + 50 * 10) / 1e6));
  assert.equal(meshCase(base({ frontier: { ...BASIS.frontier, inPerM: 4, outPerM: 20 } }), {}).lines.frontier, r2(500 * 52 * (1000 * 4 + 50 * 20) / 1e6 * BASIS.fxGbpPerUsd.value));
  assert.equal(meshCase(base({ bedrockGptOss120b: { ...BASIS.bedrockGptOss120b, inPerM: 1, outPerM: 2 } }), {}).lines.open, r2(500 * 52 * (1000 * 1 + 50 * 2) / 1e6 * BASIS.fxGbpPerUsd.value));
  assert.equal(meshCase(base({ 'seat.copilot': { value: 10 } }), {}).lines.seats, 5 * 12 * 10);
  assert.equal(meshCase(base({ cpi: { value: 0 } }), {}).over.today, r2(3 * 20456.8));
});

test('meshCase · boundaries hold at both ends of every input', () => {
  for (const ok of [{ hoursPerWeek: 0 }, { hoursPerWeek: 168 }, { share: 0 }, { share: 1 }, { departments: 1 }, { departments: 100 }, { seats: 0 }, { years: 1 }, { years: 10 }, { casesPerWeek: 0, tokensIn: 0, tokensOut: 0 }]) assert.equal(meshCase(BASIS, ok).ok, true, JSON.stringify(ok));
  assert.equal(meshCase(BASIS, { share: 1 }).perYear.mesh, meshCase(BASIS, { share: 1 }).lines.power);
  assert.equal(meshCase(BASIS, { share: 0 }).savingPerYear, -96.62);
  assert.equal(meshCase(BASIS, { years: 1 }).over.today, 20456.8);
  assert.equal(meshCase(BASIS, { departments: 1 }).lines.power, 32.21);
  assert.equal(meshCase(BASIS, { casesPerWeek: 0 }).lines.frontier, 0);
});

test('meshCase · each bad input refused with its reason', () => {
  const why = (i) => meshCase(BASIS, i).why;
  assert.equal(why({ hoursPerWeek: 168.5 }), 'hours a week: 0 to 168');
  assert.equal(why({ hoursPerWeek: -1 }), 'hours a week: 0 to 168');
  assert.equal(why({ hoursPerWeek: '20' }), 'hours a week: 0 to 168');
  assert.equal(why({ hoursPerWeek: Infinity }), 'hours a week: 0 to 168');
  assert.equal(why({ share: 1.01 }), 'the share of the work taken off: 0 to 1');
  assert.equal(why({ share: -0.1 }), 'the share of the work taken off: 0 to 1');
  assert.equal(why({ departments: 0 }), 'departments: a whole number, 1 to 100');
  assert.equal(why({ departments: 101 }), 'departments: a whole number, 1 to 100');
  assert.equal(why({ departments: 2.5 }), 'departments: a whole number, 1 to 100');
  assert.equal(why({ seats: 2.5 }), 'seats: a whole number');
  assert.equal(why({ seats: -1 }), 'seats: a whole number');
  assert.equal(why({ casesPerWeek: -1 }), 'cases and tokens: numbers');
  assert.equal(why({ casesPerWeek: Infinity }), 'cases and tokens: numbers');
  assert.equal(why({ tokensIn: NaN }), 'cases and tokens: numbers');
  assert.equal(why({ tokensOut: 'x' }), 'cases and tokens: numbers');
  assert.equal(why({ years: 0 }), 'years: 1 to 10');
  assert.equal(why({ years: 11 }), 'years: 1 to 10');
  assert.equal(why({ years: 2.5 }), 'years: 1 to 10');
});

test('meshCase · refuses a basis missing any figure it reads, and never throws', () => {
  const refused = { ok: false, why: 'a sourced basis with every figure the case reads' };
  assert.deepEqual(meshCase(null, {}), refused);
  for (const k of BASIS_KEYS) { const b = { ...BASIS }; delete b[k]; assert.deepEqual(meshCase(b, {}), refused, k); }
  assert.deepEqual(meshCase(base({ cpi: { value: -0.1 } }), {}), refused);
  assert.deepEqual(meshCase(base({ frontier: { inPerM: 2 } }), {}), refused);
  assert.deepEqual(meshCase(base({ bedrockGptOss120b: { outPerM: 0.93 } }), {}), refused);
  const toxic = { get hoursPerWeek() { throw new Error('no'); } };
  assert.deepEqual(meshCase(BASIS, toxic), { ok: false, why: 'the inputs could not be read' });
  for (const junk of [undefined, 0, 'x', [], 42n]) assert.equal(meshCase(junk, {}).ok, false);
});

test('over · CPI on every year after the first, compounding', () => {
  assert.equal(over(100, 0.1, 1), 100);
  assert.equal(over(100, 0.1, 2), 210);
  assert.equal(over(100, 0.1, 3), 331);
  assert.equal(over(100, 0, 4), 400);
  assert.equal(over(100, 0.1, 0), 0);
});

test('sourcesOf · every figure the case reads, with what it is and where it came from', () => {
  const s = sourcesOf(BASIS);
  assert.deepEqual(s.map((x) => x.key), [...BASIS_KEYS]);
  assert.equal(s.find((x) => x.key === 'frontier').what, 'Claude Sonnet 5 (API)');
  assert.equal(s.find((x) => x.key === 'wageMedianHourly').what, BASIS.wageMedianHourly.what);
  assert.ok(s.filter((x) => x.key !== 'hoursPerYear').every((x) => /^https:\/\//.test(x.source)), 'every price and rate is sourced');
  assert.deepEqual(sourcesOf(null), []);
  assert.deepEqual(sourcesOf({}), []);
});

test('no price of ours: the case reads only the buyer’s costs', () => {
  const src = readFileSync(new URL('../src/meshcase.mjs', import.meta.url), 'utf8');
  for (const k of BASIS_KEYS) assert.ok(src.includes("'" + k + "'"));
  assert.ok(!/\bfees?\b|\blicen[cs]e\b|\btiers?\b|our price/i.test(src.replace(/\/\/.*$/gm, '').replace(/\/\*\*[\s\S]*?\*\//g, '')), 'the code names no price of ours');
});
