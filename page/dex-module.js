
import { loadTelco, loadShop, silo, pooled } from './src/silos.mjs';
import { contributor, sealNode, growNode, scores, advert, route } from './src/node.mjs';
import { couple, coupled, calibrate, randomRoute, shuffled } from './src/compose.mjs';
import { lead } from './src/stats.mjs';
import { boosted } from './vendor/living-seed/src/baseline.mjs';
import { caseOf } from './vendor/living-seed/src/germinate.mjs';
import { auc } from './vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { member, breed } from './src/population.mjs';
import { order, run, breakAt } from './src/wisp.mjs';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const f3 = (x) => (typeof x === 'number' ? x.toFixed(3) : '—'), sg = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(3);
const gb = (x) => Number(x).toLocaleString('en-GB');
const tick = () => new Promise((r) => setTimeout(r, 0));
const get = (p) => fetch(p, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(p + ' ' + r.status); return p.endsWith('.json') ? r.json() : r.text(); });
const S = { ds: {}, seeds: [], grown: {}, mesh: {} };
const SILOS = { telco: ['customer', 'services', 'account'], shop: ['browsing', 'analytics', 'context'] };
const SEED = 1, ROUTE_SEED = 7, SHUFFLE_SEED = 13;

async function canSign() { try { await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign']); return true; } catch { return false; } }

async function boot() {
  if (!(await canSign())) { $('nocrypto').hidden = false; $('b1').innerHTML = '<p class="bad-t">This browser cannot check Ed25519 signatures.</p>'; return; }
  const [telco, shop] = await Promise.all([get('data/telco-churn.csv'), get('data/online_shoppers_intention.csv')]);
  S.ds.telco = loadTelco(telco); S.ds.shop = loadShop(shop);
  for (const d of ['telco', 'shop']) for (const name of SILOS[d]) {
    const view = silo(S.ds[d], name), keys = await contributor(name), g = await sealNode(view, keys, { seed: SEED });
    S.seeds.push({ d, name, view, keys, genome: g });
  }
  $('b1').innerHTML = '<div class="tw"><table><thead><tr><th>Domain</th><th>Silo</th><th>Columns it sees</th><th>Seed</th><th>Contributor’s key</th></tr></thead><tbody>'
    + S.seeds.map((s) => '<tr><td>' + s.d + '</td><td><b>' + esc(s.name) + '</b></td><td class="dim">' + esc(s.view.features.join(', ')) + '</td><td class="num">' + gb(new TextEncoder().encode(s.genome.text).length) + ' bytes</td><td><code>' + esc(s.keys.pub.slice(0, 16)) + '…</code></td></tr>').join('')
    + '</tbody></table></div><details><summary>The account node’s whole seed, as it travels</summary><pre class="mono">' + esc(S.seeds.find((s) => s.name === 'account').genome.text) + '</pre></details>';
  $('b2-go').disabled = false; $('b6-go').disabled = false; $('b7-go').disabled = false;
}

async function growAll() {
  $('b2-go').disabled = true;
  const rows = [], t0 = performance.now();
  for (const s of S.seeds) {
    $('b2-t').textContent = 'growing ' + s.d + ' · ' + s.name + '…'; await tick();
    const n = await growNode(s.genome.text, s.view);
    S.grown[s.d + '/' + s.name] = { ...s, grown: n, advert: advert(n.organism, s.view) };
    rows.push(S.grown[s.d + '/' + s.name]);
    $('b2').innerHTML = table(rows);
  }
  for (const d of ['telco', 'shop']) {
    const ds = S.ds[d], live = rows.filter((r) => r.d === d && r.advert.state === 'live').sort((a, b) => b.advert.gateAuc - a.advert.gateAuc || (a.name < b.name ? -1 : 1));
    const gateY = ds.gateRows.map((i) => ds.y[i]), gateCols = live.map((n) => scores(n.grown.organism, n.view, ds.gateRows));
    S.mesh[d] = { live, gateY, gateCols, c: couple(gateCols, gateY) };
  }
  $('b2-t').textContent = 'grown in ' + Math.round((performance.now() - t0) / 1000) + ' s, here';
  $('b2').innerHTML = table(rows) + ['telco', 'shop'].map((d) => '<p><b>' + d + ' coupling:</b> ' + S.mesh[d].live.map((n, k) => esc(n.name) + ' × ' + S.mesh[d].c.weights[k + 1].toFixed(2)).join(', ') + ' — learned from ' + gb(S.mesh[d].gateY.length) + ' GATE outcomes.</p>').join('') + compareGrown();
  for (const id of ['b3-go', 'b4-go', 'b5-go', 'b8-go']) $(id).disabled = false;
  $('b5-n').innerHTML = rows.filter((r) => r.advert.state === 'live').map((r) => '<option value="' + esc(r.d + '/' + r.name) + '">' + esc(r.d + ' · ' + r.name) + '</option>').join('');
  for (const id of ['b3', 'b4', 'b5']) $(id).innerHTML = '<p class="dim">Ready.</p>';
}
const table = (rows) => '<div class="tw"><table><thead><tr><th>Node</th><th>State</th><th>GATE AUC</th><th>Rules</th></tr></thead><tbody>' + rows.map((r) => '<tr><td>' + esc(r.d + ' · ' + r.name) + '</td><td>' + (r.advert.state === 'live' ? '<span class="chip live">live</span>' : '<span class="chip cut">cut</span>') + '</td><td class="num">' + f3(r.advert.gateAuc) + '</td><td class="num">' + r.advert.rules + '</td></tr>').join('') + '</tbody></table></div>'
  + rows.filter((r) => r.advert.state === 'cut').map((r) => '<p class="dim">' + esc(r.d + ' · ' + r.name) + ' was cut: ' + esc(r.grown.organ.why) + '. It answers nothing.</p>').join('');
function compareGrown() {
  if (!S.rec2) return '';
  const same = ['telco', 'shop'].every((d) => S.rec2[d].nodes.every((n) => { const g = S.grown[d + '/' + n.silo]; return g && g.advert.state === n.state && g.advert.gateAuc === n.gateAuc; }));
  return same ? '<p class="ok-t">✓ Every node grew here exactly as CI’s committed record says: the same state and the same GATE score, node for node.</p>' : '<p class="bad-t">✗ A node grew differently here from CI’s record.</p>';
}

function composedOn(d, rows) {
  const m = S.mesh[d], cols = m.live.map((n) => scores(n.grown.organism, n.view, rows));
  return { cols, composed: rows.map((_, r) => coupled(m.c, cols.map((c) => c[r]))) };
}

function ask() {
  const d = $('b3-d').value, ds = S.ds[d], i = ds.testRows[Math.floor(Math.random() * ds.testRows.length)], x = caseOf(ds, i);
  const ads = Object.values(S.grown).map((g) => ({ ...g.advert, key: g.d + '/' + g.name }));
  const reached = route(ads, x).map((a) => a.key), m = S.mesh[d];
  const lines = Object.values(S.grown).filter((g) => g.d === d).map((g) => {
    const s = scores(g.grown.organism, g.view, [i])[0];
    return '<li><b>' + esc(g.name) + '</b>: ' + (s === null ? '<span class="warn-t">ABSTAIN</span> — ' + esc(g.advert.state === 'cut' ? 'cut at its gate' : 'not reached') : 'score ' + s.toFixed(2) + ' from ' + ((k) => k + (k === 1 ? ' rule' : ' rules'))(g.grown.organ.body.rules.filter((r) => (r.op === '>' ? x[r.feat] > r.v : x[r.feat] <= r.v)).length) + ' that fired') + '</li>';
  });
  const z = coupled(m.c, m.live.map((n) => scores(n.grown.organism, n.view, [i])[0])), p = 1 / (1 + Math.exp(-z));
  const outcome = d === 'telco' ? (ds.y[i] ? 'this customer left' : 'this customer stayed') : (ds.y[i] ? 'this session ended in a purchase' : 'this session did not buy');
  $('b3').innerHTML = '<p>Routed by fit to ' + reached.length + ' live node' + (reached.length === 1 ? '' : 's') + ' (of ' + ads.length + ' across both domains).</p><ul>' + lines.join('') + '</ul><p class="answer">The mesh: <b>' + Math.round(p * 100) + '%</b> ' + (d === 'telco' ? 'likely to leave' : 'likely to buy') + '. What really happened: <b>' + outcome + '</b>.</p>';
}

async function proof() {
  $('b4').innerHTML = '<p class="dim">Re-scoring every test case, and fitting the poured monolith… a few seconds.</p>'; await tick();
  const out = [];
  for (const d of ['telco', 'shop']) {
    const ds = S.ds[d], m = S.mesh[d], y = ds.testRows.map((i) => ds.y[i]), { cols, composed } = composedOn(d, ds.testRows);
    const singles = cols.map((c) => auc(c, y)), bestK = singles.reduce((b, s, k) => (s > singles[b] ? k : b), 0);
    const routed = randomRoute(m.gateCols.map((g) => calibrate(g, m.gateY)), cols, ROUTE_SEED);
    const shamC = couple(m.gateCols, shuffled(m.gateY, SHUFFLE_SEED)), sham = ds.testRows.map((_, r) => coupled(shamC, cols.map((c) => c[r])));
    await tick();
    const P = pooled(ds), boost = boosted(P, P.rows), bS = ds.testRows.map((i) => boost.score(i));
    out.push({ d, composed: auc(composed, y), best: m.live[bestK].name, bestAuc: singles[bestK], route: auc(routed, y), sham: auc(sham, y), boost: auc(bS, y) });
  }
  const rec = S.rec2;
  $('b4').innerHTML = '<div class="tw"><table><thead><tr><th>Domain</th><th>Composed</th><th>Best node</th><th>Random routing</th><th>Shuffled coupling</th><th>Poured monolith</th><th>CI’s record</th></tr></thead><tbody>'
    + out.map((o) => '<tr><td>' + o.d + '</td><td class="num"><b>' + f3(o.composed) + '</b></td><td class="num">' + f3(o.bestAuc) + ' (' + esc(o.best) + ')</td><td class="num">' + f3(o.route) + '</td><td class="num">' + f3(o.sham) + '</td><td class="num">' + f3(o.boost) + '</td><td>'
      + (rec ? (Math.abs(rec[o.d].composedAuc - o.composed) < 5e-7 && Math.abs(rec[o.d].monolith.boosted.vs.b - o.boost) < 5e-7 ? '<span class="ok-t">✓ the same</span>' : '<span class="bad-t">✗ differs</span>') : '<span class="dim">being measured</span>') + '</td></tr>').join('')
    + '</tbody></table></div><p class="dim">AUC on every test case of each domain. The bounds (how sure each lead is) are in organ 2 below.</p>';
}

function unplug() {
  const key = $('b5-n').value, [d] = key.split('/'), ds = S.ds[d], m = S.mesh[d], y = ds.testRows.map((i) => ds.y[i]);
  const keep = m.live.map((n, k) => [n, k]).filter(([n]) => n.d + '/' + n.name !== key);
  if (!keep.length) { $('b5').innerHTML = '<p class="warn-t">That was the domain’s only live node: the mesh abstains on every case. Nothing answers in its name.</p>'; return; }
  const c = couple(keep.map(([, k]) => m.gateCols[k]), m.gateY), cols = keep.map(([n]) => scores(n.grown.organism, n.view, ds.testRows));
  const before = auc(composedOn(d, ds.testRows).composed, y), after = auc(ds.testRows.map((_, r) => coupled(c, cols.map((x) => x[r]))), y);
  $('b5').innerHTML = '<p>Without <b>' + esc(key.split('/')[1]) + '</b>, the ' + d + ' mesh re-learns its coupling from GATE and carries on with ' + keep.length + ' node' + (keep.length === 1 ? '' : 's') + ': test AUC <b>' + f3(after) + '</b>, against ' + f3(before) + ' with it (' + sg(after - before) + '). No other node had to change, and no record moved.</p>';
}

async function tamper() {
  const s = S.seeds.find((x) => x.name === 'account'), text = s.genome.text, at = text.indexOf('auc=') + 6, bad = text.slice(0, at) + (text[at] === '6' ? '7' : '6') + text.slice(at + 1);
  const n = await growNode(bad, s.view);
  $('b6').innerHTML = n.ok ? '<p class="bad-t">✗ It grew — this should not happen.</p>' : '<p class="ok-t">✓ Refused before a line of it was read: ' + esc(n.why) + '. Nothing grew.</p><p class="dim">The changed character: the bar in <code>gate auc=…</code>, one digit.</p>';
}

async function breedTwo() {
  const [d, name] = $('b7-s').value.split('/'), view = silo(S.ds[d], name);
  $('b7-go').disabled = true; $('b7').innerHTML = '<p class="dim">Growing two parents on ' + esc(d + ' · ' + name) + '…</p>'; await tick();
  const parents = [];
  for (const [who, seed] of [[name, 1], [name + '-2', 2]]) { const keys = await contributor(who), g = await sealNode(view, keys, { seed }), n = await growNode(g.text, view); parents.push(member(g, n)); await tick(); }
  const breeder = await contributor(view.name + '-breeder'), tries = [];
  for (let s = 1; s <= 6; s++) { $('b7').innerHTML = '<p class="dim">Breeding, try ' + s + ' of 6…</p>'; await tick(); tries.push([s, await breed(parents[0], parents[1], view, breeder, s)]); }
  $('b7').innerHTML = '<p>Parents on GATE: <b>' + f3(parents[0].gateAuc) + '</b> and <b>' + f3(parents[1].gateAuc) + '</b>. Six breedings, each child the parents’ rules crossed and, half the time, changed once:</p><ul>'
    + tries.map(([s, o]) => '<li>try ' + s + ': ' + (o.born ? '<span class="ok-t">born</span>, GATE ' + f3(o.child.gateAuc) + ', its seal names both parents' : '<span class="warn-t">refused</span>: ' + esc(o.why)) + '</li>').join('') + '</ul>';
  $('b7-go').disabled = false;
}

function breakNode() {
  const d = $('b8-d').value, ds = S.ds[d], m = S.mesh[d], half = Math.floor(ds.testRows.length / 2);
  const stream = d === 'telco' ? order(ds.testRows, 5005) : ds.testRows, cols = m.live.map((n) => scores(n.grown.organism, n.view, stream)), y = stream.map((i) => ds.y[i]);
  const broken = { cols: cols.map((c, k) => (k === 0 ? breakAt(c, half, 55) : c)), y }, gate = { cols: m.gateCols, y: m.gateY };
  const frozen = run(gate, broken, { size: 300 }), wisp = run(gate, broken, { size: 300, learn: true, prune: true });
  const late = (s) => auc(s.slice(half), y.slice(half)), at = wisp.live.findIndex((l, w) => w * 300 >= half && !l.includes(0));
  $('b8').innerHTML = '<p>Half-way through ' + gb(stream.length) + ' test cases, <b>' + esc(m.live[0].name) + '</b> began answering noise.</p><p class="answer">On the rest of the stream: the frozen mesh <b>' + f3(late(frozen.scores)) + '</b>, the wisp <b>' + f3(late(wisp.scores)) + '</b>. ' + (at >= 0 ? 'The wisp cut the broken node in window ' + (at + 1) + ', ' + (at - Math.floor(half / 300)) + ' after the break.' : 'The wisp did not cut it.') + '</p>';
}

function rulesTable(pre, ver) {
  const v = Object.fromEntries(ver.verdicts.map((x) => [x.id, x]));
  return '<div class="tw"><table><thead><tr><th>Rule</th><th>Kind</th><th>What was claimed</th><th>Verdict</th><th>What the record holds</th></tr></thead><tbody>' + pre.rules.map((q) => { const x = v[q.id] || { pass: false, saw: 'no verdict' }; return '<tr><td><b>' + esc(q.id) + '</b></td><td>' + (q.kind === 'prediction' ? '<span class="chip pred">prediction</span>' : '<span class="chip">property</span>') + '</td><td>' + esc(q.claim) + '</td><td>' + (x.pass ? '<span class="chip pass">PASS</span>' : '<span class="chip fail">FAIL</span>') + '</td><td class="dim">' + esc(x.saw) + '</td></tr>'; }).join('') + '</tbody></table></div>';
}

function render1() {
  if (!S.rec1) { $('r1').innerHTML = S.pre1 ? '<details><summary>Organ 1 — the rules sealed before anything was asked</summary>' + rulesTable(S.pre1, { verdicts: [] }) + '</details>' : ''; return; }
  const r = S.rec1;
  $('r1').innerHTML = '<div class="tw"><table><thead><tr><th>Contestant</th><th>Sees</th><th>Size</th><th>AUC on the 300</th><th>The node’s lead (95% lower bound)</th></tr></thead><tbody>'
    + '<tr><td><b>The account node</b></td><td>7 of 20 columns</td><td>' + r.grown.numbers + ' numbers</td><td class="num"><b>' + f3(r.sample.nodeAuc) + '</b></td><td>—</td></tr>'
    + '<tr><td>qwen2.5:14b, 24 examples</td><td>all 20</td><td>' + gb(r.local.model.bytes) + ' bytes of weights</td><td class="num">' + f3(r.local.vs.b) + '</td><td class="num">' + sg(r.local.vs.lead) + ' (' + sg(r.local.vs.low95) + ')</td></tr>'
    + '<tr><td>Claude Opus 5.5, cold</td><td>all 20, all 300 at once</td><td>not published</td><td class="num">' + f3(r.frontier.vs.b) + '</td><td class="num">' + sg(r.frontier.vs.lead) + ' (' + sg(r.frontier.vs.low95) + ')</td></tr>'
    + '</tbody></table></div><p class="dim">On all ' + gb(r.test.cases) + ' test customers the node scores ' + f3(r.test.auc) + '. Its body: ' + r.grown.body.map(esc).join(' · ') + '.</p><details><summary>Organ 1 — sealed rules and verdict</summary>' + rulesTable(S.pre1, S.ver1) + '</details>';
}

function render2() {
  if (!S.rec2) { $('r2').innerHTML = S.pre2 ? '<details><summary>Organ 2 — the rules sealed before a single test case was scored</summary>' + rulesTable(S.pre2, { verdicts: [] }) + '</details>' : ''; return; }
  const r = S.rec2, row = (label, x) => '<tr><td>' + label + '</td><td class="num">' + f3(x.b) + '</td><td class="num">' + sg(x.lead) + '</td><td class="num">' + sg(x.low95) + '</td><td>' + (x.low95 > 0 ? '<span class="chip pass">beats it</span>' : x.low95 > -0.02 ? '<span class="chip">within the noise</span>' : '<span class="chip fail">behind</span>') + '</td></tr>';
  $('r2').innerHTML = ['telco', 'shop'].map((d) => { const x = r[d]; return '<h3>' + (d === 'telco' ? 'Telco customers' : 'Shop sessions') + ': composed AUC <b>' + f3(x.composedAuc) + '</b> on ' + gb(x.cases) + ' test cases</h3>'
    + '<p class="dim">Nodes: ' + x.nodes.map((n) => esc(n.silo) + ' (' + n.state + ', GATE ' + f3(n.gateAuc) + ')').join(' · ') + '. Growth, one node at a time: ' + x.growth.map((g) => g.nodes + ' → ' + f3(g.testAuc)).join(', ') + '.</p>'
    + '<div class="tw"><table><thead><tr><th>Against</th><th>Its AUC</th><th>The mesh’s lead</th><th>95% lower bound</th><th></th></tr></thead><tbody>'
    + row('its best node (' + esc(x.best.node) + ')', x.vsBest) + row('random routing', x.vsRoute) + row('a coupling taught shuffled outcomes', x.vsShuffled)
    + row('the poured monolith: boosted trees, every column pooled (' + gb(x.monolith.boosted.numbers) + ' numbers)', x.monolith.boosted.vs) + row('the poured monolith: logistic regression', x.monolith.logistic.vs)
    + row('qwen2.5:14b, 24 examples, on the 300', x.local.vs) + row('Claude Opus 5.5, cold, on the 300', x.frontier.vs)
    + '</tbody></table></div><p class="dim">The mesh carries ' + gb(x.meshNumbers) + ' numbers in all, its coupling included.</p>'; }).join('')
    + '<details><summary>Organ 2 — sealed rules and verdict</summary>' + rulesTable(S.pre2, S.ver2) + '</details>';
}

const T = (head, rows) => '<div class="tw"><table><thead><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
const both = (f) => ['telco', 'shop'].map((d) => [d === 'telco' ? 'Telco' : 'Shop', ...f(d)]);
const LB = (x) => f3(x.a) + ' vs ' + f3(x.b) + ' (bound ' + sg(x.low95) + ')';
const fresh = (f) => ['bank', 'adult'].map((d) => [d === 'bank' ? 'Bank calls' : 'Census people', ...f(d)]);
const fresh2 = (f) => ['hospital', 'credit'].map((d) => [d === 'hospital' ? 'Hospital stays' : 'Credit clients', ...f(d)]);
const fresh3 = (f) => ['coupon', 'cover'].map((d) => [d === 'coupon' ? 'Coupon offers' : 'Forest cells', ...f(d)]);
const fresh4 = (f) => ['hotel', 'news'].map((d) => [d === 'hotel' ? 'Hotel bookings' : 'News articles', ...f(d)]);
const fresh5 = (f) => ['health'].map((d) => ['Health survey answers', ...f(d)]);
const fresh6 = (f) => ['dropout'].map((d) => ['Students', ...f(d)]);
const dept = (name) => esc(name.split('-').slice(1).join('-'));
const LATER = {
  '2b': (r) => T(['Domain', 'Organ 2’s mesh (A)', 'Non-negative coupling (B)', 'The fix (C)', 'Best single node', 'C against the best node', 'C against every record pooled'], both((d) => [f3(r[d].A.auc), f3(r[d].B.auc) + (r[d].B.silenced.length ? ' (silenced: ' + r[d].B.silenced.map(esc).join(', ') + ')' : ''), '<b>' + f3(r[d].C.auc) + '</b> (' + r[d].C.mesh.map(esc).join(', ') + ')', f3(r[d].best.testAuc) + ' (' + esc(r[d].best.node) + ')', LB(r[d].C.vsBest), LB(r[d].C.vsMonolith)])) + '<p class="dim">' + ['telco', 'shop'].map((d) => r[d].steps.map((s) => esc(s.silo) + ': ' + s.how + (s.how === 'co-grown' ? (s.addsOnGate === null ? ', cut at its own gate' : ', adds ' + f3(s.addsOnGate) + ' on GATE') + ', ' + (s.joined ? 'joined' : 'stayed out') : '')).join(' · ')).join(' | ') + '</p>',
  '2c': (r) => T(['Domain', 'Mesh', 'Mesh AUC', 'Best single node', 'Against the best', 'Against every record pooled'], both((d) => [r[d].mesh.map(esc).join(', '), '<b>' + f3(r[d].auc) + '</b>', f3(r[d].best.testAuc) + ' (' + esc(r[d].best.node) + ')', LB(r[d].vsBest), LB(r[d].vsMonolith)])),
  '2d': (r) => T(['Domain', 'Trees over the scores', 'Best single node', 'Linear (organ 2)', 'Against the best', 'Against every record pooled', 'Sham (shuffled)'], both((d) => ['<b>' + f3(r[d].auc) + '</b>', f3(r[d].best.testAuc), f3(r[d].linear), LB(r[d].vsBest), LB(r[d].vsMonolith), f3(r[d].sham)])),
  '2e': (r) => T(['Domain', 'Out of fold on GATE (linear / trees)', 'Chosen', 'Mesh AUC', 'Against the best node', 'Against every record pooled'], both((d) => [r[d].outOfFold.map((o) => f3(o.gateAuc)).join(' / '), esc(r[d].chosen), '<b>' + f3(r[d].auc) + '</b>', LB(r[d].vsBest), LB(r[d].vsMonolith)])),
  '2f': (r) => T(['Domain', 'Departments (body fielded, GATE AUC)', 'Coupling', 'Mesh', 'Against the best department', 'Against the frontier model (300)', 'As departments join', 'Against every record pooled'], fresh((d) => [r[d].departments.map((x) => esc(x.department.split('-')[1]) + ' ' + (x.fielded === 'deep' ? 'deep' : 'six-rule') + ' ' + f3(x.gateAuc) + (x.state === 'cut' ? ' (cut)' : '')).join(', '), esc(r[d].chosen), '<b>' + f3(r[d].composedAuc) + '</b>', LB(r[d].vsBest) + ' (' + esc(r[d].best.department.split('-')[1]) + ')', LB(r[d].frontier.vs), r[d].growth.map((g) => f3(g.testAuc)).join(' → '), LB(r[d].monolith.boosted)]))
    + '<p class="dim">For the record only (their test cases are not fresh, and no rule reads them): telco ' + f3(r.notFresh.telco.composedAuc) + ' against its best department ' + f3(r.notFresh.telco.best.testAuc) + ', the frontier ' + f3(r.notFresh.telco.frontier.vs.b) + ' on its 300 (mesh ' + f3(r.notFresh.telco.frontier.vs.a) + ') and every record pooled ' + f3(r.notFresh.telco.monolith.boosted.b) + '; the shop ' + f3(r.notFresh.shop.composedAuc) + ', ' + f3(r.notFresh.shop.best.testAuc) + ', ' + f3(r.notFresh.shop.frontier.vs.b) + ' (mesh ' + f3(r.notFresh.shop.frontier.vs.a) + ') and ' + f3(r.notFresh.shop.monolith.boosted.b) + '.</p>',
  '2g': (r) => T(['Domain', 'Departments (body fielded, GATE AUC)', 'Coupling', 'Mesh', 'Against the best department', 'Against the frontier model (1,200)', 'As departments join', 'Full mesh against its first department', 'Against every record pooled'], fresh2((d) => [r[d].departments.map((x) => esc(x.department.split('-').slice(1).join('-')) + ' ' + esc(x.fielded) + ' ' + f3(x.gateAuc) + (x.state === 'cut' ? ' (cut)' : '')).join(', '), esc(r[d].chosen), '<b>' + f3(r[d].composedAuc) + '</b>', r[d].live.length ? LB(r[d].vsBest) + ' (' + esc(r[d].best.department.split('-').slice(1).join('-')) + ')' : 'no department live: the mesh abstained', LB(r[d].frontier.vs), r[d].growth.map((g) => f3(g.testAuc)).join(' → ') || '—', LB(r[d].fullVsFirst), LB(r[d].monolith.boosted)]))
    + '<p class="dim">On the same 1,200 cases the pooled model against the frontier model: ' + ['hospital', 'credit'].map((d) => (d === 'hospital' ? 'hospital ' : 'credit ') + LB(r[d].frontier.pooledVs)).join('; ') + '.</p>',
  '2h': (r) => T(['Domain', 'Departments (body fielded, GATE AUC, its bound over a coin)', 'Coupling', 'Mesh', 'Against the best department', 'Against the frontier model (1,200)', 'As departments join', 'Full mesh against its first department', 'Against every record pooled'], fresh3((d) => [r[d].departments.map((x) => esc(x.department.split('-').slice(1).join('-')) + ' ' + esc(x.fielded) + ' ' + f3(x.gateAuc) + ' (' + sg(x.joinBound) + ')' + (x.state === 'cut' ? ' cut' : '')).join(', '), esc(r[d].chosen), '<b>' + f3(r[d].composedAuc) + '</b>', r[d].live.length ? LB(r[d].vsBest) + ' (' + esc(r[d].best.department.split('-').slice(1).join('-')) + ')' : 'no department joined: the mesh abstained', LB(r[d].frontier.vs), r[d].growth.map((g) => f3(g.testAuc)).join(' → ') || '—', LB(r[d].fullVsFirst), LB(r[d].monolith.boosted)]))
    + '<p class="dim">On the same 1,200 cases the pooled model against the frontier model: ' + ['coupon', 'cover'].map((d) => (d === 'coupon' ? 'coupon ' : 'forest ') + LB(r[d].frontier.pooledVs)).join('; ') + '.</p>',
  '2i': (r) => T(['Domain', 'The relay (department ← how many scores it was sent: body fielded, its relayed GATE AUC)', 'Coupling', 'Mesh', 'Against the best department alone', 'Against the same departments alone, one score each', 'Against the frontier model (1,200)', 'As departments join', 'Full mesh against its first department', 'Against every record pooled'], fresh4((d) => [r[d].relay.map((x) => dept(x.department) + (x.took.length ? ' ← ' + x.took.length : '') + ': ' + esc(x.fielded) + ' ' + f3(x.relayedGateAuc)).join(', ') + (r[d].departments.some((x) => x.state === 'cut') ? '; cut: ' + r[d].departments.filter((x) => x.state === 'cut').map((x) => dept(x.department)).join(', ') : ''), esc(r[d].chosen), '<b>' + f3(r[d].composedAuc) + '</b>', r[d].live.length ? LB(r[d].vsBest) + ' (' + dept(r[d].best.department) + ')' : 'no department joined: the mesh abstained', LB(r[d].vsOneScore), LB(r[d].frontier.vs), r[d].growth.map((g) => f3(g.testAuc)).join(' → ') || '—', LB(r[d].fullVsFirst), LB(r[d].monolith.boosted)]))
    + '<p class="dim">On the same 1,200 cases the pooled model against the frontier model: ' + ['hotel', 'news'].map((d) => d + ' ' + LB(r[d].frontier.pooledVs)).join('; ') + '.</p>',
  '2j': (r) => T(['Domain', 'Offered in turn (department ← how many scores it was sent: body fielded; GATE out of fold without → with it, its bound)', 'Coupling', 'Mesh', 'Against the best department alone', 'Against the same departments alone, one score each', 'Against the frontier model (1,200)', 'As departments join', 'Full mesh against its first department', 'Against every record pooled'], fresh5((d) => [r[d].steps.map((x) => dept(x.department) + (x.took.length ? ' ← ' + x.took.length : '') + ': ' + esc(x.fielded) + '; ' + f3(x.before) + ' → ' + (x.with === null ? '—' : f3(x.with)) + ' (bound ' + (x.bound === null ? '—' : sg(x.bound)) + ') <b>' + (x.joins ? 'joined' : 'refused') + '</b>').join(', ') + (r[d].departments.some((x) => x.state === 'cut') ? '; not offered: ' + r[d].departments.filter((x) => x.state === 'cut').map((x) => dept(x.department)).join(', ') : ''), esc(r[d].chosen), '<b>' + f3(r[d].composedAuc) + '</b>', r[d].admitted.length ? LB(r[d].vsBest) + ' (' + dept(r[d].best.department) + ')' : 'no department joined: the mesh abstained', LB(r[d].vsOneScore), LB(r[d].frontier.vs), r[d].growth.map((g) => f3(g.testAuc)).join(' → ') || '—', LB(r[d].fullVsFirst), LB(r[d].monolith.boosted)]))
    + '<p class="dim">On the same 1,200 cases the pooled model against the frontier model: ' + LB(r.health.frontier.pooledVs) + '. Recorded beside the rule and not sealed, organ 2i’s rule here (every offered department joined, the same relay order): ' + (r.health.asIn2i.growth.map((g) => f3(g.testAuc)).join(' → ') || '—') + '; the mesh against it ' + LB(r.health.asIn2i.vs) + '.</p>',
  '2k': (r) => LATER['2j']({ health: r.dropout }).replace('<td>Health survey answers</td>', '<td>Students</td>'),
  3: (r) => T(['Domain', 'Children born / refused', 'Bred mesh', 'The founders’ mesh (coupled as organ 2e chose)', 'The bred mesh’s lead', 'Coupling chosen on GATE'], both((d) => [r[d].silos.reduce((a, s) => a + s.born, 0) + ' / ' + r[d].silos.reduce((a, s) => a + s.refused, 0), '<b>' + f3(r[d].bredMeshAuc) + '</b>', f3(r[d].firstMeshAuc), sg(r[d].vsFirst.lead) + ' (bound ' + sg(r[d].vsFirst.low95) + ')', r[d].chosen ? esc(r[d].chosen.bred) + ' / ' + esc(r[d].chosen.first) : ''])) + '<p class="dim">GATE best, generation by generation: ' + ['telco', 'shop'].map((d) => r[d].silos.map((s) => esc(s.silo) + ' ' + s.gateHistory.map(f3).join(' → ')).join('; ')).join(' | ') + '</p>',
  4: (r) => T(['Domain', 'Records seen → mesh TEST AUC, step by step'], both((d) => [r[d].steps.map((s) => gb(s.rowsSeen) + ' → <b>' + f3(s.testAuc) + '</b>').join(' · ')])),
  5: (r) => T(['Domain', 'No break: frozen / learning (second half)', 'After the break: frozen / the wisp', 'Broken node', 'Pruned'], both((d) => [f3(r[d].calm.frozenLate) + ' / ' + f3(r[d].calm.learningLate), f3(r[d].broken.frozenLate) + ' / <b>' + f3(r[d].broken.wispLate) + '</b>', esc(r[d].brokenNode), r[d].broken.prunedInWindow ? 'window ' + r[d].broken.prunedInWindow + ' (' + r[d].broken.windowsAfterBreak + ' after the break)' : 'never'])),
  6: (r) => T(['Domain', 'Fine nodes live', 'As they join (TEST AUC)', 'Fine mesh', 'Coarse mesh', 'vs every record pooled'], both((d) => [r[d].live.length + ' of ' + r[d].fine.length, r[d].curve.map((c) => f3(c.testAuc)).join(' → '), '<b>' + f3(r[d].fineAuc) + '</b>', f3(r[d].coarseAuc), LB(r[d].vsMonolith)])),
  7: (r) => T(['Domain', 'Cards out and back', 'The ledger (share of the mesh)', 'Revoked: TEST AUC without each', 'One answer'], both((d) => [r[d].cards.every((c) => c.roundTrip && c.sameOrganism) ? '✓ every node, identical' : '✗', r[d].ledger.map((x) => esc(x.node) + ' ' + Math.round(x.share * 100) + '%').join(', '), r[d].revoked.map((x) => esc(x.node) + ' ' + f3(x.testAuc)).join(', '), r[d].answer.numbers + ' scores, ' + r[d].answer.bytes + ' bytes'])),
};

/** whether a measured organ won the gate */
const WON = () => ['2f', '2g', '2h', '2i', '2j', '2k'].some((k) => S['ver' + k] && S['ver' + k].verdicts.some((v) => v.id === 'GATE' && v.pass));
/** whether organ 2j's pass was repeated, unchanged, in organ 2k */
const REP = () => ['2j', '2k'].every((k) => S['ver' + k] && S['ver' + k].verdicts.some((v) => v.id === 'GATE' && v.pass));
async function records() {
  const st = await get('data/organs.json').catch(() => ({}));
  for (const k of ['1', '2', '2b', '2c', '2d', '2e', '2f', '2g', '2h', '2i', '2j', '2k', '3', '4', '5', '6', '7']) {
    S['pre' + k] = st[k] ? await get('data/organ-' + k + '/prereg.json').catch(() => null) : null;
    if (st[k] === 'measured') { S['rec' + k] = await get('data/organ-' + k + '/record.json').catch(() => null); S['ver' + k] = await get('data/organ-' + k + '/verdict.json').catch(() => null); }
  }
  render1(); render2();
  for (const k of ['2b', '2c', '2d', '2e', '2f', '2g', '2h', '2i', '2j', '2k', '3', '4', '5', '6', '7']) {
    const el = $('r' + k);
    if (S['rec' + k] && S['ver' + k]) el.innerHTML = LATER[k](S['rec' + k]) + '<details><summary>Organ ' + k + ' — sealed rules and verdict</summary>' + rulesTable(S['pre' + k], S['ver' + k]) + '</details>';
    else if (S['pre' + k]) el.innerHTML = '<details><summary>Organ ' + k + ' — the rules sealed before it was measured</summary>' + rulesTable(S['pre' + k], { verdicts: [] }) + '</details>';
    else el.innerHTML = '<p class="dim">' + (/^2[f-k]$/.test(k) ? 'Sealed before it was measured: the verdict fills in from the record.' : /^2[b-e]$/.test(k) ? 'Not taken: it runs only if the attempt before it finds that composition does not net.' : (REP() ? 'Built, and next: the gate has held on two fresh domains by one mechanism (organs 2j and 2k), so the organs below it are sealed one at a time in the spec’s order, organ 3 first.' : WON() && S.ver2k ? 'Built and held: the gate held in organ 2j but not again in organ 2k, so the organs below it stay held.' : WON() ? 'Built, and waiting: the gate held once, in organ 2j, on one fresh domain. The organs below it are sealed one at a time in the spec’s order, organ 3 first, once that pass is repeated on a second fresh domain.' : 'Built and held: by the spec’s order it is sealed only once composition wins the gate.')) + '</p>';
  }
  const names = { '2b': 'Composition fix: no node counted against its evidence; co-growth', '2c': 'Composition fix: co-growth coupled as the mesh is', '2d': 'Composition fix: a nonlinear coupling', '2e': 'Composition fix: the mesh chooses its coupling', '2f': 'The gate retaken in full, on fresh cases: all three tests at once', '2g': 'The gate taken again, its measurement fixed, on two more fresh datasets', '2h': 'The gate taken again, the join rule fixed, on two more fresh datasets', '2i': 'The gate taken again, with a relay, on two more fresh datasets', '2j': 'The gate taken again, the mesh growing only by what beats the noise, on one more fresh dataset', '2k': 'The gate’s pass repeated: organ 2j’s mechanism, unchanged, on a second fresh dataset', 3: 'Breeding: a bred child must beat both parents on cases neither saw', 4: 'Self-growing: each node sharpens as real work arrives', 5: 'Routing that learns from outcomes', 6: 'Scale: more silos, more nodes, the composed score climbing', 7: 'Sovereign spread: each node owned by its contributor, carried by cards' };
  const state = (k) => (st[k] === 'measured' && S['ver' + k] ? S['ver' + k].verdicts.filter((v) => v.pass).length + ' of ' + S['ver' + k].verdicts.length + ' sealed rules held' : st[k] === 'sealed' ? 'sealed, being measured' : REP() ? 'built; sealed next, one at a time in order' : WON() && S.ver2k ? 'built and held: the gate’s pass was not repeated' : WON() ? 'built; waits until the gate’s pass is repeated on a second fresh domain' : 'built and held until composition wins the gate');
  $('r-next').innerHTML = T(['Organ', 'What it must show', 'State'], ['2b', '2c', '2d', '2e', '2f', '2g', '2h', '2i', '2j', '2k', '3', '4', '5', '6', '7'].map((k) => ['<a href="#' + { '2b': 'fix', '2c': 'fix', '2d': 'fix', '2e': 'fix', '2f': 'retake', '2g': 'retake2', '2h': 'retake3', '2i': 'retake4', '2j': 'retake5', '2k': 'retake6', 3: 'breed', 4: 'grow', 5: 'wisp', 6: 'scale', 7: 'spread' }[k] + '">' + k + '</a>', names[k], esc(state(k))]));
}

$('b2-go').addEventListener('click', growAll);
$('b3-go').addEventListener('click', ask);
$('b4-go').addEventListener('click', proof);
$('b5-go').addEventListener('click', unplug);
$('b6-go').addEventListener('click', tamper);
$('b7-go').addEventListener('click', breedTwo);
$('b8-go').addEventListener('click', breakNode);
records().catch(() => {});
boot().catch((e) => { $('b1').innerHTML = '<p class="bad-t">The page could not load its data: ' + esc(e.message) + '</p>'; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
