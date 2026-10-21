#!/usr/bin/env node
// page/assemble.mjs — the live page's source: the template (page/dex-page.html), its stylesheet and its module are put
// together into index.html; then tools/words.mjs, tools/geo.mjs and tools/csp.mjs --write fill every generated place
// from the records. Nothing on the page is typed twice.   node page/assemble.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const at = (p) => new URL(p, import.meta.url);
let p = readFileSync(at('dex-page.html'), 'utf8');
const css = readFileSync(at('style.css'), 'utf8').trim(), js = readFileSync(at('dex-module.js'), 'utf8');
p = p.replace('/*STYLE*/', () => css).replace('/*MODULE*/', () => js);   // as functions: a $ in the module is never a pattern
writeFileSync(at('../index.html'), p);
const used = new Set([...p.matchAll(/class="([^"]+)"/g), ...js.matchAll(/class="([^"]+)"/g), ...js.matchAll(/class=\\"([^"\\]+)/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => /^[a-z][a-z0-9-]*$/.test(c)));
const missing = [...used].filter((c) => !new RegExp('\\.' + c + '(?![a-z0-9-])').test(css));
console.log('index.html ' + p.length + ' chars · classes used ' + used.size + ' · not styled: ' + (missing.join(' ') || 'none'));
