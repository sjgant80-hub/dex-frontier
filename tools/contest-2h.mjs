#!/usr/bin/env node
// tools/contest-2h.mjs — organ 2h's frontier rival, defined once and pinned by its seal, exactly as organ 2g's: 1,200 TEST
// cases a domain (400 that ended in the outcome, 800 that did not, seeded), asked in four batches of 300, each batch a fresh
// cold subagent (Claude Opus 5.5) that sees only its prompt: the fields explained, the same 24 FIT cases, then its 300.
// Each case is shown in the dataset's own words (the coupon survey's answers as written; a forest cell's wilderness area
// by name and its soil by its land-type code and description from covtype.info): every field the departments hold
// between them, in the form a reader understands best, and for the coupon also the full occupation, which the driver
// department holds only as student / unemployed / retired — an advantage the frontier model is given, and said.
//   node tools/contest-2h.mjs prompt <coupon|cover> <1-4>          → data/llm/frontier-<domain>-<batch>.prompt.txt
//   node tools/contest-2h.mjs record <coupon|cover> <1-4> <reply>  → data/llm/frontier-<domain>-<batch>.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { loadCoupon, couponRows, loadCover, coverCells } from '../src/fresh3.mjs';
import { FRONTIER, parseProbability } from './contest.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const DOMAINS = ['coupon', 'cover'], BATCH = 300, CASES = { yes: 400, no: 800 };
export const SEEDS = { coupon: [3701, 3702, 3703], cover: [3801, 3802, 3803] };
export const SHOTS = { coupon: [101, 102, 103], cover: [111, 112, 113] };
const AREAS = ['Rawah', 'Neota', 'Comanche Peak', 'Cache la Poudre'];

/** each soil type's land-type code and description, as covtype.info lists them */
export function soilBook(info) {
  const out = {};
  for (const line of String(info).split(/\r?\n/)) { const m = /^\s+(\d{1,2})\s+(\d{4})\s+(.+?)\s*$/.exec(line); if (m && Number(m[1]) >= 1 && Number(m[1]) <= 40) out[Number(m[1])] = m[2] + ' ' + m[3]; }
  return out;
}

export const TEXT = {
  coupon: {
    head: 'You are predicting whether a driver accepts a coupon offered to them on the way somewhere. The data are real answers to a driving survey (the UCI In-Vehicle Coupon Recommendation dataset): each answer is one driver in one situation, offered one coupon. Each answer is described by:',
    yes: 'accepted the coupon', no: 'did not accept', fields: {
      destination: 'where they are driving', passanger: 'who is in the car', weather: 'weather', temperature: 'temperature (Fahrenheit)', time: 'time of day', coupon: 'the coupon offered', expiration: 'how long the coupon lasts (2h or 1d)',
      gender: 'gender', age: 'age band', maritalStatus: 'marital status', has_children: '1 = has children', education: 'education', occupation: 'occupation', income: 'yearly income band',
      Bar: 'bar visits a month (never, less1, 1~3, 4~8, gt8; blank = not answered)', CoffeeHouse: 'coffee house visits a month (same scale)', CarryAway: 'take-away food a month (same scale)', RestaurantLessThan20: 'restaurant meals under $20 a month (same scale)', Restaurant20To50: 'restaurant meals of $20–50 a month (same scale)',
      toCoupon_GEQ15min: '1 = the coupon’s place is at least 15 minutes’ drive', toCoupon_GEQ25min: '1 = at least 25 minutes’ drive', direction_same: '1 = the place is in the same direction they are driving',
    },
  },
  cover: {
    head: 'You are predicting whether a 30 m by 30 m patch of forest is spruce/fir. The data are real US Forest Service cells in four wilderness areas of the Roosevelt National Forest, northern Colorado (the UCI Covertype dataset). Each cell is described by:',
    yes: 'spruce/fir', no: 'another cover type', fields: {
      elevation: 'elevation (m)', aspect: 'aspect (degrees azimuth)', slope: 'slope (degrees)', water_across: 'horizontal distance to the nearest surface water (m)', water_up: 'vertical distance to the nearest surface water (m)',
      road: 'horizontal distance to the nearest road (m)', fire_point: 'horizontal distance to the nearest wildfire ignition point (m)', shade_9am: 'hillshade at 9am on the summer solstice (0–255)', shade_noon: 'hillshade at noon (0–255)', shade_3pm: 'hillshade at 3pm (0–255)',
      wilderness: 'wilderness area', soil: 'soil type (USFS land-type code: first digit the climatic zone, 2 lower montane … 8 alpine; second the geologic zone; then its description)',
    },
  },
};

/** the domain loaded, with each row's raw fields in the dataset's own words (row i is the loader's row i) */
export function load(domain) {
  if (domain === 'coupon') { const csv = read('data/in-vehicle-coupon-recommendation.csv'); return { ds: loadCoupon(csv), raw: couponRows(csv).rows }; }
  const text = gunzipSync(readFileSync(new URL('data/covtype.data.gz', ROOT))).toString('utf8'), book = soilBook(read('data/covtype.info'));
  const raw = coverCells(text).cells.map((c) => ({ ...c, wilderness: AREAS[[c.rawah, c.neota, c.comanche_peak, c.cache_la_poudre].indexOf(1)], soil: c.soilType + ' (' + book[c.soilType] + ')' }));
  return { ds: loadCover(text), raw };
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

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/contest-2h.mjs');
if (isMain) {
  const [what, domain, batch, file] = process.argv.slice(2), b = Number(batch) - 1;
  if (!['prompt', 'record'].includes(what) || !DOMAINS.includes(domain) || !(b >= 0 && b < 4)) { console.log('usage: node tools/contest-2h.mjs <prompt|record> <coupon|cover> <1-4> [reply file]'); process.exit(2); }
  const { ds, raw } = load(domain), prompt = batchPrompt(ds, raw, b), name = 'data/llm/frontier-' + domain + '-' + (b + 1);
  mkdirSync(new URL('data/llm/', ROOT), { recursive: true });
  if (what === 'prompt') { writeFileSync(new URL(name + '.prompt.txt', ROOT), prompt + '\n'); console.log('wrote ' + name + '.prompt.txt · ' + prompt.length + ' chars · ' + sha256Hex(prompt).slice(0, 16)); }
  else {
    const reply = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), calls = readReply(ds, reply, b);
    writeFileSync(new URL(name + '.json', ROOT), JSON.stringify({ kind: 'dex-frontier.frontier-answers', v: 1, domain, batch: b + 1, model: { name: FRONTIER, asked: 'a fresh Claude Code subagent, cold: this prompt only, no tools' }, prompt: sha256Hex(prompt).slice(0, 16), reply, calls }, null, 1) + '\n');
    console.log('recorded ' + calls.filter((c) => c.p !== null).length + ' of 300 readable answers');
  }
}
