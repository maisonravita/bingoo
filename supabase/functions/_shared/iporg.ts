import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

// ---------------------------------------------------------------- Entreprise du visiteur
// Le propriétaire d'une adresse IP est public (registres RIPE, ARIN…). Si c'est une entreprise (et pas un opérateur ou un hébergeur),
// on garde son NOM, jamais l'adresse IP. Les plages déjà connues sont mises en cache (données publiques des registres).
const ISP = /orange|france ?telecom|free ?sas|proxad|iliad|\bsfr\b|societe francaise du radiotelephone|bouygues|numericable|completel|\bovh|amazon|\baws\b|google|microsoft|azure|cloudflare|akamai|fastly|apple|icloud|private relay|vodafone|telefonica|telekom|comcast|verizon|at&t|liberty global|scaleway|online s\.?a\.?s|hetzner|digitalocean|linode|akamai|oracle|zscaler|netskope|m247|leaseweb|\bcolt\b|level ?3|lumen|cogent|zayo|\bgtt\b|hurricane|telia|swisscom|proximus|belgacom|\bbell\b|rogers|videotron|mobile|wireless|broadband|cable|telecom|internet service|hosting|datacenter|data center|\bcloud|\bvpn|proxy|\blte\b|\bdsl|fibre|fiber|ripe ncc|iana|reseau|network services|nordvpn|surfshark|tor exit|starlink|spacex|t-mobile|o2 |three |kpn|ziggo|wind|tim |fastweb|eir|virgin|sky |bt |talktalk|init7|ielo|kosc|nerim|coriolis|adista|axione|covage|sewan|alsatis|nordnet|eutelsat/i;
const ipCache = new Map<string, { org: string | null; at: number }>();

export function clientIp(req: Request) {
  const raw = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? (req.headers.get("x-forwarded-for") ?? "").split(",")[0];
  const ip = String(raw ?? "").trim();
  return /^[0-9a-f:.]{3,45}$/i.test(ip) && !/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd|fe80)/i.test(ip) ? ip : null;
}

// deno-lint-ignore no-explicit-any
export function orgOf(d: any): { org: string; start: string; end: string; big: boolean } | null {
  if (!d) return null;
  // deno-lint-ignore no-explicit-any
  const fnOf = (e: any) => { const v = (e?.vcardArray?.[1] ?? []).find((x: unknown[]) => x[0] === "fn"); return v ? String(v[3] ?? "") : ""; };
  // deno-lint-ignore no-explicit-any
  const walk = (es: any[], role: string): string => { for (const e of es ?? []) { if ((e.roles ?? []).includes(role) && fnOf(e)) return fnOf(e); const x = walk(e.entities, role); if (x) return x; } return ""; };
  const org = walk(d.entities, "registrant") || walk(d.entities, "administrative") || "";
  const remarks = (d.remarks ?? []).flatMap((r: { description?: string[] }) => r.description ?? []).join(" ");
  const label = `${org} ${d.name ?? ""} ${remarks}`;
  if (!org || ISP.test(label)) return { org: "", start: d.startAddress, end: d.endAddress, big: true };
  // Une très grande plage d'adresses appartient presque toujours à un opérateur
  let big = false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(d.startAddress ?? "") && /^\d+\.\d+\.\d+\.\d+$/.test(d.endAddress ?? "")) {
    const n = (x: string) => x.split(".").reduce((a, b) => a * 256 + Number(b), 0);
    big = n(d.endAddress) - n(d.startAddress) > 65535;
  }
  return { org: big ? "" : org.replace(/\s+/g, " ").trim().slice(0, 120), start: d.startAddress, end: d.endAddress, big };
}

export async function companyOfIp(ip: string): Promise<string | null> {
  const hit = ipCache.get(ip);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.org;
  const { data: c } = await admin.from("ip_orgs").select("org").lte("start_ip", ip).gte("end_ip", ip).order("start_ip", { ascending: false }).limit(1);
  if (c?.length) { ipCache.set(ip, { org: c[0].org || null, at: Date.now() }); return c[0].org || null; }
  const d = await fetch(`https://rdap.org/ip/${ip}`, { headers: { accept: "application/rdap+json" }, redirect: "follow", signal: AbortSignal.timeout(5000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
  const o = orgOf(d);
  if (o?.start && o?.end) await admin.from("ip_orgs").upsert({ start_ip: o.start, end_ip: o.end, org: o.org || null, isp: !o.org, checked_at: new Date().toISOString() }, { onConflict: "start_ip,end_ip" }).then(() => null, () => null);
  ipCache.set(ip, { org: o?.org || null, at: Date.now() });
  return o?.org || null;
}

