#!/usr/bin/env node
// tools/contest-fresh.mjs — the frontier rival on the fresh datasets, defined once and pinned by organ 2f's seal: which
// TEST cases it is asked (per domain: 100 that ended in the outcome and 200 that did not, seeded), the 24 FIT cases it is
// shown first, the exact prompt, and how its reply is read. As in organ 2, a frontier model (Claude Opus 5.5) is asked
// cold by a fresh subagent that sees only this prompt, all 300 cases at once. Each case is shown in the dataset's own
// words (job=housemaid, not one indicator column per job): every column the mesh's departments hold between them, in
// the form a reader understands best — an advantage the frontier model is given, and said.
//   node tools/contest-fresh.mjs prompt <bank|adult>          → data/llm/frontier-<domain>.prompt.txt
//   node tools/contest-fresh.mjs record <bank|adult> <reply>  → data/llm/frontier-<domain>.json (its reply, verbatim, read)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { loadBank, loadAdult } from '../src/fresh.mjs';
import { FRONTIER, parseProbability } from './contest.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const SEEDS = { bank: [3301, 3302, 3303], adult: [3401, 3402, 3403] };
export const SHOTS = { bank: [61, 62, 63], adult: [71, 72, 73] };

export const TEXT = {
  bank: {
    head: 'You are predicting whether a bank client, called in a telephone marketing campaign, subscribes to a term deposit. The data are real calls of one Portuguese bank, May 2008 to November 2010 (the UCI Bank Marketing dataset). Each call is described by:',
    yes: 'subscribed', no: 'did not subscribe', fields: {
      age: 'age in years', job: 'type of job', marital: 'marital status ("divorced" includes widowed)', education: 'education', default: 'has credit in default?', housing: 'has a housing loan?', loan: 'has a personal loan?',
      contact: 'how the client was called', month: 'month of the call', day_of_week: 'weekday of the call', campaign: 'calls made to this client in this campaign, this one included',
      pdays: 'days since the client was last called in an earlier campaign (999 = never)', previous: 'calls made to this client before this campaign', poutcome: 'outcome of the earlier campaign',
      'emp.var.rate': 'employment variation rate (quarterly)', 'cons.price.idx': 'consumer price index (monthly)', 'cons.conf.idx': 'consumer confidence index (monthly)', euribor3m: 'euribor 3-month rate (daily)', 'nr.employed': 'people employed in the economy, in thousands (quarterly)',
    },
  },
  adult: {
    head: 'You are predicting whether a person earns more than $50,000 a year. The data are real people from the 1994 US census (the UCI Adult dataset). Each person is described by:',
    yes: 'over $50K', no: '$50K or less', fields: {
      age: 'age in years', workclass: 'kind of employer ("?" = not recorded)', education: 'highest education', 'marital-status': 'marital status', occupation: 'occupation ("?" = not recorded)', relationship: 'place in the household',
      race: 'race', sex: 'sex', 'capital-gain': 'capital gains in dollars', 'capital-loss': 'capital losses in dollars', 'hours-per-week': 'hours worked a week', 'native-country': 'country of birth ("?" = not recorded)',
    },
  },
};
const ADULT_HEAD = ['age', 'workclass', 'fnlwgt', 'education', 'education-num', 'marital-status', 'occupation', 'relationship', 'race', 'sex', 'capital-gain', 'capital-loss', 'hours-per-week', 'native-country', 'income'];

/** the domain loaded, with each row's raw fields in the dataset's own words (row i is the loader's row i) */
export function load(domain) {
  if (domain === 'bank') {
    const text = read('data/bank-additional-full.csv'), lines = text.split(/\r?\n/).filter(Boolean), cells = (l) => l.split(';').map((c) => c.replace(/^"|"$/g, '')), head = cells(lines[0]);
    return { ds: loadBank(text), raw: lines.slice(1).map((l) => { const c = cells(l); return Object.fromEntries(head.map((h, j) => [h, c[j]])); }) };
  }
  const a = read('data/adult.data'), b = read('data/adult.test');
  const rows = (t, skip) => t.split(/\r?\n/).filter((l) => l.trim() && !(skip && l.startsWith('|'))).map((l) => { const c = l.split(',').map((x) => x.trim()); return Object.fromEntries(ADULT_HEAD.map((h, j) => [h, c[j]])); });
  return { ds: loadAdult(a, b), raw: [...rows(a, false), ...rows(b, true)] };
}

