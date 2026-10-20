// src/xls.mjs — read the first sheet of an Excel 97–2003 workbook (.xls: an OLE2 compound file holding a BIFF8 stream),
// so a dataset published only in that form can be read byte for byte from the file its publisher ships, with nothing
// installed. Numbers, shared strings and plain labels; formats, styles and formulas' text are ignored (a formula keeps
// its cached number). Pure and total: a file it cannot read is refused with its reason, never thrown.
//   readXls(bytes) → { ok, rows: [[cell, …], …] } (a cell is a number, a string, or undefined) | { ok: false, error }

const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const f64 = (b, o) => new DataView(b.buffer, b.byteOffset + o, 8).getFloat64(0, true);
const END = 0xfffffffe, FREE = 0xffffffff;

/** the streams of an OLE2 compound file, by name → bytes */
function streams(b) {
  if (!(b instanceof Uint8Array) || b.length < 512 || u32(b, 0) !== 0xe011cfd0 || u32(b, 4) !== 0xe11ab1a1) return { error: 'not an OLE2 compound file' };
  const size = 1 << u16(b, 0x1e), sector = (s) => 512 + s * size;
  const difat = [];
  for (let k = 0; k < 109; k++) { const s = u32(b, 0x4c + 4 * k); if (s < END) difat.push(s); }
  for (let s = u32(b, 0x44), guard = 0; s < END && guard < 1 << 16; guard++) { const o = sector(s); for (let k = 0; k < size / 4 - 1; k++) { const v = u32(b, o + 4 * k); if (v < END) difat.push(v); } s = u32(b, o + size - 4); }
  const fat = [];
  for (const s of difat) { const o = sector(s); if (o + size > b.length) return { error: 'a FAT sector lies past the end of the file' }; for (let k = 0; k < size / 4; k++) fat.push(u32(b, o + 4 * k)); }
  const chain = (start, limit) => {
    const out = [];
    for (let s = start; s < END && s !== FREE; s = fat[s]) { if (s >= fat.length || out.length > limit) return null; out.push(s); }
    return out;
  };
  const read = (start, length) => {
    const ss = chain(start, Math.ceil(length / size) + 1);
    if (!ss) return null;
    const out = new Uint8Array(ss.length * size);
    ss.forEach((s, k) => out.set(b.subarray(sector(s), sector(s) + size), k * size));
    return out.subarray(0, length);
  };
  const dirChain = chain(u32(b, 0x30), fat.length);
  if (!dirChain) return { error: 'the directory chain is broken' };
  const out = {};
  for (const s of dirChain) {
    for (let e = 0; e < size / 128; e++) {
      const o = sector(s) + e * 128, len = u16(b, o + 0x40), type = b[o + 0x42];
      if (type !== 2 || len < 2) continue;
      const name = String.fromCharCode(...Array.from({ length: len / 2 - 1 }, (_, k) => u16(b, o + 2 * k))), bytes = u32(b, o + 0x78);
      if (bytes >= u32(b, 0x38)) { const data = read(u32(b, o + 0x74), bytes); if (data) out[name] = data; }   // small streams live in the mini stream: not needed for a workbook
    }
  }
  return { out };
}

/** the BIFF8 records of a workbook stream: { type, data } */
function records(w) {
  const out = [];
  for (let o = 0; o + 4 <= w.length;) { const type = u16(w, o), len = u16(w, o + 2); out.push({ type, data: w.subarray(o + 4, o + 4 + len) }); o += 4 + len; }
  return out;
}

/** the shared-string table: an SST record and the CONTINUE records after it, read as one stream of strings */
function sst(recs, at) {
  const parts = [recs[at].data];
  for (let k = at + 1; k < recs.length && recs[k].type === 0x003c; k++) parts.push(recs[k].data);
  const count = u32(parts[0], 4), strings = [];
  let p = 0, o = 8;
  const need = (n) => { while (o + n > parts[p].length && p + 1 < parts.length && o >= parts[p].length) { p++; o = 0; } };
  const byte = () => { need(1); return parts[p][o++]; };
  const word = () => byte() | (byte() << 8);
  const dword = () => (word() | (word() << 16)) >>> 0;
  for (let s = 0; s < count && p < parts.length; s++) {
    const cch = word(); let flags = byte(), text = '';
    const runs = flags & 8 ? word() : 0, ext = flags & 4 ? dword() : 0;
    for (let c = 0; c < cch; c++) {
      if (o >= parts[p].length && p + 1 < parts.length) { p++; o = 0; flags = (flags & ~1) | (parts[p][o++] & 1); }   // a string continued in the next record restates its width
      text += String.fromCharCode(flags & 1 ? word() : byte());
    }
    for (let k = 0; k < 4 * runs + ext; k++) byte();
    strings.push(text);
  }
  return strings;
}

/** an RK value: a 30-bit integer or the top 30 bits of a double, either one possibly ×100 */
export function rk(v) {
  const n = v & 2 ? v >> 2 : f64(Uint8Array.from([0, 0, 0, 0, v & 0xfc, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]), 0);
  return v & 1 ? n / 100 : n;
}

export function readXls(bytes) {
  const st = streams(bytes);
  if (st.error) return { ok: false, error: st.error };
  const w = st.out.Workbook || st.out.Book;
  if (!w) return { ok: false, error: 'no workbook stream' };
  const recs = records(w);
  if (!recs.length || recs[0].type !== 0x0809) return { ok: false, error: 'the workbook does not begin with a BIFF BOF record' };
  let strings = [];
  const sstAt = recs.findIndex((r) => r.type === 0x00fc);
  if (sstAt >= 0) strings = sst(recs, sstAt);
  const sheetAt = recs.findIndex((r) => r.type === 0x0085);
  if (sheetAt < 0) return { ok: false, error: 'the workbook names no sheet' };
  const start = u32(recs[sheetAt].data, 0);
  const sheet = records(w.subarray(start));
  const rows = [], put = (r, c, v) => { (rows[r] ||= [])[c] = v; };
  for (const { type, data: d } of sheet) {
    if (type === 0x000a) break;   // EOF: the first sheet ends
    if (type === 0x0203) put(u16(d, 0), u16(d, 2), f64(d, 6));
    else if (type === 0x027e) put(u16(d, 0), u16(d, 2), rk(u32(d, 6)));
    else if (type === 0x00bd) { const r = u16(d, 0), first = u16(d, 2); for (let k = 0; 4 + 6 * k + 6 <= d.length - 2; k++) put(r, first + k, rk(u32(d, 4 + 6 * k + 2))); }
    else if (type === 0x00fd) put(u16(d, 0), u16(d, 2), strings[u32(d, 6)]);
    else if (type === 0x0006 && u16(d, 12) !== 0xffff) put(u16(d, 0), u16(d, 2), f64(d, 6));
  }
  return { ok: true, rows: Array.from(rows, (r) => r || []) };
}
