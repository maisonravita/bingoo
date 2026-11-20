// L'image de partage d'un site ou d'un SaaS construit par Bingoo! (1200×630) : ce que montrent WhatsApp, Facebook,
// LinkedIn et iMessage quand on colle le lien. Générée à la volée, aux couleurs de l'app, sans rien à faire pour le membre.
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };
const URL_ = "https://fbsjbnnmzazylmquzryo.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic2pibm5temF6eWxtcXV6cnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3MTcsImV4cCI6MjEwODc3ODcxN30.Kd497ZtRT__Ovy-tIMt47iJkpGbRc30NlpPQWqORGH0";
const el = (type, style, ...children) => ({ type, props: { style, children: children.length === 1 ? children[0] : children } });

export default async function handler(req) {
  const u = new URL(req.url);
  const slug = String(u.searchParams.get("slug") || "").replace(/[^a-z0-9-]/g, "");
  let s = {};
  try {
    const r = await fetch(`${URL_}/rest/v1/rpc/saas_app_public`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" }, body: JSON.stringify({ p_slug: slug }) });
    if (r.ok) s = (await r.json())?.spec || {};
  } catch { /* image neutre */ }
  const c = /^#[0-9a-f]{6}$/i.test(s.couleur || "") ? s.couleur : "#4F46E5";
  const st = s.site || {};
  const nom = String(s.nom || "Bingoo!").slice(0, 40);
  const haut = [st.metier, st.ville].filter(Boolean).join(" · ").slice(0, 70);
  const phrase = String(st.accroche || s.slogan || s.pitch || "").replace(/\s+/g, " ").slice(0, 110);
  const img = el("div", { width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", color: "white", backgroundColor: c, backgroundImage: `linear-gradient(135deg, ${c} 0%, ${c} 45%, #0f172a 140%)`, fontFamily: "sans-serif" },
    el("div", { display: "flex", alignItems: "center", gap: "24px" },
      el("div", { width: "96px", height: "96px", borderRadius: "24px", backgroundColor: "white", color: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "56px", fontWeight: 700 }, nom.charAt(0).toUpperCase()),
      el("div", { display: "flex", fontSize: "40px", fontWeight: 700 }, nom)),
    el("div", { display: "flex", flexDirection: "column", gap: "20px" },
      ...(haut ? [el("div", { display: "flex", fontSize: "30px", opacity: 0.85 }, haut)] : []),
      el("div", { display: "flex", fontSize: phrase.length > 60 ? "56px" : "68px", fontWeight: 700, lineHeight: 1.1, maxWidth: "1000px" }, phrase || nom)));
  return new ImageResponse(img, { width: 1200, height: 630, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