function draw(rows, k, seed) {
  const r = rng(seed), xs = rows.slice();
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs.slice(0, k);
}

/** the 300 TEST cases the frontier model is graded on, in one seeded order */
export function sampleOf(ds) {
  const [a, b, c] = SEEDS[ds.name], yes = ds.testRows.filter((i) => ds.y[i] === 1), no = ds.testRows.filter((i) => ds.y[i] === 0);
  return draw([...draw(yes, 100, a), ...draw(no, 200, b)], 300, c);
}

/** the 24 FIT cases shown first: 12 with the outcome, 12 without, in a seeded order */
export function examplesOf(ds) {
  const [a, b, c] = SHOTS[ds.name], yes = ds.fitRows.filter((i) => ds.y[i] === 1), no = ds.fitRows.filter((i) => ds.y[i] === 0);
  return draw([...draw(yes, 12, a), ...draw(no, 12, b)], 24, c);
}

/** one case in the dataset's own words: every field the departments hold, by name */
export const caseLine = (name, row) => Object.keys(TEXT[name].fields).map((f) => f + '=' + row[f]).join(', ');

/** the one prompt: the fields explained, the 24 examples, then the 300 cases numbered 1 … 300 */
export function frontierPrompt(ds, raw) {
  const t = TEXT[ds.name];
  return t.head + '\n' + Object.entries(t.fields).map(([f, d]) => '- ' + f + ': ' + d).join('\n') + '\n\nHere are 24 past cases and what happened:\n'
    + examplesOf(ds).map((i) => caseLine(ds.name, raw[i]) + ' -> ' + (ds.y[i] ? t.yes : t.no)).join('\n') + '\n\nNow 300 new cases. For each, give the probability from 0 to 100 that the answer is ' + t.yes + '.\n'
    + sampleOf(ds).map((i, k) => (k + 1) + '. ' + caseLine(ds.name, raw[i])).join('\n')
    + '\n\nAnswer from this text alone: use no tools and read no files. Reply with exactly 300 lines and nothing else, one per case in order, each "<case number>: <probability>".';
}

/** read the reply: line "n: p" for every case n; a missing or unreadable one is null (scored as a coin) */
export function readReply(ds, reply) {
  const got = new Map();
  for (const line of String(reply).split(/\r?\n/)) { const m = /^\s*(\d+)\s*[:.)-]\s*(.+)$/.exec(line); if (m) got.set(Number(m[1]), parseProbability(m[2])); }
  return sampleOf(ds).map((row, k) => ({ row, p: got.has(k + 1) ? got.get(k + 1) : null }));
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/contest-fresh.mjs');
if (isMain) {
  const [what, domain, file] = process.argv.slice(2);
  if (!['prompt', 'record'].includes(what) || !['bank', 'adult'].includes(domain)) { console.log('usage: node tools/contest-fresh.mjs <prompt|record> <bank|adult> [reply file]'); process.exit(2); }
  const { ds, raw } = load(domain), prompt = frontierPrompt(ds, raw);
  mkdirSync(new URL('data/llm/', ROOT), { recursive: true });
  if (what === 'prompt') { writeFileSync(new URL('data/llm/frontier-' + domain + '.prompt.txt', ROOT), prompt + '\n'); console.log('wrote the ' + domain + ' prompt · ' + prompt.length + ' chars · ' + sha256Hex(prompt).slice(0, 16)); }
  else {
    const reply = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), calls = readReply(ds, reply);
    writeFileSync(new URL('data/llm/frontier-' + domain + '.json', ROOT), JSON.stringify({ kind: 'dex-frontier.frontier-answers', v: 1, domain, model: { name: FRONTIER, asked: 'a fresh Claude Code subagent, cold: this prompt only, no tools' }, prompt: sha256Hex(prompt).slice(0, 16), reply, calls }, null, 1) + '\n');
    console.log('recorded ' + calls.filter((c) => c.p !== null).length + ' of 300 readable answers');
  }
}
