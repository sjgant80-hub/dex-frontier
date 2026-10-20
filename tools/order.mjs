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
