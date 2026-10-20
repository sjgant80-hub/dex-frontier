#!/usr/bin/env node
// tools/vendor-check.mjs — the vendored kernels are living-seed's, byte for byte. vendor/SOURCES.json names the source
// commit and the SHA-256 of every vendored file; this refuses if any file here has drifted from it.
//   node tools/vendor-check.mjs [--write <living-seed checkout>]   (--write: re-read each file from that repo at its HEAD)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileHash } from './order.mjs';

const ROOT = new URL('../', import.meta.url), BASE = 'vendor/living-seed/';
const walk = (dir) => readdirSync(new URL(dir, ROOT)).flatMap((f) => (statSync(new URL(dir + f, ROOT)).isDirectory() ? walk(dir + f + '/') : [dir + f]));
const at = process.argv.indexOf('--write');
if (at > 0) {
  const src = process.argv[at + 1], commit = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const files = Object.fromEntries(walk(BASE).sort().map((p) => {
    const upstream = execFileSync('git', ['-C', src, 'show', commit + ':' + p.slice(BASE.length)]);
    if (fileHash(upstream) !== fileHash(readFileSync(new URL(p, ROOT)))) { console.log('DRIFT · ' + p + ' is not living-seed’s at ' + commit.slice(0, 7)); process.exit(1); }
    return [p, fileHash(upstream)];
  }));
  writeFileSync(new URL('vendor/SOURCES.json', ROOT), JSON.stringify({ source: 'sjgant80-hub/living-seed', commit, files }, null, 1) + '\n');
  console.log('wrote vendor/SOURCES.json · ' + Object.keys(files).length + ' files · living-seed @ ' + commit.slice(0, 7));
} else {
  const s = JSON.parse(readFileSync(new URL('vendor/SOURCES.json', ROOT), 'utf8')), here = walk(BASE).sort();
  const bad = here.filter((p) => s.files[p] !== fileHash(readFileSync(new URL(p, ROOT)))), gone = Object.keys(s.files).filter((p) => !here.includes(p));
  if (bad.length || gone.length) { console.log('VENDOR DRIFT · ' + [...bad, ...gone].join(', ')); process.exit(1); }
  console.log('VENDOR ✓ ' + here.length + ' files are living-seed’s @ ' + s.commit.slice(0, 7) + ', byte for byte');
}
