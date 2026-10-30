#!/usr/bin/env node
// tools/contest-2k.mjs — organ 2k's frontier rival, defined once and pinned by its seal, as organ 2j's: 1,200 TEST cases
// (400 who dropped out, 800 who did not, seeded), asked in four batches of 300, each batch a fresh cold subagent (Claude
// Opus 5.5) that sees only its prompt: every field named as the file names it and described in the dataset's own words
// (UCI's variable table, data/fresh6-codebook.json, verbatim, with every code's meaning), the same 24 FIT cases, then its
// 300. Each case is one line of values in the order the fields are listed: every column the departments hold between them,
// and nothing else. A long decimal is shown to four significant figures, as in organ 2i's prompts.
//   node tools/contest-2k.mjs prompt dropout <1-4>          → data/llm/frontier-dropout-<batch>.prompt.txt
//   node tools/contest-2k.mjs record dropout <1-4> <reply>  → data/llm/frontier-dropout-<batch>.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { loadDropout, DROPOUT_COLUMNS } from '../src/fresh6.mjs';
import { FRONTIER, parseProbability } from './contest.mjs';
import { shown } from './contest-2i.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const DOMAINS = ['dropout'], BATCH = 300, CASES = { yes: 400, no: 800 };
export const SEEDS = { dropout: [4201, 4202, 4203] };
export const SHOTS = { dropout: [151, 152, 153] };

/** each column's description in UCI's own words, matched to the file's header by name (case aside) */
export function described(codebook = JSON.parse(read('data/fresh6-codebook.json'))) {
  const by = new Map(codebook.variables.map((v) => [v.name.toLowerCase(), v.description]));
  return Object.fromEntries(Object.entries(DROPOUT_COLUMNS).map(([id, [name]]) => [id, name + ' — ' + (by.get(name.toLowerCase()) ?? 'NOT IN THE CODEBOOK')]));
}

export const TEXT = {
  dropout: {
    head: 'You are predicting whether a student drops out of their degree. The data are real records of students of a higher-education institution in Portugal, from their enrolment and from the end of their first two semesters (the UCI dataset Predict Students’ Dropout and Academic Success). The outcome is the student’s status at the end of the course’s normal duration: dropped out, or not (still enrolled, or graduated). Each student is one line of values, in this order; each field is named as the file names it, then described in the dataset’s own words, codes included:',
    yes: 'dropped out', no: 'did not drop out', fields: described(),
  },
};

/** the domain loaded, with each row's fields as the prompt shows them (row i is the loader's row i) */
export function load(domain) {
  const ds = loadDropout(read('data/fresh6/students-dropout.csv'));
  if (!ds.ok) return { ds, raw: [] };
  return { ds, raw: Array.from({ length: ds.n }, (_, i) => Object.fromEntries(Object.keys(TEXT[domain].fields).map((f) => [f, shown(ds.cols[f][i])]))) };
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

/** the 24 FIT cases shown first in every batch: 12 who dropped out, 12 who did not, in a seeded order */
export function examplesOf(ds) {
  const [a, b, c] = SHOTS[ds.name], yes = ds.fitRows.filter((i) => ds.y[i] === 1), no = ds.fitRows.filter((i) => ds.y[i] === 0);
  return draw([...draw(yes, 12, a), ...draw(no, 12, b)], 24, c);
}

export const caseLine = (name, row) => Object.keys(TEXT[name].fields).map((f) => row[f]).join(', ');

/** batch b's prompt: the fields explained in order, the 24 examples, then its 300 cases numbered 1 … 300 */
export function batchPrompt(ds, raw, b) {
  const t = TEXT[ds.name];
  return t.head + '\n' + Object.entries(t.fields).map(([f, d], k) => (k + 1) + '. ' + d).join('\n') + '\n\nHere are 24 past cases and what happened:\n'
    + examplesOf(ds).map((i) => caseLine(ds.name, raw[i]) + ' -> ' + (ds.y[i] ? t.yes : t.no)).join('\n') + '\n\nNow 300 new cases. For each, give the probability from 0 to 100 that the student ' + t.yes + '.\n'
    + batchOf(ds, b).map((i, k) => (k + 1) + '. ' + caseLine(ds.name, raw[i])).join('\n')
    + '\n\nAnswer from this text alone: use no tools and read no files. Reply with exactly 300 lines and nothing else, one per case in order, each "<case number>: <probability>".';
}

/** read a batch's reply: line "n: p" for every case n; a missing or unreadable one is null (scored as a coin) */
export function readReply(ds, reply, b) {
  const got = new Map();
  for (const line of String(reply).split(/\r?\n/)) { const m = /^\s*(\d+)\s*[:.)-]\s*(.+)$/.exec(line); if (m) got.set(Number(m[1]), parseProbability(m[2])); }
  return batchOf(ds, b).map((row, k) => ({ row, p: got.has(k + 1) ? got.get(k + 1) : null }));
}

/** the prompt lists exactly the columns the departments hold, in the loader's order, each found in the codebook */
export const sameColumns = () => JSON.stringify(Object.keys(TEXT.dropout.fields)) === JSON.stringify(Object.keys(DROPOUT_COLUMNS)) && !Object.values(TEXT.dropout.fields).some((d) => d.includes('NOT IN THE CODEBOOK'));

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/contest-2k.mjs');
if (isMain) {
  const [what, domain, batch, file] = process.argv.slice(2), b = Number(batch) - 1;
  if (!['prompt', 'record'].includes(what) || !DOMAINS.includes(domain) || !(b >= 0 && b < 4)) { console.log('usage: node tools/contest-2k.mjs <prompt|record> dropout <1-4> [reply file]'); process.exit(2); }
  const { ds, raw } = load(domain), prompt = batchPrompt(ds, raw, b), name = 'data/llm/frontier-' + domain + '-' + (b + 1);
  mkdirSync(new URL('data/llm/', ROOT), { recursive: true });
  if (what === 'prompt') { writeFileSync(new URL(name + '.prompt.txt', ROOT), prompt + '\n'); console.log('wrote ' + name + '.prompt.txt · ' + prompt.length + ' chars · ' + sha256Hex(prompt).slice(0, 16)); }
  else {
    const reply = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), calls = readReply(ds, reply, b);
    writeFileSync(new URL(name + '.json', ROOT), JSON.stringify({ kind: 'dex-frontier.frontier-answers', v: 1, domain, batch: b + 1, model: { name: FRONTIER, asked: 'a fresh Claude Code subagent, cold: this prompt only, no tools' }, prompt: sha256Hex(prompt).slice(0, 16), reply, calls }, null, 1) + '\n');
    console.log('recorded ' + calls.filter((c) => c.p !== null).length + ' of 300 readable answers');
  }
}
