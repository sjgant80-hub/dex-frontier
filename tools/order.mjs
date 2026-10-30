#!/usr/bin/env node
// tools/order.mjs — proves from git that an organ was sealed before it was measured, on the very code the seal pinned:
// the last commit to touch the seal must be a strict ancestor of the commit that first added each later file, and every
// pinned file must be byte-identical in that commit. The same proof as living-seed's tools/order.mjs, on this repo's paths.
//   node tools/order.mjs --organ <n>   → ORDER ✓ or ✗ (exit 1)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { sha256Bytes, toHexStr } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';

export const fileHash = (bytes) => toHexStr(sha256Bytes(bytes));
const ROOT = new URL('../', import.meta.url);
const run = { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 };
const git = (...a) => execFileSync('git', a, { ...run, encoding: 'utf8' });
const commits = (opts, path) => git('log', ...opts, '--format=%H', '--', path).trim().split('\n').filter(Boolean);

export const ORGANS = {
  1: { seal: 'data/organ-1/prereg.json', later: ['data/llm/qwen2.5-14b-telco.json', 'data/llm/frontier-telco.json', 'data/organ-1/record.json'] },
  2: { seal: 'data/organ-2/prereg.json', later: ['data/llm/qwen2.5-14b-telco.json', 'data/llm/qwen2.5-14b-shop.json', 'data/llm/frontier-telco.json', 'data/llm/frontier-shop.json', 'data/organ-2/record.json'] },
  '2b': { seal: 'data/organ-2b/prereg.json', later: ['data/organ-2b/record.json'] },
  '2c': { seal: 'data/organ-2c/prereg.json', later: ['data/organ-2c/record.json'] },
  '2d': { seal: 'data/organ-2d/prereg.json', later: ['data/organ-2d/record.json'] },
  '2e': { seal: 'data/organ-2e/prereg.json', later: ['data/organ-2e/record.json'] },
  '2f': { seal: 'data/organ-2f/prereg.json', later: ['data/llm/frontier-bank.json', 'data/llm/frontier-adult.json', 'data/organ-2f/record.json'] },
  '2g': { seal: 'data/organ-2g/prereg.json', later: ['data/llm/frontier-hospital-1.json', 'data/llm/frontier-hospital-2.json', 'data/llm/frontier-hospital-3.json', 'data/llm/frontier-hospital-4.json', 'data/llm/frontier-credit-1.json', 'data/llm/frontier-credit-2.json', 'data/llm/frontier-credit-3.json', 'data/llm/frontier-credit-4.json', 'data/organ-2g/record.json'] },
  '2h': { seal: 'data/organ-2h/prereg.json', later: ['data/llm/frontier-coupon-1.json', 'data/llm/frontier-coupon-2.json', 'data/llm/frontier-coupon-3.json', 'data/llm/frontier-coupon-4.json', 'data/llm/frontier-cover-1.json', 'data/llm/frontier-cover-2.json', 'data/llm/frontier-cover-3.json', 'data/llm/frontier-cover-4.json', 'data/organ-2h/record.json'] },
  '2i': { seal: 'data/organ-2i/prereg.json', later: ['data/llm/frontier-hotel-1.json', 'data/llm/frontier-hotel-2.json', 'data/llm/frontier-hotel-3.json', 'data/llm/frontier-hotel-4.json', 'data/llm/frontier-news-1.json', 'data/llm/frontier-news-2.json', 'data/llm/frontier-news-3.json', 'data/llm/frontier-news-4.json', 'data/organ-2i/record.json'] },
  '2j': { seal: 'data/organ-2j/prereg.json', later: ['data/llm/frontier-health-1.json', 'data/llm/frontier-health-2.json', 'data/llm/frontier-health-3.json', 'data/llm/frontier-health-4.json', 'data/organ-2j/record.json'] },
  3: { seal: 'data/organ-3/prereg.json', later: ['data/organ-3/record.json'] },
  4: { seal: 'data/organ-4/prereg.json', later: ['data/organ-4/record.json'] },
  5: { seal: 'data/organ-5/prereg.json', later: ['data/organ-5/record.json'] },
  6: { seal: 'data/organ-6/prereg.json', later: ['data/organ-6/record.json'] },
  7: { seal: 'data/organ-7/prereg.json', later: ['data/organ-7/record.json'] },
};

/** → { ok, why } */
export function order(prereg, sealPath, later) {
  const seal = commits(['-1'], sealPath)[0];
  if (!seal) return { ok: false, why: 'the seal is not committed' };
  for (const path of later) {
    const record = commits(['--diff-filter=A'], path).pop();
    if (!record) return { ok: false, why: path + ' is not committed' };
    if (seal === record) return { ok: false, why: 'the seal and ' + path + ' came in the same commit' };
    try { git('merge-base', '--is-ancestor', seal, record); } catch { return { ok: false, why: 'the seal as it stands was not committed before ' + path }; }
    for (const [p, hash] of Object.entries(prereg.files)) {
      let bytes;
      try { bytes = execFileSync('git', ['show', record + ':' + p], run); } catch { return { ok: false, why: p + ' is missing from the commit that added ' + path }; }
      if (fileHash(bytes) !== hash) return { ok: false, why: p + ' changed between the seal and ' + path };
    }
  }
  return { ok: true, why: 'sealed in ' + seal.slice(0, 7) + ', then ' + later.map((p) => p.split('/').pop() + ' in ' + commits(['--diff-filter=A'], p).pop().slice(0, 7)).join(', ') + ' — on the ' + Object.keys(prereg.files).length + ' files it pinned, byte for byte' };
}

/** seal: pin every file's bytes, refusing a carriage return (Windows and Linux must hash the same bytes) */
export function pin(paths) {
  return Object.fromEntries(paths.map((p) => {
    const bytes = readFileSync(new URL(p, ROOT));
    if (bytes.includes(13)) throw new Error(p + ' holds a carriage return');
    return [p, fileHash(bytes)];
  }));
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/order.mjs');
if (isMain) {
  const at = process.argv.indexOf('--organ'), o = ORGANS[at > 0 ? process.argv[at + 1] : ''];
  if (!o) { console.log('ORDER ✗ no such organ'); process.exit(1); }
  const h = order(JSON.parse(readFileSync(new URL(o.seal, ROOT), 'utf8')), o.seal, o.later);
  console.log((h.ok ? 'ORDER ✓ ' : 'ORDER ✗ ') + h.why);
  process.exit(h.ok ? 0 : 1);
}
