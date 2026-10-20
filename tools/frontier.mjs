#!/usr/bin/env node
// tools/frontier.mjs — the frontier contestant: a frontier model (Claude Opus 5.5) asked cold by a fresh subagent that
// sees only this prompt — the same columns explained and the same 24 examples the local model saw, then all 300 TEST
// cases of the domain, numbered. It answers them together, so unlike the local model (one case per prompt) it can
// compare cases with each other: an advantage it is given, and said. No tools, no files, no other context.
//   node tools/frontier.mjs prompt <domain>          → data/llm/frontier-<domain>.prompt.txt (what it is handed)
//   node tools/frontier.mjs record <domain> <reply>  → data/llm/frontier-<domain>.json (its reply, verbatim, read)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { loadTelco, loadShop } from '../src/silos.mjs';
import { FRONTIER, TEXT, sampleOf, examplesOf, caseLine, parseProbability } from './contest.mjs';

const ROOT = new URL('../', import.meta.url);
export const load = (domain) => (domain === 'telco' ? loadTelco(readFileSync(new URL('data/telco-churn.csv', ROOT), 'utf8')) : loadShop(readFileSync(new URL('data/online_shoppers_intention.csv', ROOT), 'utf8')));

/** the one prompt: the columns, the 24 examples, then the 300 cases numbered 1 … 300 */
export function frontierPrompt(ds) {
  const t = TEXT[ds.name], ex = examplesOf(ds), rows = sampleOf(ds);
  return t.head + '\n' + ds.features.map((f) => '- ' + f + ': ' + t.features[f]).join('\n') + '\n\nHere are 24 past cases and what happened:\n'
    + ex.map((e) => e.line + ' -> ' + (e.outcome ? t.yes : t.no)).join('\n') + '\n\nNow 300 new cases. For each, give the probability from 0 to 100 that the answer is ' + t.yes + '.\n'
    + rows.map((i, k) => (k + 1) + '. ' + caseLine(ds, i)).join('\n')
    + '\n\nAnswer from this text alone: use no tools and read no files. Reply with exactly 300 lines and nothing else, one per case in order, each "<case number>: <probability>".';
}

/** read the reply: line "n: p" for every case n; a missing or unreadable one is null (scored as a coin) */
export function readReply(ds, reply) {
  const got = new Map();
  for (const line of String(reply).split(/\r?\n/)) { const m = /^\s*(\d+)\s*[:.)-]\s*(.+)$/.exec(line); if (m) got.set(Number(m[1]), parseProbability(m[2])); }
  return sampleOf(ds).map((row, k) => ({ row, p: got.has(k + 1) ? got.get(k + 1) : null }));
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/frontier.mjs');
if (isMain) {
  const [what, domain, file] = process.argv.slice(2);
  if (!['prompt', 'record'].includes(what) || !['telco', 'shop'].includes(domain)) { console.log('usage: node tools/frontier.mjs <prompt|record> <telco|shop> [reply file]'); process.exit(2); }
  const ds = load(domain), prompt = frontierPrompt(ds);
  mkdirSync(new URL('data/llm/', ROOT), { recursive: true });
  if (what === 'prompt') { writeFileSync(new URL('data/llm/frontier-' + domain + '.prompt.txt', ROOT), prompt + '\n'); console.log('wrote the ' + domain + ' prompt · ' + prompt.length + ' chars · ' + sha256Hex(prompt).slice(0, 16)); }
  else {
    const reply = readFileSync(file, 'utf8'), calls = readReply(ds, reply);
    writeFileSync(new URL('data/llm/frontier-' + domain + '.json', ROOT), JSON.stringify({ kind: 'dex-frontier.frontier-answers', v: 1, domain, model: { name: FRONTIER, asked: 'a fresh Claude Code subagent, cold: this prompt only, no tools' }, prompt: sha256Hex(prompt).slice(0, 16), reply, calls }, null, 1) + '\n');
    console.log('recorded ' + calls.filter((c) => c.p !== null).length + ' of 300 readable answers');
  }
}
