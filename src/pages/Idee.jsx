import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
const AppCadre = lazy(() => import("../components/AppCadre"));
import { specApercuSaas } from "../lib/apercuSaas";
import { useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { demanderCompte, estInvite } from "../lib/invite";
import CompanyLogo from "../components/CompanyLogo";

// Le nom donné à une idée est retenu (par texte d'idée) : refaire la même idée ne change pas le nom du projet
const cleNom = (t) => "bingoo-nom:" + String(t ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
const nomGarde = (t) => { try { return localStorage.getItem(cleNom(t)) || ""; } catch { return ""; } };
const garderNom = (t, n) => { try { if (n?.trim()) localStorage.setItem(cleNom(t), n.trim().slice(0, 40)); } catch { /* stockage indisponible */ } };

// « Construire mon idée » : l'aperçu gratuit avant de payer.
// Modération et questions si l'idée est floue, puis : les SaaS proches qui gagnent déjà de l'argent (« m'en inspirer »)
// ou l'idée telle quelle, avec son nom, sa cible, ses écrans, une maquette de l'écran principal, ce qui viendra
// ensuite dans l'atelier et ce qui sera fait autrement (annoncé AVANT de payer).
const HF = { fontFamily: "var(--font-titre)" };
const CLE_CHANTIER = "bingoo-chantier";
const DOMAINE_IDEE = "idee.bingoo.fr";
const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const actif = (ws) => ["active", "trialing", "past_due"].includes(ws?.plan_status);
// Un SaaS demande Lancer (ou plus) ; un site, la formule Site ou n'importe quelle formule qui construit
const paye = (ws, type) => ws?.plan === "fondateur" || (actif(ws) && (["explorer_pro", "lancer_pro", "business", "solo", "pro"].includes(ws?.plan) || (type === "site" && ws?.plan === "site")));
const changerType = (idee, type) => { ecrire("bingoo-idee", { texte: idee.texte, titre: idee.titre, nom: idee.nom, source: idee.source, type, at: Date.now() }); window.location.reload(); };
const dollars = (n) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " $";

// Maquette de la page d'accueil d'un site : en-tête, accroche, bouton, services et prix (tirés de l'aperçu)
// L'aperçu d'un site : le VRAI gabarit des sites livrés par Bingoo!, avec les textes, services et le style de l'aperçu.
// Aucune donnée inventée : pas d'avis, pas d'horaires, pas de chiffres ; le membre fait défiler sa future page.
const prixNombre = (p) => { const m = String(p ?? "").replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/); return m ? Number(m[1].replace(",", ".")) : null; };
// Mises en scène du premier écran (mêmes classes que les sites construits : public/taste-system.css) : l'aperçu les montre
// avec les vrais textes de l'idée et la photo d'aperçu, rendus par la même page publique que le site final
// Coupe à la fin d'un mot (jamais au milieu), avec des points de suspension
const coupe = (t, n) => { const x = String(t ?? ""); if (x.length <= n) return x; const c = x.slice(0, n); return c.slice(0, Math.max(c.lastIndexOf(" "), n * 0.6)).replace(/[,;:\s]+$/, "") + "…"; };
const echap = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function heroApercu(id, nom, ap) {
  const titre = echap(ap.accroche || nom), mots = String(ap.accroche || nom).split(/\s+/), cta = echap(ap.cta || "Me contacter"), pitch = echap(ap.pitch), metier = echap(ap.metier || ""), N = echap(nom);
  const tiers = [mots.slice(0, Math.ceil(mots.length / 3)), mots.slice(Math.ceil(mots.length / 3), Math.ceil((2 * mots.length) / 3)), mots.slice(Math.ceil((2 * mots.length) / 3))].map((x) => echap(x.join(" ")));
  const pts = (ap.points_forts ?? []).slice(0, 3);
  if (id === "cinema") return `<section id="hero" class="hero hero-cine"><img class="hero-cine__fond" src="IMG_1" alt=""><div class="hero-cine__contenu"><h1 class="hero-cine__titre"><span>${tiers[0]}</span><span>${tiers[1]}</span><span>${tiers[2]}</span></h1><div class="hero-cine__bas"><p>${pitch}</p><a class="btn btn--clair" href="#contact">${cta}</a></div></div></section>`;
  if (id === "mot-geant") { const mot = (String(nom).toLowerCase().split(/\s+/).filter((m) => m.length > 2).pop() || String(nom).toLowerCase()).slice(0, 10); return `<section id="hero" class="hero hero-mot"><img class="hero-mot__fond" src="IMG_1" alt=""><p class="hero-mot__mot" aria-hidden="true" style="--lettres:${mot.length}">${echap(mot)}</p><div class="hero-mot__carte"><span class="t-label">${metier}</span><h1>${titre}</h1><p>${echap(coupe(ap.pitch, 90))}</p><a class="btn btn--clair" href="#contact">${cta}</a></div><p class="hero-mot__phrase">${pitch}</p></section>`; }
  if (id === "hublot") return `<section id="hero" class="hero hero-hublot"><div class="hero-hublot__tete"><span class="t-label">${metier}</span><h1>${tiers[0]} ${tiers[1]}<span class="discret">${tiers[2]}</span></h1></div><figure class="hero-hublot__cadre"><img src="IMG_1" alt=""></figure><div class="hero-hublot__bas"><p><strong>${metier}</strong>${echap(coupe(ap.pitch, 90))}</p><div class="btn-row"><a class="btn btn--clair" href="#contact">${cta} →</a></div><p><strong>${N}</strong></p></div></section>`;
  if (id === "galerie") { const t = (x, c = "") => `<div class="tuile ${c}">${echap(x)}</div>`; const w = (pts.map((p) => p.titre.split(" ")[0]).concat([metier.split(" ")[0], N.split(" ")[0]])).filter(Boolean); return `<section id="hero" class="hero hero-galerie"><div class="hero-galerie__tete"><span class="t-label">${metier}</span><h1>${tiers[0]} ${tiers[1]} <span class="discret">${tiers[2]}</span></h1><p>${pitch}</p><div class="btn-row"><a class="btn btn--primary" href="#contact">${cta}</a></div></div><div class="hero-galerie__rail" aria-hidden="true"><div class="hero-galerie__piste"><figure class="tuile"><img src="IMG_1" alt=""></figure>${t(w[0] ?? "", "tuile--aplat")}<div class="tuile tuile--cercles"></div>${t("01", "tuile--clair")}${t(N.slice(0, 1), "tuile--encre")}${t(w[1] ?? "", "tuile--italique")}<div class="tuile tuile--points"></div>${t("02", "tuile--clair")}${t(w[2] ?? "", "tuile--aplat")}${t(w[3] ?? "", "tuile--encre")}<figure class="tuile"><img src="IMG_1" alt=""></figure></div></div></section>`; }
  if (id === "lueur") return `<section id="hero" class="hero hero-lueur"><div class="hero-lueur__tete"><span class="hero-lueur__pilule">${metier}</span><h1>${titre}</h1><p>${pitch}</p><div class="btn-row"><a class="btn btn--clair" href="#contact">${cta} →</a></div></div><div class="hero-lueur__arc" aria-hidden="true"></div><div class="hero-lueur__ecran"><div class="ecran__cote"><b>${N}</b>${(ap.ecrans ?? []).slice(0, 5).map((e, i) => `<span class="${i ? "" : "actif"}">${echap(e.titre)}</span>`).join("")}</div><div class="ecran__corps"><div class="ecran__haut"><strong>${echap((ap.ecrans ?? [])[0]?.titre ?? "")}</strong></div><div class="ecran__lignes">${pts.map((p) => `<div><span>${echap(p.titre)}</span><span>${echap(coupe(p.texte, 40))}</span></div>`).join("")}</div></div></div></section>`;
  if (id === "bento") return `<section id="hero" class="hero hero-bento"><div class="hero-bento__grille"><div class="hero-bento__texte"><span class="t-label">${metier}</span><h1>${N}</h1><p>${pitch}</p><div class="hero-bento__pilules">${pts.map((p) => `<span>${echap(p.titre)}</span>`).join("")}</div></div><div class="hero-bento__widgets">${pts.map((p, i) => `<div class="widget ${["widget--grand widget--violet", "widget--large widget--vert", "widget--large widget--ambre"][i]}"><div class="widget__titre">${echap(p.titre)}</div><div class="widget__note">${echap(p.texte)}</div></div>`).join("")}</div></div></section>`;
  const deux = [mots.slice(0, Math.ceil(mots.length / 2)), mots.slice(Math.ceil(mots.length / 2))].map((x) => echap(x.join(" ")));
  const lien = `<a class="link" href="#suite">${echap(ap.ecrans?.[1]?.titre || "En savoir plus")}</a>`;
  const motsMetier = [...pts.map((p) => p.titre), ap.metier, ...(ap.ecrans ?? []).slice(1).map((e) => e.titre)].filter(Boolean).map((x) => echap(coupe(x, 22)));
  if (id === "affiche") return `<section id="hero" class="hero hero-affiche"><div class="hero-affiche__formes" aria-hidden="true"><i></i><i></i><i></i></div><div class="hero-affiche__haut"><span class="t-label">${metier}</span><span class="t-label">${N}</span></div><h1 class="hero-affiche__titre"><span>${deux[0]}</span><span>${deux[1]}</span></h1><div class="hero-affiche__bas"><p>${pitch}</p><div class="btn-row"><a class="btn btn--clair" href="#contact">${cta}</a>${lien}</div></div></section>`;
  if (id === "carte") return `<section id="hero" class="hero hero-carte"><div class="hero-carte__texte"><span class="t-label">${metier}</span><h1>${titre}</h1><p>${pitch}</p><div class="btn-row"><a class="btn btn--primary" href="#contact">${cta}</a>${lien}</div></div><div class="hero-carte__papier"><p class="hero-carte__entete">${N}</p><ul>${pts.map((p) => `<li><span>${echap(p.titre)}</span><i></i><b></b></li>`).join("")}</ul></div></section>`;
  if (id === "ruban") { const m = motsMetier.length ? motsMetier : [metier]; const piste = [...m, ...m, ...m].slice(0, 6).map((x) => `<span>${x}</span>`).join(""); return `<section id="hero" class="hero hero-ruban"><div class="hero-ruban__tete"><span class="t-label">${metier}</span><h1>${N}</h1><p>${pitch}</p><div class="btn-row"><a class="btn btn--clair" href="#contact">${cta}</a></div></div><div class="hero-ruban__bandes" aria-hidden="true"><div class="hero-ruban__bande"><div class="hero-ruban__piste">${piste}${piste}</div></div><div class="hero-ruban__bande hero-ruban__bande--b"><div class="hero-ruban__piste">${piste}${piste}</div></div></div></section>`; }
  if (id === "moitie") return `<section id="hero" class="hero hero-moitie"><div class="hero-moitie__texte"><span class="t-label">${metier}</span><h1>${titre}</h1><p>${pitch}</p><div class="btn-row"><a class="btn btn--primary" href="#contact">${cta}</a>${lien}</div></div><figure class="hero-moitie__photo"><img src="IMG_1" alt=""></figure></section>`;
  if (id === "arche") return `<section id="hero" class="hero hero-arche"><span class="t-label hero-arche__label">${metier}</span><h1 class="hero-arche__titre"><span>${deux[0]}</span><span>${deux[1]}</span></h1><figure class="hero-arche__cadre"><img src="IMG_1" alt=""></figure><div class="hero-arche__bas"><p>${pitch}</p><a class="btn btn--primary" href="#contact">${cta}</a></div></section>`;
  if (id === "bandeau") return `<section id="hero" class="hero hero-bandeau"><div class="hero-bandeau__haut"><div><span class="t-label">${metier}</span><h1>${titre}</h1></div><div class="hero-bandeau__action"><p>${pitch}</p><div class="btn-row"><a class="btn btn--primary" href="#contact">${cta}</a></div></div></div><figure class="hero-bandeau__photo"><img src="IMG_1" alt=""></figure></section>`;
  if (id === "mosaique") return `<section id="hero" class="hero hero-mosaique"><div class="hero-mosaique__texte"><span class="t-label">${metier}</span><h1>${titre}</h1><p>${pitch}</p><div class="btn-row"><a class="btn btn--primary" href="#contact">${cta}</a>${lien}</div></div><div class="hero-mosaique__grille"><figure><img src="IMG_1" alt=""></figure><figure><img src="IMG_1" alt="" style="object-position:20% 50%"></figure><figure><img src="IMG_1" alt="" style="object-position:80% 50%"></figure><p class="hero-mosaique__mot">${echap(coupe(String(ap.metier || nom).split(/\s+/)[0], 12))}</p></div></section>`;
  return null;
}
export function pageApercu(id, nom, ap) {
  const hero = heroApercu(id, nom, ap); if (!hero) return null;
  const nav = `<header class="nav"><div class="wrap nav__bar"><a class="nav__logo" href="#hero">${echap(nom)}</a><nav class="nav__links">${(ap.ecrans ?? []).slice(1, 4).map((e) => `<div class="nav__item"><a class="nav__link" href="#suite">${echap(e.titre)}</a></div>`).join("")}</nav><div class="nav__actions"><a class="btn btn--primary" href="#contact">${echap(ap.cta || "Me contacter")}</a></div><button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">≡</button></div></header>`;
  const suite = `<section id="suite" class="section s-liste"><div class="wrap"><div class="s-liste__tete"><h2>${echap(ap.ecrans?.[1]?.titre || "Ce que nous faisons")}</h2><p>${echap(ap.cible || "")}</p></div>${(ap.points_forts ?? []).map((p, i) => `<div class="s-liste__ligne"><span class="s-liste__num">0${i + 1}</span><h3>${echap(p.titre)}</h3><p>${echap(p.texte)}</p></div>`).join("")}</div></section>`;
  return { sections: [{ id: "nav", html: nav }, { id: "hero", html: hero }, { id: "suite", html: suite }], images: ap.photo ? { IMG_1: { url: ap.photo } } : {}, nav: [] };
}
function specSite(nom, ap, compo) {
  const page = compo ? pageApercu(compo, nom, ap) : null;
  return {
    type: "site", nom, slogan: ap.accroche || "", pitch: ap.pitch || "", design: ap.design ?? undefined, couleur: ap.design?.couleurs?.primary ?? "#E8571C",
    site: { ...(page ? { page } : {}), gabarit: "editorial", metier: ap.metier || "", cta: ap.cta || "Me contacter", modele: ap.modele || "vitrine", demande: /devis/i.test(ap.cta ?? "") ? "devis" : /r[ée]serv/i.test(ap.cta ?? "") ? "reservation" : /rendez|rdv/i.test(ap.cta ?? "") ? "rdv" : "message", points_forts: ap.points_forts ?? [], etapes: ap.etapes ?? [] },
    demo: { services: (ap.services ?? []).map((x) => { const n = prixNombre(x.prix); return { titre: x.titre, description: x.description || "", prix: n, prix_texte: /partir/i.test(x.prix ?? "") }; }), horaires: [], infos: [{}] },
    ecrans: [],
    ...(page ? { site_page_apercu: true } : {}),
  };
}
// Aperçu d'un SaaS : la vraie coque des SaaS Bingoo! (menu, en-tête, style tiré) avec l'écran principal de l'idée,
// écrit avec les vrais composants et des données d'exemple ; les autres écrans sont annoncés dans le menu.
// Une des trois propositions de style : le VRAI rendu de la page (gabarit des sites, ou coque des SaaS), en petit
// Aperçu d'une app mobile : la vraie app (coque des apps Bingoo!, largeur de téléphone) avec l'écran principal de l'idée
function TelReel({ nom, ap }) {
  const spec = useMemo(() => ({ ...specApercuSaas(nom, ap), mobile: true }), [nom, ap]);
  const slug = "apercu-tel-" + (nom || "app").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  return (
    <div className="mx-auto w-[390px] max-w-full overflow-hidden rounded-[2rem] border border-black/15 bg-white shadow-[0_30px_70px_-35px_rgba(20,20,40,.55)]">
      <div className="border-b border-black/[.06] bg-[#F6F5F2] px-4 py-2 text-center text-[11px] text-[#9A9EAE]">{nom} · données d'exemple</div>
      <Suspense fallback={<div className="h-[720px] animate-pulse bg-[#F6F5F2]" />}>
        <AppCadre slug={slug} spec={spec} version={JSON.stringify(spec).length} essai className="block h-[720px] w-full" />
      </Suspense>
    </div>
  );
}
function SaasReel({ nom, ap }) {
  const spec = useMemo(() => specApercuSaas(nom, ap), [nom, ap]);
  const slug = "apercu-" + (nom || "saas").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  const boite = useRef(null), [k, setK] = useState(0.6);
  useEffect(() => {
    const el = boite.current; if (!el) return;
    const o = new ResizeObserver(() => { const w = el.clientWidth; setK(w < 640 ? 1 : w / 1280); });
    o.observe(el); return () => o.disconnect();
  }, []);
  const H = 600, large = k < 1;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_70px_-35px_rgba(20,20,40,.5)]">
      <div className="flex items-center gap-1.5 border-b border-black/[.06] bg-[#F6F5F2] px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" /><span className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-0.5 text-[11px] text-[#9A9EAE]">{nom} · données d'exemple</span><span className="text-[10.5px] text-[#9A9EAE]">clique dans le menu ↓</span></div>
      <div ref={boite} className="relative w-full overflow-hidden" style={{ height: H }}>
        <div className={large ? "absolute left-0 top-0" : ""} style={large ? { width: 1280, height: H / k, transform: `scale(${k})`, transformOrigin: "0 0" } : { height: H }}>
          <Suspense fallback={<div className="h-full animate-pulse bg-[#F6F5F2]" />}>
            <AppCadre slug={slug} spec={spec} version={JSON.stringify(spec).length} essai className="h-full w-full" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
// Site : le modèle de la bibliothèque sur lequel il sera construit (vrai site déjà en ligne), et les 2 autres proposés
function ModeleReel({ ap, choisir }) {
  const ms = ap.modeles_site ?? [];
  const m = ms.find((x) => x.id === ap.modele_site) ?? ms[0];
  const boite = useRef(null), [k, setK] = useState(0.6);
  useEffect(() => {
    const el = boite.current; if (!el) return;
    const o = new ResizeObserver(() => { const w = el.clientWidth; setK(Math.min(1, w / 1280)); });
    o.observe(el); return () => o.disconnect();
  }, []);
  const H = 600;
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_70px_-35px_rgba(20,20,40,.5)]">
        <div className="flex items-center gap-1.5 border-b border-black/[.06] bg-[#F6F5F2] px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" /><span className="ml-2 truncate text-[11.5px] text-ink-faint">Modèle « {m?.nom} » · ton site reprend cette mise en page, avec tes textes et tes photos</span></div>
        <div ref={boite} className="relative w-full overflow-hidden" style={{ height: H }}>
          {m && <iframe key={m.slug} title={`Modèle ${m.nom}`} src={`/#/app/${m.slug}`} className="absolute left-0 top-0 border-0" style={{ width: 1280, height: H / k, transform: `scale(${k})`, transformOrigin: "0 0" }} />}
        </div>
      </div>
      {ms.length > 1 && <div className="mt-3 grid grid-cols-3 gap-2">
        {ms.map((x) => (
          <button key={x.id} type="button" onClick={() => choisir(x.id)} className={cx("overflow-hidden rounded-xl border-2 bg-white text-left transition", x.id === m?.id ? "border-[#E8571C]" : "border-line hover:border-ink/30")}>
            <div className="h-16 bg-[#F6F5F2] bg-cover bg-center" style={x.photo ? { backgroundImage: `url(${x.photo})` } : undefined} />
            <p className="px-2 pt-1.5 text-[12.5px] font-bold leading-tight">{x.nom}</p>
            <p className="px-2 pb-1.5 text-[11px] text-ink-faint leading-tight">{x.pour}</p>
          </button>))}
      </div>}
    </div>
  );
}
function SiteReel({ nom, ap }) {
  const compo = ap.composition && ap.composition !== "auto" ? ap.composition : ap.compositions?.[0];
  const spec = useMemo(() => specSite(nom, ap, compo), [nom, ap, compo]);
  const slug = (nom || "mon-site").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  // Rendu en largeur d'ordinateur (1280 px), réduit à la place disponible : on voit le site comme ses clients le verront
  const boite = useRef(null), [k, setK] = useState(0.6);
  useEffect(() => {
    const el = boite.current; if (!el) return;
    const o = new ResizeObserver(() => { const w = el.clientWidth; setK(w < 640 ? 1 : w / 1280); });
    o.observe(el); return () => o.disconnect();
  }, []);
  const H = 600, large = k < 1;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_70px_-35px_rgba(20,20,40,.5)]">
      <div className="flex items-center gap-1.5 border-b border-black/[.06] bg-[#F6F5F2] px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" /><span className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-0.5 text-[11px] text-[#9A9EAE]">{slug}.fr</span><span className="text-[10.5px] text-[#9A9EAE]">fais défiler ↓</span></div>
      <div ref={boite} className="relative w-full overflow-hidden" style={{ height: H }}>
        <div className={large ? "absolute left-0 top-0" : ""} style={large ? { width: 1280, height: H / k, transform: `scale(${k})`, transformOrigin: "0 0" } : { height: H }}>
          <Suspense fallback={<div className="h-full animate-pulse bg-[#F6F5F2]" />}>
            <AppCadre slug={"apercu-" + slug + (compo ?? "")} spec={spec} version={JSON.stringify(spec).length} apercu className="h-full w-full" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}



