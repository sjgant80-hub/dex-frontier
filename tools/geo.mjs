#!/usr/bin/env node
// tools/geo.mjs — the AI layer, generated, never hand-written: the JSON-LD (its FAQ is the page's visible FAQ, word for
// word, both made from tools/copy.mjs), llms.txt, robots.txt (the AI crawlers named and welcome), sitemap.xml and the
// README's organ table — all from the records and the sealed rules.   node tools/geo.mjs [--write|--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { records, tally, format } from './words.mjs';
import { faqs } from './copy.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const URL_ = 'https://sjgant80-hub.github.io/dex-frontier/', REPO = 'https://github.com/sjgant80-hub/dex-frontier';
export const BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'Amazonbot', 'meta-externalagent', 'cohere-ai'];
const pass = (R, k, id) => { const x = R[k] && R[k].v.find((v) => v.id === id); return x ? x.pass : null; };
const STATE = (R, k) => (R[k] ? R[k].v.filter((v) => v.pass).length + ' of ' + R[k].v.length + ' sealed rules held' : 'sealed, being measured');

export function organRows(R = records()) {
  const r1 = R['1'] && R['1'].r, r2 = R['2'] && R['2'].r;
  return [
    ['1', 'One specialist body', 'one department’s node against a 14B and a frontier model', STATE(R, '1'), r1 ? 'the 7-column node ' + format(r1.local.vs.a, 3) + ' vs the 14B ' + format(r1.local.vs.b, 3) + ' and the frontier ' + format(r1.frontier.vs.b, 3) + ' on 300 customers' : 'being asked'],
    ['2', 'The composition proof', 'specialists compose into more than the sum, before anything scales', STATE(R, '2'), r2 ? 'composed ' + format(r2.telco.composedAuc, 3) + ' / ' + format(r2.shop.composedAuc, 3) + ' vs best node ' + format(r2.telco.vsBest.b, 3) + ' / ' + format(r2.shop.vsBest.b, 3) + ' vs every record pooled ' + format(r2.telco.monolith.boosted.vs.b, 3) + ' / ' + format(r2.shop.monolith.boosted.vs.b, 3) + ' (telecom / shop)' : 'being asked'],
    ...[['2b', 'The composition fix', 'taken only if organ 2 finds composition does not net: nodes grown to complement', (r) => 'co-grown mesh ' + format(r.telco.coAuc, 3) + ' / ' + format(r.shop.coAuc, 3)],
      ['3', 'Breeding', 'a bred child beats both parents on cases neither saw; the population grows a better mesh', (r) => 'bred mesh ' + format(r.telco.bredMeshAuc, 3) + ' / ' + format(r.shop.bredMeshAuc, 3) + ' vs first ' + format(r.telco.firstMeshAuc, 3) + ' / ' + format(r.shop.firstMeshAuc, 3)],
      ['4', 'Growing by working', 'each node sharpens as its records arrive', (r) => format(r.telco.firstToLast.from, 3) + ' → ' + format(r.telco.firstToLast.to, 3) + ' / ' + format(r.shop.firstToLast.from, 3) + ' → ' + format(r.shop.firstToLast.to, 3)],
      ['5', 'The wisp', 'routing that learns from outcomes; a node gone bad is pruned', (r) => 'after a break, wisp ' + format(r.telco.broken.wispLate, 3) + ' / ' + format(r.shop.broken.wispLate, 3) + ' vs frozen ' + format(r.telco.broken.frozenLate, 3) + ' / ' + format(r.shop.broken.frozenLate, 3)],
      ['6', 'Scale', 'cut finer, more nodes: the composed answer keeps climbing', (r) => 'fine mesh ' + format(r.telco.fineAuc, 3) + ' / ' + format(r.shop.fineAuc, 3) + ' vs pooled ' + format(r.telco.vsMonolith.b, 3) + ' / ' + format(r.shop.vsMonolith.b, 3)],
      ['7', 'Sovereign spread', 'owned by contributors, carried by cards, revocable, scores only', (r) => 'cards round-trip; ' + r.telco.answer.bytes + ' / ' + r.shop.answer.bytes + ' bytes an answer']]
      .map(([k, name, what, said]) => [k, name, what, R[k] ? STATE(R, k) : k === '2b' ? 'not taken unless needed' : 'built; sealed only after organ 2 is judged', R[k] ? said(R[k].r) : '—']),
  ];
}

