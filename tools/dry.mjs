#!/usr/bin/env node
// tools/dry.mjs — an organ's plumbing dry run, before its seal: SYNTHETIC frontier answers to the real batch prompts are
// written into data/llm/ (never committed: run it in a scratch copy or on the runner), then the measurement runs in full
// and every sealed rule reads the record through a strict view that throws on a missing field. It prints only "ran" or
// what is broken (field names, never values), the seconds it took and each batch prompt's size: no number from the
// fresh data is seen, so it cannot steer the seal.
//   node tools/dry.mjs <organ>    e.g. 2i
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';

/** a record that throws on any field a rule reads that is not there — names the field, never its value */
export const strict = (o, path = 'record') => (o && typeof o === 'object' ? new Proxy(o, { get(t, k) {
  if (typeof k === 'symbol' || k in t) { const v = t[k]; return v && typeof v === 'object' ? strict(v, path + '.' + String(k)) : v; }
  throw new Error('missing field ' + path + '.' + String(k));
} }) : o);

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/dry.mjs');
if (isMain) {
  const k = process.argv[2], ROOT = new URL('../', import.meta.url), t0 = Date.now();
  if (!/^[0-9][a-z]?$/.test(k || '') || !existsSync(new URL('tools/contest-' + k + '.mjs', ROOT))) { console.log('usage: node tools/dry.mjs <organ with a tools/contest-<organ>.mjs>'); process.exit(2); }
  if (existsSync(new URL('data/organ-' + k + '/record.json', ROOT))) { console.log('organ ' + k + ' is measured already: a dry run would overwrite nothing, and is not needed'); process.exit(2); }
  const C = await import('./contest-' + k + '.mjs');
  mkdirSync(new URL('data/llm/', ROOT), { recursive: true });
  const sizes = [];
  let bad = 0;
  for (const d of C.DOMAINS) {
    const { ds, raw } = C.load(d);
    if (!ds.ok) { console.log(d + ': the data did not load'); process.exit(1); }
    for (let b = 0; b < 4; b++) {
      const file = new URL('data/llm/frontier-' + d + '-' + (b + 1) + '.json', ROOT);
      if (existsSync(file)) { console.log('real answers are present (' + d + ' batch ' + (b + 1) + '): run the dry run only before they exist'); process.exit(2); }
      const prompt = C.batchPrompt(ds, raw, b), r = rng(5 + b);
      if (prompt.length < 1000 || /undefined|NaN/.test(prompt)) { bad++; console.log(d + ' batch ' + (b + 1) + ': the prompt is malformed'); }
      sizes.push(d + '-' + (b + 1) + ' ' + prompt.length);
      const reply = C.batchOf(ds, b).map((_, j) => (j + 1) + ': ' + Math.round(r() * 100)).join('\n');
      writeFileSync(file, JSON.stringify({ kind: 'dex-frontier.synthetic-answers', v: 1, domain: d, batch: b + 1, model: { name: 'synthetic' }, prompt: sha256Hex(prompt).slice(0, 16), reply, calls: C.readReply(ds, reply, b) }));
    }
    const s = C.sampleOf(ds);
    if (new Set(s).size !== 1200 || !s.every((i) => ds.testRows.includes(i))) { bad++; console.log(d + ': the sample is not 1,200 distinct TEST cases'); }
  }
  const M = await import('./measure-' + k + '.mjs'), J = await import('./judge-' + k + '.mjs');
  const text = JSON.stringify(await M.measure());
  if (/NaN|:null/.test(text)) { bad++; console.log('a NaN or null in the record'); }
  for (const [id, f] of Object.entries(J.RULES)) { try { const v = f(strict(JSON.parse(text))); if (typeof v.pass !== 'boolean' || typeof v.saw !== 'string') { bad++; console.log(id + ': not a verdict'); } } catch (e) { bad++; console.log(id + ': ' + e.message); } }
  const rec = JSON.parse(text);
  for (const d of C.DOMAINS) {
    for (const f of ['testNeverRead', 'tamperRefused', 'ownColumnsOnly']) if (rec[d][f] !== true) { bad++; console.log(d + ': ' + f + ' is not true'); }
    if (!rec[d].frontier.batches.every((b) => b.promptMatches && b.answered === 300)) { bad++; console.log(d + ': the batches do not match their prompts'); }
  }
  console.log('prompt sizes: ' + sizes.join(', '));
  console.log((bad ? 'plumbing broken' : 'ran') + ' · ' + Math.round((Date.now() - t0) / 1000) + ' s');
  process.exit(bad ? 1 : 0);
}
