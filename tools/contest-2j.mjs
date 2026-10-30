#!/usr/bin/env node
// tools/contest-2j.mjs — organ 2j's frontier rival, defined once and pinned by its seal, as organ 2i's: 1,200 TEST cases
// (400 that ended in the outcome, 800 that did not, seeded), asked in four batches of 300, each batch a fresh cold subagent
// (Claude Opus 5.5) that sees only its prompt: the fields explained in the survey's own codebook words (UCI dataset 891's
// variable table), the same 24 FIT cases, then its 300. Each case is one line of values in the order the fields are
// listed: every column the departments hold between them, and nothing else, so neither side holds a column the other lacks.
//   node tools/contest-2j.mjs prompt health <1-4>          → data/llm/frontier-health-<batch>.prompt.txt
//   node tools/contest-2j.mjs record health <1-4> <reply>  → data/llm/frontier-health-<batch>.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { loadHealth, HEALTH_RANGES } from '../src/fresh5.mjs';
import { FRONTIER, parseProbability } from './contest.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const DOMAINS = ['health'], BATCH = 300, CASES = { yes: 400, no: 800 };
export const SEEDS = { health: [4101, 4102, 4103] };
export const SHOTS = { health: [141, 142, 143] };

export const TEXT = {
  health: {
    head: 'You are predicting whether a person has diabetes or prediabetes. The data are real answers to the 2015 Behavioral Risk Factor Surveillance System, a telephone survey of adults in the United States run by the Centers for Disease Control and Prevention (the CDC Diabetes Health Indicators dataset, UCI). Each person is one line of values, in this order:',
    yes: 'diabetes or prediabetes', no: 'neither', fields: {
      HighBP: '1 = high blood pressure, 0 = not', HighChol: '1 = high cholesterol, 0 = not', CholCheck: '1 = cholesterol checked in the past 5 years, 0 = not', BMI: 'body mass index',
      Stroke: '1 = ever told they had a stroke', HeartDiseaseorAttack: '1 = coronary heart disease or a heart attack (myocardial infarction)',
      Smoker: '1 = has smoked at least 100 cigarettes (5 packs) in their life', PhysActivity: '1 = physical activity in the past 30 days, not counting their job',
      Fruits: '1 = eats fruit once a day or more', Veggies: '1 = eats vegetables once a day or more', HvyAlcoholConsump: '1 = heavy drinker (men more than 14 drinks a week, women more than 7)',
      AnyHealthcare: '1 = has any kind of health care coverage', NoDocbcCost: '1 = in the past 12 months needed to see a doctor but could not because of cost',
      GenHlth: 'general health: 1 excellent, 2 very good, 3 good, 4 fair, 5 poor', MentHlth: 'days in the past 30 their mental health was not good', PhysHlth: 'days in the past 30 their physical health was not good',
      DiffWalk: '1 = serious difficulty walking or climbing stairs', Sex: '0 = female, 1 = male', Age: 'age band: 1 = 18 to 24, then bands of five years (9 = 60 to 64), 13 = 80 or older',
      Education: 'education: 1 = never attended school or only kindergarten, 2 = grades 1 to 8, 3 = grades 9 to 11, 4 = high school graduate, 5 = some college or technical school, 6 = college graduate',
      Income: 'household income band, 1 to 8: 1 = under $10,000, 5 = under $35,000, 8 = $75,000 or more',
    },
  },
};

/** the domain loaded, with each row's fields as the prompt shows them (row i is the loader's row i) */
export function load(domain) {
  const ds = loadHealth(read('data/fresh5/cdc-diabetes-health-indicators.csv'));
  if (!ds.ok) return { ds, raw: [] };
  return { ds, raw: Array.from({ length: ds.n }, (_, i) => Object.fromEntries(Object.keys(TEXT[domain].fields).map((f) => [f, String(ds.cols[f][i])]))) };
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

export const caseLine = (name, row) => Object.keys(TEXT[name].fields).map((f) => row[f]).join(', ');

/** batch b's prompt: the fields explained in order, the 24 examples, then its 300 cases numbered 1 … 300 */
export function batchPrompt(ds, raw, b) {
  const t = TEXT[ds.name];
  return t.head + '\n' + Object.entries(t.fields).map(([f, d], k) => (k + 1) + '. ' + f + ': ' + d).join('\n') + '\n\nHere are 24 past cases and what happened:\n'
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

/** the prompt lists exactly the columns the departments hold, in the loader's order */
export const sameColumns = () => JSON.stringify(Object.keys(TEXT.health.fields)) === JSON.stringify(Object.keys(HEALTH_RANGES));

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/contest-2j.mjs');
if (isMain) {
  const [what, domain, batch, file] = process.argv.slice(2), b = Number(batch) - 1;
  if (!['prompt', 'record'].includes(what) || !DOMAINS.includes(domain) || !(b >= 0 && b < 4)) { console.log('usage: node tools/contest-2j.mjs <prompt|record> health <1-4> [reply file]'); process.exit(2); }
  const { ds, raw } = load(domain), prompt = batchPrompt(ds, raw, b), name = 'data/llm/frontier-' + domain + '-' + (b + 1);
  mkdirSync(new URL('data/llm/', ROOT), { recursive: true });
  if (what === 'prompt') { writeFileSync(new URL(name + '.prompt.txt', ROOT), prompt + '\n'); console.log('wrote ' + name + '.prompt.txt · ' + prompt.length + ' chars · ' + sha256Hex(prompt).slice(0, 16)); }
  else {
    const reply = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), calls = readReply(ds, reply, b);
    writeFileSync(new URL(name + '.json', ROOT), JSON.stringify({ kind: 'dex-frontier.frontier-answers', v: 1, domain, batch: b + 1, model: { name: FRONTIER, asked: 'a fresh Claude Code subagent, cold: this prompt only, no tools' }, prompt: sha256Hex(prompt).slice(0, 16), reply, calls }, null, 1) + '\n');
    console.log('recorded ' + calls.filter((c) => c.p !== null).length + ' of 300 readable answers');
  }
}
