// Lecture de pages web dont l'adresse vient de l'extérieur (site d'un concurrent, d'un prospect, d'un visiteur) :
// refuse les adresses internes et privées (à chaque redirection) et plafonne la taille lue.
const PRIVATE4 = (ip: string) => {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224 || (a === 198 && (b === 18 || b === 19));
};
const PRIVATE6 = (ip: string) => /^(::1?|fc|fd|fe8|fe9|fea|feb|::ffff:(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.))/i.test(ip);

/** Vrai si le nom d'hôte est public (pas d'IP privée, pas de nom interne). */
export async function publicHost(host: string): Promise<boolean> {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || !h.includes(".") && !h.includes(":")) return false;
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(h) || h.endsWith(".supabase.internal")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return !PRIVATE4(h);
  if (h.includes(":")) return !PRIVATE6(h);
  try {
    const [a4, a6] = await Promise.all([Deno.resolveDns(h, "A").catch(() => [] as string[]), Deno.resolveDns(h, "AAAA").catch(() => [] as string[])]);
    if (!a4.length && !a6.length) return false;
    return a4.every((ip) => !PRIVATE4(ip)) && a6.every((ip) => !PRIVATE6(ip));
  } catch { return false; }
}

/** fetch prudent : 5 redirections au plus, chacune vérifiée, corps lu jusqu'à maxBytes. */
export async function safeFetchText(url: string, init: RequestInit = {}, maxBytes = 1_500_000, timeoutMs = 15000): Promise<{ ok: boolean; status: number; type: string; text: string; url: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let current = url;
    for (let hop = 0; hop < 6; hop++) {
      let u: URL;
      try { u = new URL(current); } catch { return { ok: false, status: 0, type: "", text: "", url: current }; }
      if (!/^https?:$/.test(u.protocol) || (u.port && !["80", "443", "8080", "8443"].includes(u.port))) return { ok: false, status: 0, type: "", text: "", url: current };
      if (!(await publicHost(u.hostname))) return { ok: false, status: 0, type: "", text: "", url: current };
      const res = await fetch(u, { ...init, redirect: "manual", signal: ctl.signal });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        await res.body?.cancel().catch(() => {});
        current = new URL(res.headers.get("location")!, u).toString();
        continue;
      }
      const type = res.headers.get("content-type") ?? "";
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        while (size < maxBytes) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); size += value.length; }
        await reader.cancel().catch(() => {});
      }
      const buf = new Uint8Array(Math.min(size, maxBytes)); let o = 0;
      for (const c of chunks) { const part = c.subarray(0, Math.max(0, buf.length - o)); buf.set(part, o); o += part.length; if (o >= buf.length) break; }
      return { ok: res.ok, status: res.status, type, text: new TextDecoder().decode(buf), url: current };
    }
    return { ok: false, status: 0, type: "", text: "", url: current };
  } catch { return { ok: false, status: 0, type: "", text: "", url }; } finally { clearTimeout(timer); }
}
