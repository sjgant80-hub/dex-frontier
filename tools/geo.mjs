#!/usr/bin/env node
// tools/geo.mjs — the AI layer, generated, never hand-written: the JSON-LD (its FAQ is the page's visible FAQ, word for
// word, both made from tools/copy.mjs), llms.txt, robots.txt (the AI crawlers named and welcome), sitemap.xml and the
// README's organ table — all from the records and the sealed rules.   node tools/geo.mjs [--write|--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { records, tally, format } from './words.mjs';
import { faqs } from './copy.mjs';
import { organRows as rows } from './rows.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const URL_ = 'https://sjgant80-hub.github.io/dex-frontier/', REPO = 'https://github.com/sjgant80-hub/dex-frontier';
export const BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'Amazonbot', 'meta-externalagent', 'cohere-ai'];
const pass = (R, k, id) => { const x = R[k] && R[k].v.find((v) => v.id === id); return x ? x.pass : null; };

export const organRows = (R = records()) => rows(R);

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
