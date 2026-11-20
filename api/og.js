// L'image de partage d'un site ou d'un SaaS construit par Bingoo! (1200×630) : ce que montrent WhatsApp, Facebook,
// LinkedIn et iMessage quand on colle le lien. Générée à la volée, aux couleurs de l'app, sans rien à faire pour le membre.
import fs from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const POLICES = [400, 700].map((weight) => ({ name: "Inter", weight, style: "normal", data: fs.readFileSync(new URL(`./_polices/inter-latin-${weight}-normal.woff`, import.meta.url)) }));
const URL_ = "https://fbsjbnnmzazylmquzryo.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic2pibm5temF6eWxtcXV6cnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3MTcsImV4cCI6MjEwODc3ODcxN30.Kd497ZtRT__Ovy-tIMt47iJkpGbRc30NlpPQWqORGH0";
// Les lignes coupées à la main : satori mesure mal la hauteur d'un texte qui passe à la ligne tout seul
const lignes = (t, max) => { const out = [""]; for (const m of t.split(" ")) { if ((out.at(-1) + " " + m).trim().length > max && out.at(-1)) out.push(m); else out[out.length - 1] = (out.at(-1) + " " + m).trim(); } return out.slice(0, 3); };
const el = (type, style, ...children) => ({ type, props: { style, children: children.length === 1 ? children[0] : children } });

export default async function handler(req, res) {
  const u = new URL(req.url, "https://www.bingoo.fr");
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
  const img = el("div", { width: "1200px", height: "630px", display: "flex", flexDirection: "column", justifyContent: "space-between", paddingTop: "64px", paddingBottom: "64px", paddingLeft: "80px", paddingRight: "80px", color: "white", backgroundColor: c, backgroundImage: `linear-gradient(135deg, ${c} 0%, ${c} 45%, #0f172a 140%)`, fontFamily: "Inter" },
    el("div", { display: "flex", alignItems: "center", gap: "24px" },
      el("div", { width: "96px", height: "96px", borderRadius: "24px", backgroundColor: "white", color: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "56px", fontWeight: 700 }, nom.charAt(0).toUpperCase()),
      el("div", { display: "flex", fontSize: "40px", fontWeight: 700 }, nom)),
    el("div", { display: "flex", flexDirection: "column", position: "absolute", left: "80px", bottom: "64px" },
      ...(haut ? [el("div", { fontSize: "30px", opacity: 0.85, marginBottom: "18px" }, haut)] : []),
      el("div", { display: "flex", flexDirection: "column" }, ...lignes(phrase || nom, phrase.length > 60 ? 34 : 28).map((l) => el("div", { fontSize: phrase.length > 60 ? "54px" : "64px", fontWeight: 700, lineHeight: 1.15 }, l)))));
  try {
    const svg = await satori(img, { width: 1200, height: 630, fonts: POLICES });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.end(png);
  } catch (e) {
    res.statusCode = 500;
    return res.end("Image indisponible");
  }
}
