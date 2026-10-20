#!/usr/bin/env node
// tools/run-llm.mjs — ask the local contestant both domains, one after the other, unattended: unload every other local
// model first (so the 14B has the memory), then tools/ask-llm.mjs telco, then shop. Resumable: run it again to go on.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { LOCAL } from './contest.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ollama = (path, body) => new Promise((resolve) => {
  const req = http.request({ host: '127.0.0.1', port: 11434, path, method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' } }, (res) => {
    let b = ''; res.setEncoding('utf8'); res.on('data', (d) => { b += d; }); res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(null); } });
  });
  req.on('error', () => resolve(null)); req.end(body ? JSON.stringify(body) : undefined);
});
const ps = await ollama('/api/ps');
if (!ps) { console.log('LOCAL MODEL DOWN — bring up Ollama (localhost:11434); no cloud fallback'); process.exit(2); }
for (const m of ps.models || []) if (m.name !== LOCAL) { console.log('· unloading ' + m.name); await ollama('/api/generate', { model: m.name, keep_alive: 0 }); }
for (const d of ['telco', 'shop']) {
  console.log('· asking ' + d);
  const r = spawnSync(process.execPath, ['tools/ask-llm.mjs', d], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) { console.log('STOPPED · ' + d + ' exited ' + r.status); process.exit(1); }
}
console.log('DONE · both domains asked');