// Maquette d'une APP MOBILE : un téléphone, l'écran principal et les onglets en bas

// Maquette fil de fer de l'écran principal, dessinée à partir des blocs de l'aperçu (aucun appel d'IA en plus)

// Le prix, dit AVANT de construire : ce que ça coûte à ce membre-là (compris dans sa formule, crédits, ou la formule à prendre)
const euros = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",")) + " €";
// Compte gratuit : le premier projet est offert si c'est un outil ou un jeu (le serveur le vérifie de son côté)
function useOutilOffert(ws, type) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (type !== "outil" || !ws?.id || ws.plan !== "essai") { setOk(false); return; }
    supabase.from("saas_apps").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).then(({ count }) => setOk((count ?? 0) === 0));
  }, [ws?.id, ws?.plan, type]);
  return ok;
}
function Prix({ ws, type }) {
  const offert = useOutilOffert(ws, type);
  const [t, setT] = useState(null), [deja, setDeja] = useState(null);
  useEffect(() => {
    fn("plans").then(setT).catch(() => setT({}));
    if (ws?.id) supabase.from("saas_apps").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).not("statut", "in", "(remplace,erreur,validation,retire)").then(({ count }) => setDeja((count ?? 0) > 0));
  }, [ws?.id]);
  if (!t) return null;
  const outil = type === "outil", site = type === "site" || outil;
  const mois = (k, per = "mois") => (t.plans ?? []).find((p) => p.key === k)?.periodes?.find((x) => x.key === per)?.parMois;
  const fondateur = t.fondateur?.left > 0 ? t.fondateur.price : null;
  const lancer = fondateur ?? mois("explorer_pro") ?? 9.99;
  let txt;
  if (offert) txt = <><b>Offert</b> : ton premier outil ou jeu est construit et mis en ligne gratuitement, sans carte bancaire. Pour le modifier en discutant ensuite : formule Essentiel, {euros(mois("explorer_pro") ?? 9.99)} par mois.</>;
  else if (paye(ws, site ? "site" : type)) txt = deja ? <>Tu as déjà un {site ? "projet" : "SaaS"} en ligne : celui-ci coûte <b>60 crédits</b>, le premier reste en ligne.</> : <><b>Compris dans ta formule</b> : c'est {outil ? "le projet" : site ? "ton site" : "ton SaaS"} de l'abonnement, sans rien payer de plus.</>;
  else if (!site && ws?.plan === "site" && actif(ws)) txt = <>Ta formule Site construit des sites. Pour {type === "app" ? "une app" : "un SaaS"}, passe à la formule Essentiel : <b>{euros(lancer)} par mois</b>.</>;
  else if (site) txt = <>Formule Site : <b>{euros(mois("site") ?? 9.99)}/mois, hébergement inclus</b>, sans engagement{mois("site", "an") ? <> (ou {euros(mois("site", "an"))}/mois en payant l'année)</> : null}. Nom de domaine personnalisé en plus : tu l'achètes où tu veux, on le branche gratuitement.</>;
  else txt = <>Formule SaaS : <b>{euros(lancer)} par mois{fondateur ? ", prix fondateur à vie" : ""}</b>, sans engagement. {type === "app" ? "Ton app" : "Ton SaaS"} est compris dans l'abonnement.</>;
  return <p className="w-full rounded-xl bg-[#F7F7F5] px-3 py-2 text-[13.5px]">{txt}</p>;
}

export default function Idee() {
  const { ws, session } = useWs();
  const nav = useNavigate();
  const [idee] = useState(() => lire("bingoo-idee"));
  useEffect(() => { if (idee?.type === "video") nav("/explorer/motion", { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [etat, setEtat] = useState("charge"), [r, setR] = useState(null), [err, setErr] = useState(null);
  const [reponses, setReponses] = useState([]), [choix, setChoix] = useState({}), [nom, setNom] = useState(""), [busy, setBusy] = useState(false);
  // Idée de site trop courte : 3 questions facultatives avant la construction, pour que la page ait de vraies choses à dire
  // (sinon l'IA redit la même offre dans plusieurs sections). Les réponses partent dans les précisions de l'idée.
  const [plus, setPlus] = useState({ diff: "", deroule: "", infos: "" });
  // Le plan d'un logiciel, vérifié avant de construire : écrans gardés ou retirés, fonctions en plus, rôles, règles et calculs
  const [retires, setRetires] = useState([]), [plan, setPlan] = useState({ ajouts: "", roles: "", regles: "" });
  // Le plan d'un site, vérifié avant de construire : ce que le visiteur fait (rendez-vous, devis…), les sections voulues ou non, ce qu'il ne faut pas écrire
  const [planSite, setPlanSite] = useState({ demande: "", avec: [], sans: [], interdit: "" });
  const SECTIONS_SITE = ["Services et prix", "Photos", "Comment ça se passe", "À propos", "Questions fréquentes", "Horaires et accès", "Zone d'intervention", "Réalisations"];
  const reponsesSite = () => [["Sections à mettre sur la page", planSite.avec.join(", ")], ["Sections à NE PAS mettre sur la page", planSite.sans.join(", ")], ["Ce qu'il ne faut jamais écrire sur le site", planSite.interdit]].filter(([, v]) => String(v).trim().length >= 3).map(([q, v]) => ({ q, r: String(v).trim().slice(0, 400) }));
  const reponsesPlan = () => [["Écrans à ne pas construire", retires.join(", ")], ["Fonctions à ajouter", plan.ajouts], ["Qui utilise le logiciel et ce que chacun peut faire", plan.roles], ["Règles, calculs et étapes à respecter exactement", plan.regles]].filter(([, v]) => String(v).trim().length >= 3).map(([q, v]) => ({ q, r: String(v).trim().slice(0, 600) }));
  const ideeCourte = idee?.type === "site" && (String(idee?.texte ?? "") + (idee?.reponses ?? []).map((x) => x?.r ?? "").join(" ")).trim().length < 260;
  const reponsesPlus = () => [["Ce qui te rend différent", plus.diff], ["Comment ça se passe pour un client", plus.deroule], ["Adresse, horaires et prix à afficher", plus.infos]].filter(([, v]) => v.trim().length >= 3).map(([q, v]) => ({ q, r: v.trim().slice(0, 400) }));
  const offert = useOutilOffert(ws, idee?.type);
  const charger = async (rep = []) => {
    setEtat("charge"); setErr(null);
    try {
      const x = await fn("r/saas-idee-apercu", { workspace_id: ws.id, texte: idee.texte, type: idee.type, reponses: rep, modele_site: idee.modele_site ?? null });
      setR(x); setEtat(x.refus ? "refus" : x.questions ? "questions" : "apercu");
      // Même idée déjà construite ou nommée sur cet appareil : on garde le nom choisi la première fois
      if (x.apercu) { const garde = nomGarde(idee.texte); setNom(idee.nom || garde || x.apercu.nom); ecrire("bingoo-idee", { ...idee, ...(garde && !idee.nom ? { nom: garde } : {}), reponses: rep, apercu: x.apercu, proches: x.proches }); }
    } catch (e) { setErr(e.message); setEtat("erreur"); }
  };
  useEffect(() => { if (idee?.texte && ws?.id) { if (idee.apercu?.nom) { setR({ apercu: idee.apercu, proches: idee.proches ?? [] }); setNom(idee.nom || idee.apercu.nom); setEtat("apercu"); } else charger(); } }, [ws?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!idee?.texte) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><p className="text-[20px] font-bold">Écris d'abord ton idée.</p><button onClick={() => nav("/explorer/trouver")} className="mt-4 rounded-full bg-ink px-6 py-3 font-bold text-white">Explorer les SaaS qui marchent</button></div>;

  // Lancer : un compte, l'abonnement, puis la construction habituelle (questions, paiement, construction, vérification)
  const lancer = async (quoi, proche) => {
    if (estInvite(session) || !ws) { demanderCompte("Crée ton compte gratuit pour construire ton idée."); return; }
    const ap = r?.apercu;
    if (quoi === "idee") {
      garderNom(idee.texte, nom.trim() || ap.nom);
      ecrire(`bingoo-reponses-${DOMAINE_IDEE}`, { nom: nom.trim() || ap.nom, clients: ap.cible, mieux: "", angle: null });
      ecrire(CLE_CHANTIER, { idee: true, domaine: DOMAINE_IDEE, nom: nom.trim() || ap.nom, categorie: "", ws: ws.id, ideeTexte: idee.texte, type: idee.type, reponses: [...(idee.reponses ?? []), ...reponsesPlus(), ...(idee.type !== "site" ? reponsesPlan() : reponsesSite())], apercu: { ...ap, nom: nom.trim() || ap.nom, ...(idee.type === "site" && planSite.demande ? { demande: planSite.demande } : {}), ...(idee.type !== "site" && retires.length ? { ecrans: ap.ecrans.filter((e) => !retires.includes(e.titre)) } : {}) }, source: idee.source ?? null });
    } else {
      ecrire(`bingoo-reponses-${proche.domaine}`, { nom: "", clients: ap?.cible ?? "", mieux: idee.texte, angle: `Ce que je veux faire mieux : ${idee.texte}` });
      ecrire(CLE_CHANTIER, { domaine: proche.domaine, nom: proche.nom, categorie: "", ws: ws.id });
    }
    // Un outil ou un jeu se construit avec la formule Site (la moins chère) comme avec Lancer
    const site = quoi === "idee" && (idee.type === "site" || idee.type === "outil");
    if (paye(ws, site ? "site" : "saas") || (quoi === "idee" && offert)) { nav("/explorer/revelation"); return; }
    // Site : sa propre formule, moins chère (9,99 € par mois) ; SaaS : Lancer
    const plan = site ? "site" : "explorer_pro";
    setBusy(true);
    try { const { url } = await fn("billing-checkout", { workspace_id: ws.id, plan, periode: "mois", retour: "revelation" }); if (url) { window.location.href = url; return; } nav("/explorer/revelation"); }
    catch { nav(`/abonnement?formule=${plan}&periode=mois`); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-[13px] font-bold uppercase tracking-[.16em] text-accent-dark">Ton idée{idee.type === "app" ? " d'app" : idee.type === "site" ? " de site" : idee.type === "outil" ? " d'outil ou de jeu" : ""}</p>
      <h1 className="mt-2 text-[28px] sm:text-[38px] font-black leading-[1.08] tracking-tight" style={HF}>{idee.titre ?? <>« {idee.texte} »</>}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[13.5px] text-ink-soft">Bingoo! construit :</span>
        {[["saas", "Un logiciel (SaaS)"], ["site", "Un site web"], ["outil", "Un outil ou un jeu"]].map(([k, l]) => <button key={k} aria-pressed={(idee.type ?? "saas") === k} disabled={etat === "charge"} onClick={() => { if ((idee.type ?? "saas") === k) return; changerType(idee, k); }} className={cx("rounded-full border px-3 py-1.5 text-[13px] font-semibold transition", (idee.type ?? "saas") === k ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-faint")}>{l}</button>)}
        <button onClick={() => { ecrire("bingoo-idee", null); nav("/accueil"); }} className="ml-1 text-[13.5px] font-semibold text-ink-soft underline-offset-4 hover:underline">Changer d'idée</button>
      </div>

      {etat === "charge" && <div className="mt-10 flex items-center gap-3 rounded-2xl border border-line bg-white p-6"><span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" /><span className="text-[15px] text-ink-soft">{idee.type === "outil" ? "Bingoo! étudie ton idée et prépare ce qu'on verra dans la page…" : idee.type === "site" ? "Bingoo! étudie ton idée et prépare l'aperçu de ton site…" : "Bingoo! étudie ton idée et cherche ce qui marche déjà sur ce créneau…"}</span></div>}
      {etat === "erreur" && <div className="mt-10 rounded-2xl border border-bad/30 bg-bad/5 p-6"><p className="font-semibold">{err}</p><button onClick={() => charger(reponses)} className="mt-3 rounded-xl bg-ink px-4 py-2 font-bold text-white">Réessayer</button></div>}
      {etat === "refus" && <div className="mt-10 rounded-2xl border border-bad/30 bg-bad/5 p-6"><p className="text-[17px] font-bold">Bingoo! ne peut pas construire cette idée.</p><p className="mt-1 text-ink-soft">{r.refus}</p><button onClick={() => { ecrire("bingoo-idee", null); nav("/accueil"); }} className="mt-4 rounded-xl bg-ink px-4 py-2 font-bold text-white">Écrire une autre idée</button></div>}

      {etat === "questions" && (
        <div className="mt-8 rounded-3xl border border-line bg-white p-6">
          <p className="text-[18px] font-black" style={HF}>{r.questions.length > 1 ? "Deux précisions pour viser juste" : "Une précision pour viser juste"}</p>
          <p className="text-[14px] text-ink-soft">Ton idée peut partir dans plusieurs directions : dis-moi laquelle.</p>
          <div className="mt-5 space-y-5">{r.questions.map((q) => (
            <div key={q.q}><p className="font-semibold">{q.q}</p>
              <div className="mt-2 flex flex-wrap gap-2">{q.choix.map((c) => <button key={c} aria-pressed={choix[q.q] === c} onClick={() => setChoix({ ...choix, [q.q]: c })} className={cx("rounded-full border px-4 py-2 text-[14px] font-medium transition", choix[q.q] === c ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-faint")}>{c}</button>)}</div>
              <input placeholder="Ou écris ta réponse…" value={q.choix.includes(choix[q.q]) ? "" : choix[q.q] ?? ""} onChange={(e) => setChoix({ ...choix, [q.q]: e.target.value })} className="mt-2 w-full max-w-md rounded-xl border border-line px-3 py-2 text-[14px] outline-none focus:border-ink" />
            </div>
          ))}</div>
          <button disabled={r.questions.some((q) => !String(choix[q.q] ?? "").trim())} onClick={() => { const rep = r.questions.map((q) => ({ q: q.q, r: choix[q.q] })); setReponses(rep); charger(rep); }} className="mt-6 rounded-full bg-accent px-6 py-3 font-bold text-white disabled:opacity-40">Voir mon aperçu</button>
        </div>
      )}

      {etat === "apercu" && r?.apercu && (() => { const ap = r.apercu, site = idee.type === "site", outil = idee.type === "outil"; return (
        <>
          <section className="mt-8 rounded-3xl border-2 border-ink bg-white p-5 sm:p-7">
            <p className="text-[12px] font-bold uppercase tracking-[.14em] text-ink-faint">L'aperçu de ta première version</p>
            <div className={cx("mt-4 grid grid-cols-1 gap-6 [&>*]:min-w-0", idee.type === "app" && "lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start")}>
              <div>
                <label className="text-[12.5px] font-semibold text-ink-soft" htmlFor="nom-idee">{site ? "Le nom affiché sur ton site" : "Son nom"}</label>
                <input id="nom-idee" value={nom} onChange={(e) => { setNom(e.target.value.slice(0, 40)); garderNom(idee.texte, e.target.value); }} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-[22px] font-black outline-none focus:border-ink" style={HF} />
                <p className="mt-3 text-[15px]">{ap.pitch}</p>
                <p className="mt-1 text-[13.5px] text-ink-soft">Pour : {ap.cible}</p>
                <p className="mt-5 text-[13px] font-bold">{outil ? "Ce qu'on verra et ce qu'on pourra faire dans la page" : site ? `Ce que Bingoo! construit maintenant (${ap.ecrans.length} parties)` : idee.type === "app" ? `Ce que Bingoo! construit maintenant (${ap.ecrans.length} onglets)` : `Ce que Bingoo! construit maintenant (${ap.ecrans.length} écrans)`}</p>
                <ol className="mt-2 space-y-1.5">{ap.ecrans.map((e, i) => { const off = retires.includes(e.titre); return <li key={e.titre} className={cx("flex items-start gap-2.5 text-[14px]", off && "opacity-45")}><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-paper text-[11px] font-bold">{i + 1}</span><span className={cx("flex-1", off && "line-through")}><b>{e.titre}</b> <span className="text-ink-soft">— {e.role}</span></span>{!site && i > 0 && <button type="button" onClick={() => setRetires((l) => (off ? l.filter((x) => x !== e.titre) : [...l, e.titre]))} className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft hover:text-ink">{off ? "Remettre" : "Retirer"}</button>}</li>; })}</ol>
                {site && !ap.plutot_logiciel && <div className="mt-4 rounded-2xl border border-line bg-[#FBFAF7] p-4">
                  <p className="text-[14.5px] font-bold">Vérifie le plan de ton site <span className="font-normal text-ink-faint">· facultatif</span></p>
                  <p className="mt-1 text-[13px] text-ink-soft">Ce que tu choisis ici est suivi à la lettre, et vérifié sur le site construit avant de te le livrer.</p>
                  <p className="mt-3 text-[13px] font-semibold">Ce que tes visiteurs font sur ton site</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">{[["rdv", "Prendre rendez-vous"], ["reservation", "Réserver (date et nombre de personnes)"], ["devis", "Demander un devis"], ["message", "Te contacter"]].map(([k, l]) => <button key={k} type="button" aria-pressed={planSite.demande === k} onClick={() => setPlanSite((x) => ({ ...x, demande: x.demande === k ? "" : k }))} className={cx("rounded-full border px-3 py-1.5 text-[13px] font-semibold", planSite.demande === k ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/40")}>{l}</button>)}</div>
                  <p className="mt-3 text-[13px] font-semibold">Les sections de ta page <span className="font-normal text-ink-faint">(un clic : à mettre, deux clics : à ne pas mettre)</span></p>
                  <div className="mt-1.5 flex flex-wrap gap-2">{SECTIONS_SITE.map((x) => { const avec = planSite.avec.includes(x), sans = planSite.sans.includes(x); return <button key={x} type="button" onClick={() => setPlanSite((p) => avec ? { ...p, avec: p.avec.filter((y) => y !== x), sans: [...p.sans, x] } : sans ? { ...p, sans: p.sans.filter((y) => y !== x) } : { ...p, avec: [...p.avec, x] })} className={cx("rounded-full border px-3 py-1.5 text-[13px] font-semibold", avec ? "border-[#15803D] bg-[#15803D]/10 text-[#15803D]" : sans ? "border-bad/40 bg-bad/5 text-bad line-through" : "border-line bg-white text-ink-soft hover:border-ink/40")}>{avec ? "✓ " : sans ? "✕ " : ""}{x}</button>; })}</div>
                  <label className="mt-3 block text-[13px] font-semibold">Ce qu'il ne faut jamais écrire
                    <textarea value={planSite.interdit} onChange={(e) => setPlanSite((x) => ({ ...x, interdit: e.target.value }))} placeholder="Ex. ne parle pas de livraison ; pas de tarif pour les mariages, ils sont sur devis" rows={2} maxLength={400} className="mt-1.5 w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-[13.5px] font-normal outline-none focus:border-ink/40" />
                  </label>
                </div>}
                {!site && <div className="mt-4 rounded-2xl border border-line bg-[#FBFAF7] p-4">
                  <p className="text-[14.5px] font-bold">Vérifie le plan avant de construire <span className="font-normal text-ink-faint">· facultatif</span></p>
                  <p className="mt-1 text-[13px] text-ink-soft">Ce que tu écris ici est suivi à la lettre : les rôles, les règles et les calculs deviennent la logique du logiciel, testée avant la livraison.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {[["roles", "Qui l'utilise, et que peut faire chacun ?", "Ex. les propriétaires publient leurs outils ; les locataires réservent ; l'administrateur voit tout"], ["regles", "Une règle ou un calcul à respecter ?", "Ex. total = prix par jour × nombre de jours + 10 % de commission ; une réservation passe de « demandée » à « acceptée » ou « refusée »"], ["ajouts", "Une fonction en plus ?", "Ex. une note sur 5 après chaque location, un export des réservations"]].map(([k, q, ph]) => (
                      <label key={k} className="block text-[13px] font-semibold">{q}
                        <textarea value={plan[k]} onChange={(e) => setPlan((x) => ({ ...x, [k]: e.target.value }))} placeholder={ph} rows={3} maxLength={600} className="mt-1.5 w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-[13.5px] font-normal outline-none focus:border-ink/40" />
                      </label>
                    ))}
                  </div>
                </div>}
                {ap.plus_tard?.length > 0 && <><p className="mt-5 text-[13px] font-bold">Ensuite, dans l'atelier</p><p className="mt-1 text-[13.5px] text-ink-soft">{ap.plus_tard.join(" · ")}</p></>}
                {!site && !outil && idee.type !== "app" && ap.plutot_outil && <div className="mt-5 rounded-xl border border-[#E8571C]/30 bg-[#FFF7F0] p-3.5">
                  <p className="text-[14px] font-bold text-ink">Ton idée ressemble plutôt à un outil ou à un jeu</p>
                  <p className="mt-1 text-[13.5px] text-ink-soft">Un logiciel arrive avec des comptes, une page de vente et des formules d'abonnement. Pour une page qu'on ouvre et qu'on utilise tout de suite, sans compte, choisis l'outil : c'est plus simple et plus rapide.</p>
                  <button type="button" onClick={() => changerType(idee, "outil")} className="mt-2.5 rounded-full bg-[#E8571C] px-4 py-2 text-[13px] font-semibold text-white">Construire un outil ou un jeu à la place</button>
                </div>}
                {outil && ap.plutot_logiciel && <div className="mt-5 rounded-xl border border-[#E8571C]/30 bg-[#FFF7F0] p-3.5">
                  <p className="text-[14px] font-bold text-ink">Ton idée demande plutôt un logiciel</p>
                  <p className="mt-1 text-[13.5px] text-ink-soft">Elle a besoin de comptes ou de données gardées en ligne : une page seule ne le fera pas. Un logiciel le fera vraiment.</p>
                  <button type="button" onClick={() => changerType(idee, "saas")} className="mt-2.5 rounded-full bg-[#E8571C] px-4 py-2 text-[13px] font-semibold text-white">Construire un logiciel à la place</button>
                </div>}
                {outil && <div className="mt-5 rounded-xl border border-line bg-paper p-3.5">
                  <p className="text-[13px] font-bold">Ouvert directement</p>
                  <p className="mt-1 text-[13.5px] text-ink-soft">Pas de compte, pas de page de vente, pas d'abonnement : on ouvre le lien et on s'en sert. Les scores et les réglages restent sur l'appareil du visiteur.</p>
                  {ap.ambiance?.esprit && <p className="mt-3 flex flex-wrap items-center gap-2 text-[13.5px]"><span className="h-5 w-5 rounded-full border border-black/10" style={{ background: ap.ambiance.fond }} /><span className="h-5 w-5 rounded-full border border-black/10" style={{ background: ap.ambiance.accent }} /><span><b>Son allure :</b> <span className="text-ink-soft">{ap.ambiance.esprit}</span></span></p>}
                </div>}
                {site && ap.plutot_logiciel && <div className="mt-5 rounded-xl border border-[#E8571C]/30 bg-[#FFF7F0] p-3.5">
                  <p className="text-[14px] font-bold text-ink">Ton idée ressemble plutôt à un logiciel</p>
                  <p className="mt-1 text-[13.5px] text-ink-soft">Des personnes doivent s'y connecter et agir (publier, s'inscrire, réserver avec un compte) : un site vitrine pourra seulement le présenter. Un logiciel le fera vraiment.</p>
                  <button type="button" onClick={() => { ecrire("bingoo-idee", { texte: idee.texte, titre: idee.titre, nom: idee.nom, source: idee.source, type: "saas", at: Date.now() }); window.location.reload(); }} className="mt-2.5 rounded-full bg-[#E8571C] px-4 py-2 text-[13px] font-semibold text-white">Construire un logiciel à la place</button>
                </div>}
                {ap.limites?.length > 0 && <div className="mt-5 rounded-xl bg-[#FFF7F0] p-3"><p className="text-[13px] font-bold text-[var(--p)]">Fait autrement</p><ul className="mt-1 space-y-1">{ap.limites.map((l) => <li key={l.demande} className="text-[13.5px]"><span className="line-through decoration-[#C2410C]/50">{l.demande}</span> → {l.alternative}</li>)}</ul></div>}
              </div>
              {!outil && <div className="order-first">{site ? (ap.modeles_site?.length ? <ModeleReel ap={ap} choisir={(id) => { const na = { ...ap, modele_site: id }; setR((x) => ({ ...x, apercu: na })); ecrire("bingoo-idee", { ...idee, apercu: na }); }} /> : <SiteReel nom={nom || ap.nom} ap={ap} />) : idee.type === "app" ? <TelReel nom={nom || ap.nom} ap={ap} /> : <SaasReel nom={nom || ap.nom} ap={ap} />}<p className="mt-2 text-center text-[12px] text-ink-faint">{site ? "Ta future page d'accueil : Bingoo! a choisi la mise en scène, les couleurs et les polices qui vont à ton projet. Fais-la défiler. Tu ajouteras ta photo, tes horaires et ton adresse ensuite." : "Ton écran principal dans la vraie coque de ton SaaS, avec des données d'exemple : la construction écrit chaque écran pour de vrai, avec ces couleurs et ces polices."}</p>{!site && (ap.principal?.blocs ?? []).some((b) => (b.images ?? []).some(Boolean)) && <p className="mt-1 text-center text-[11px] text-ink-faint">Images d'exemple créées par l'IA pour cet aperçu : tu mettras les tiennes.</p>}</div>}
            </div>
            {ideeCourte && site && <div className="mt-6 rounded-2xl border border-line bg-[#FBFAF7] p-4 sm:p-5">
              <p className="text-[15px] font-bold">Dis-en un peu plus pour un site plus riche <span className="font-normal text-ink-faint">· facultatif, 1 minute</span></p>
              <p className="mt-1 text-[13px] text-ink-soft">Ton idée est courte : avec ces réponses, Bingoo! écrit des sections qui racontent vraiment ton activité au lieu de répéter ton offre. Rien n'est inventé : ce que tu n'écris pas n'apparaîtra pas.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[["diff", `Qu'est-ce qui rend ${nom.trim() || ap.nom} différent ?`, "Ex. tout est fait maison, ouvert le dimanche, installé dans le quartier depuis 2010…"], ["deroule", "Comment ça se passe pour un client ?", "Ex. on commande la veille par téléphone, on vient sur place, on livre…"], ["infos", "Adresse, horaires et prix à afficher", "Ex. 14 rue de Gand, Lille · du mardi au dimanche, 7 h – 19 h 30 · baguette 1,20 €"]].map(([k, q, ph]) => (
                  <label key={k} className="block text-[13px] font-semibold">{q}
                    <textarea value={plus[k]} onChange={(e) => setPlus((x) => ({ ...x, [k]: e.target.value }))} placeholder={ph} rows={3} maxLength={400} className="mt-1.5 w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-[13.5px] font-normal outline-none focus:border-ink/40" />
                  </label>
                ))}
              </div>
            </div>}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <Prix ws={ws} type={idee.type} />
              <button disabled={busy || nom.trim().length < 2} onClick={() => lancer("idee")} className="rounded-full bg-accent px-7 py-3.5 text-[16px] font-bold text-white shadow-[0_12px_30px_-14px_rgba(226,85,35,.9)] disabled:opacity-50">{busy ? "Un instant…" : offert ? `Construire ${nom.trim() || ap.nom} gratuitement` : `Construire ${nom.trim() || ap.nom}`}</button>
              <p className="text-[13px] text-ink-soft">{site ? <>Bingoo! écrit tes textes, met ton site en ligne et teste ton espace gérant. Tu vérifies ensuite tes prix et tes horaires.</> : outil ? <>Bingoo! l'écrit avec un design fait pour ton idée, l'essaie clic par clic, corrige, puis le met en ligne. Tu le modifies ensuite en discutant.</> : <>Bingoo! le construit, teste chaque écran comme un vrai utilisateur, corrige, puis le met en ligne.{idee.type === "app" ? " Tu l'essaies ensuite sur ton téléphone dans Expo Go (gratuit). La publication sur l'App Store et Google Play arrive bientôt." : ""}</>}</p>
            </div>
          </section>

          {!site && idee.type !== "app" && r.proches?.length > 0 && (
            <section className="mt-10">
              <p className="text-[15px] font-bold">Pour t'inspirer, si tu veux : {r.proches.length > 1 ? `${r.proches.length} logiciels proches qui marchent déjà` : "un logiciel proche qui marche déjà"}</p>
              <p className="text-[14px] text-ink-soft">Facultatif : ton idée se construit telle quelle avec le bouton ci-dessus. Tu peux aussi partir de leur logique, qui a fait ses preuves.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">{r.proches.map((s) => (
                <div key={s.domaine} className="flex flex-col rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center gap-3"><CompanyLogo name={s.nom} url={`https://${s.domaine}`} className="h-10 w-10" pad="p-1.5" /><div className="min-w-0"><p className="truncate font-bold">{s.nom}</p><p className="text-[12.5px] text-ink-faint">{s.mrr ? <span className="font-semibold text-good">{dollars(s.mrr)} par mois, vérifié</span> : s.domaine}</p></div></div>
                  <p className="mt-2 flex-1 text-[13.5px] text-ink-soft line-clamp-3">{s.description}</p>
                  <button disabled={busy} onClick={() => lancer("inspirer", s)} className="mt-3 rounded-xl border border-ink px-3 py-2 text-[13.5px] font-bold hover:bg-ink hover:text-white">M'en inspirer</button>
                </div>
              ))}</div>
            </section>
          )}

        </>
      ); })()}
    </div>
  );
}