export function jsonld(R = records()) {
  const t = tally(R);
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'SoftwareApplication', name: 'The Self-Growing DEX Frontier', applicationCategory: 'DeveloperApplication', operatingSystem: 'Any modern browser; Node 20+', url: URL_, codeRepository: REPO, license: 'https://opensource.org/licenses/MIT', isAccessibleForFree: true,
      description: 'Specialist nodes grown from signed seeds on each department’s own records, coupled into one answer; records never shared. The composition proof was sealed before it ran: ' + t.held + ' sealed rules held across ' + t.tests + ' measured organs.',
      provider: { '@type': 'Organization', name: 'AI Native Solutions', url: 'https://www.ai-nativesolutions.com' } },
    { '@type': 'FAQPage', mainEntity: faqs(R, { pass }).map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) },
  ] });
}

export const llms = (R = records()) => ['# The Self-Growing DEX Frontier', '', '> ' + faqs(R, { pass })[0].a, '', 'Live: ' + URL_, 'Code: ' + REPO + ' (MIT, no licence fee)', '',
  '## Organs (sealed before measured; failures kept)', ...organRows(R).map((o) => '- Organ ' + o[0] + ' · ' + o[1] + ': ' + o[2] + '. ' + o[3] + '; ' + o[4] + '.'), '',
  '## Questions', ...faqs(R, { pass }).map((x) => '- ' + x.q + ' ' + x.a), '',
  'Supplier: AI Native Solutions (https://www.ai-nativesolutions.com). Powered by the Konomi architecture, created by Thomas Frumkin.', ''].join('\n');
export const robots = () => ['User-agent: *', 'Allow: /', '', ...BOTS.flatMap((b) => ['User-agent: ' + b, 'Allow: /', '']), 'Sitemap: ' + URL_ + 'sitemap.xml', ''].join('\n');
export const sitemap = () => '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>' + URL_ + '</loc></url>\n  <url><loc>' + URL_ + 'llms.txt</loc></url>\n</urlset>\n';
export const readmeTable = (R = records()) => '| # | Organ | What it had to show | Sealed rules | What happened |\n|---|---|---|---|---|\n' + organRows(R).map((o) => '| ' + o[0] + ' | **' + o[1] + '** | ' + o[2] + ' | ' + o[3] + ' | ' + o[4] + ' |').join('\n');

export function outputs(R = records()) {
  const html = read('index.html').replace(/(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/, '$1' + jsonld(R) + '$2');
  const readme = read('README.md').replace(/(<!-- geo:organs -->)[\s\S]*?(<!-- \/geo:organs -->)/, '$1\n' + readmeTable(R) + '\n$2');
  return { 'index.html': html, 'llms.txt': llms(R), 'robots.txt': robots(), 'sitemap.xml': sitemap(), 'README.md': readme };
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/geo.mjs');
if (isMain) {
  const out = outputs();
  if (process.argv.includes('--write')) { for (const [p, t] of Object.entries(out)) writeFileSync(new URL(p, ROOT), t); console.log('wrote the AI layer: ' + faqs(records(), { pass }).length + ' questions, ' + organRows().length + ' organs'); }
  if (process.argv.includes('--check')) {
    const stale = Object.entries(out).filter(([p, t]) => { try { return read(p) !== t; } catch { return true; } }).map(([p]) => p);
    if (stale.length || !read('README.md').includes('| 2 | **The composition proof**')) { console.log('GEO DRIFT · ' + (stale.join(', ') || 'the README table is missing') + ' — run node tools/geo.mjs --write'); process.exit(1); }
    console.log('GEO ✓ the JSON-LD, llms.txt, robots.txt, sitemap and README table are what the records give');
  }
}
