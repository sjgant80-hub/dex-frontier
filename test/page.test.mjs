// page.test.mjs — the live page is gated too. Its script imports only names that exist, touches only elements that are on
// the page, links only to anchors that exist; every number and result-dependent sentence in its prose is generated from
// the records (no hand-typed result), its structured data says what its visible FAQ says, and it may connect nowhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render, records, tally } from '../tools/words.mjs';
import { outputs, jsonld } from '../tools/geo.mjs';
import { faqs } from '../tools/copy.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];

test('every name the page imports is exported by the file it names', async () => {
  const imports = [...script.matchAll(/import \{([^}]+)\} from '([^']+)'/g)];
  assert.ok(imports.length >= 7);
  for (const [, names, path] of imports) {
    const mod = await import(new URL('../' + path.replace(/^\.\//, ''), import.meta.url));
    for (const n of names.split(',').map((s) => s.trim()).filter(Boolean)) assert.ok(n in mod, path + ' exports ' + n);
  }
});

test('every element the script reaches for is on the page, and every in-page link has a target', () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const wanted = [...script.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(wanted.length > 20);
  for (const id of wanted) assert.ok(ids.has(id), 'the page has #' + id);
  for (const [, a] of html.matchAll(/href="#([a-z0-9-]+)"/g)) assert.ok(ids.has(a), 'a link to #' + a + ' has a target');
  for (const sec of ['what', 'start', 'try', 'how', 'one', 'compose', 'next', 'fix', 'breed', 'grow', 'wisp', 'scale', 'spread', 'blueprint', 'business', 'paper', 'faq', 'words']) assert.ok(ids.has(sec), 'section ' + sec);
});

test('the page says what the records say: every generated number, word and block is current', () => {
  assert.equal(render(html), html, 'node tools/words.mjs --write has been run since the last record');
  const t = tally();
  assert.ok(html.includes('data-tally="line">' + t.line + '<') && html.includes('data-tally="fails">' + t.fails + '<'), 'the header says what the verdicts say');
  for (const [p, text] of Object.entries(outputs())) assert.equal(read(p), text, p + ' is what tools/geo.mjs generates');
});

test('no result is typed by hand: outside the generated places, the prose holds no AUC-like number', () => {
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!-- w:(\w+) -->[\s\S]*?<!-- \/w:\1 -->/g, '').replace(/<span data-(r|v|tally)="[^"]*">[^<]*<\/span>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
  const loose = [...visible.matchAll(/\b0\.\d{2,}\b/g)].map((m) => m[0]).filter((x) => x !== '0.6');   // 0.6 is the sealed bar, a rule, not a result
  assert.deepEqual(loose, [], 'hand-typed numbers: ' + loose.join(', '));
});

test('the structured data’s FAQ is the visible FAQ, word for word, and both come from one list', () => {
  const R = records(), ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(JSON.stringify(ld), jsonld(R));
  const q = ld['@graph'].find((g) => g['@type'] === 'FAQPage').mainEntity;
  const visible = [...html.matchAll(/<details><summary>([^<]+)<\/summary><p>([^<]+)<\/p><\/details>/g)].map((m) => [m[1], m[2]]);
  const list = faqs(R, { pass: () => null });
  assert.equal(q.length, list.length); assert.ok(q.length >= 10);
  const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  for (const item of q) assert.ok(visible.some(([s, a]) => unesc(s) === item.name && unesc(a) === item.acceptedAnswer.text), 'visible: ' + item.name);
});

test('the page may connect to nothing but its own site, and credits what it stands on', () => {
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /connect-src 'self'/); assert.match(csp, /object-src 'none'/); assert.ok(!/unsafe-eval/.test(csp));
  for (const credit of ['Powered by the Konomi architecture, created by Thomas Frumkin', 'Gary W. Floyd, Lumiea Systems Research Division — ThunderStruck Service LLC', 'AI Native Solutions', 'Apache-2.0', 'CC BY 4.0', 'MIT — no licence fee', 'Kar']) assert.ok(html.includes(credit), credit);
  assert.ok(!/£\s?\d|\$\s?\d|per month|per seat price/i.test(html.replace(/<script[\s\S]*?<\/script>/g, '')), 'no price on a product page');
});

test('the brochure says what is built but not proven, and names the model each cloud route is priced at', () => {
  const R = records();
  const waiting = ['3', '4', '5', '6', '7'].filter((k) => !R[k]);
  if (waiting.length) {
    const row = html.match(/<summary>What is built but not yet proven\?<\/summary><p>([^<]+)<\/p>/);
    assert.ok(row, 'a risk names what is built and not measured while any organ after the gate waits');
    for (const k of waiting) assert.ok(row[1].includes('(organ ' + k + ')'), 'it names organ ' + k);
    assert.match(row[1], /none is sealed or measured/);
  }
  // the frontier route is billed at the basis's frontier model; the page must not let that pass for the model measured
  const basis = JSON.parse(read('vendor/sovereign-enterprise/data/basis.json'));
  const priced = basis.frontier.product.replace(/\s*\(API\)$/, '');
  const measured = ['2j', '2k'].filter((k) => R[k]).map((k) => Object.values(R[k].r).find((d) => d && d.frontier).frontier.model.name);
  if (measured.length && measured.every((m) => m === 'claude-opus-5-5') && priced !== 'Claude Opus 5.5') {
    assert.ok(html.includes('The frontier route is billed at ' + priced + '’s API rates'), 'the priced model is named');
    assert.ok(html.includes('priced at a different model’s rates than the one measured'), 'and said to differ from the one measured');
  }
});
