#!/usr/bin/env node
// tools/ask-llm.mjs — the local contestant: qwen2.5:14b, on this laptop's processor, shown the 24 examples and asked about
// each of a domain's 300 TEST cases, one case per prompt, every column of the domain in view. Temperature 0, seed 7,
// a 4,096-token window (the longest prompt is 3,136 tokens, and every one is recorded), 8 tokens to reply. Writes data/llm/qwen2.5-14b-<domain>.json as
// it goes; resumable (done cases are kept); refuses if the model on this machine is not the one the answers began with.
// Local only — there is no cloud fallback.        node tools/ask-llm.mjs <telco|shop>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import http from 'node:http';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { loadTelco, loadShop } from '../src/silos.mjs';
import { LOCAL, sampleOf, examplesOf, caseLine, promptFor, parseProbability } from './contest.mjs';

export const OPTIONS = { temperature: 0, seed: 7, num_ctx: 4096, num_predict: 8 };
const ROOT = new URL('../', import.meta.url);
const domain = process.argv[2];
if (!['telco', 'shop'].includes(domain)) { console.log('usage: node tools/ask-llm.mjs <telco|shop>'); process.exit(2); }
const ds = domain === 'telco' ? loadTelco(readFileSync(new URL('data/telco-churn.csv', ROOT), 'utf8')) : loadShop(readFileSync(new URL('data/online_shoppers_intention.csv', ROOT), 'utf8'));
const OUT = new URL('data/llm/qwen2.5-14b-' + domain + '.json', ROOT);
const ollama = (path, body) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port: 11434, path, method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' } }, (res) => {
    let b = ''; res.setEncoding('utf8'); res.on('data', (d) => { b += d; }); res.on('end', () => { try { resolve(JSON.parse(b)); } catch { reject(new Error('not JSON from ' + path)); } });
  });
  req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
});

const tags = await ollama('/api/tags').catch(() => null);
if (!tags || !Array.isArray(tags.models)) { console.log('LOCAL MODEL DOWN — bring up Ollama (localhost:11434). Nothing asked; no cloud fallback.'); process.exit(2); }
const m = tags.models.find((x) => x.name === LOCAL);
if (!m) { console.log('MISSING MODEL ' + LOCAL); process.exit(2); }
mkdirSync(new URL('data/llm/', ROOT), { recursive: true });
const doc = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { kind: 'dex-frontier.llm-answers', v: 1, domain, model: { name: LOCAL, digest: m.digest, bytes: m.size }, options: OPTIONS, calls: [] };
if (doc.model.digest !== m.digest) { console.log('REFUSED · the model on this machine is not the one these answers began with'); process.exit(1); }
const done = new Set(doc.calls.map((c) => c.row)), ex = examplesOf(ds);
for (const row of sampleOf(ds)) {
  if (done.has(row)) continue;
  const prompt = promptFor(ds, caseLine(ds, row), ex), t0 = Date.now();
  const r = await ollama('/api/generate', { model: LOCAL, prompt, stream: false, keep_alive: '30m', options: OPTIONS });
  doc.calls.push({ row, prompt: sha256Hex(prompt).slice(0, 16), reply: String(r.response || ''), p: parseProbability(r.response), wallMs: Date.now() - t0, promptTokens: r.prompt_eval_count || 0 });
  writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
  if (doc.calls.length % 25 === 0) console.log(domain + ' · ' + doc.calls.length + ' of 300 asked');
}
console.log('wrote ' + OUT.pathname.split('/').slice(-3).join('/') + ' · ' + doc.calls.length + ' calls');
