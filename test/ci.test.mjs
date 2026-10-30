// ci.test.mjs — the CI workflow loads. A plain YAML scalar ends at ': ' and starts a comment at ' #', so a step whose
// name or command holds either makes the whole workflow fail to load and no gate runs (living-seed learned it 2026-10-19).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the CI workflow loads: no plain step name or command holds ": " or " #", and every organ is gated', () => {
  const text = readFileSync(new URL('../.github/workflows/gate.yml', import.meta.url), 'utf8'), lines = text.split('\n');
  const plain = lines.map((l, i) => [i + 1, /^\s*(?:- )?(run|name): (?![|>])(.*)$/.exec(l)]).filter(([, m]) => m && !/^["']/.test(m[2]));
  assert.ok(plain.length > 10);
  for (const [n, m] of plain) assert.ok(!/: | #/.test(m[2]), 'gate.yml line ' + n + ': a plain ' + m[1] + ' holds ": " or " #"');
  for (const k of ['1', '2', '2b', '2c', '2d', '2e', '2f', '2g', '2h', '2i', '2j', '3', '4', '5', '6', '7']) assert.ok(text.includes('node tools/measure-' + k + '.mjs --check'), 'organ ' + k + ' is re-derived in CI');
  for (const step of ['node witness-all.mjs', 'node tools/vendor-check.mjs', 'node tools/words.mjs --check', 'node tools/geo.mjs --check', 'node tools/csp.mjs --check']) assert.ok(text.includes(step), step);
});
