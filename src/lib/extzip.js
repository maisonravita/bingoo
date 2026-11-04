// Fabrique, dans le navigateur, le zip de l'extension Bingoo! avec la clé d'accès déjà dedans (config.json) :
// le client n'a plus rien à copier-coller. Zip sans compression (format « stored »), suffisant pour 30 ko.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

export function makeZip(entries) {
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const n = enc.encode(name), crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, n.length, true);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true); cen.setUint16(28, n.length, true); cen.setUint32(42, offset, true);
    parts.push(new Uint8Array(local.buffer), n, data);
    central.push(new Uint8Array(cen.buffer), n);
    offset += 30 + n.length + data.length;
  }
  const size = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}

/** Télécharge l'extension prête à l'emploi, reliée à l'espace par la clé fournie. */
export async function downloadExtension(key) {
  const base = "./bingoo-extension/";
  const files = await (await fetch(`${base}files.json`)).json();
  const entries = await Promise.all(files.map(async (f) => ({ name: `bingoo-extension/${f}`, data: new Uint8Array(await (await fetch(base + f)).arrayBuffer()) })));
  entries.push({ name: "bingoo-extension/config.json", data: new TextEncoder().encode(JSON.stringify({ key })) });
  const url = URL.createObjectURL(makeZip(entries));
  const a = Object.assign(document.createElement("a"), { href: url, download: "bingoo-extension.zip" });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
