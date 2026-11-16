import { useState } from "react";
import CompanyLogo from "./CompanyLogo";
import Favori from "./Favori";
import { cx } from "../lib/utils";

// Cartes de l'Explorer (SaaS et applis) : logo, revenu, description, catégorie, image du produit,
// puis les chiffres clés, et en bas le cœur et « Ouvrir la fiche ».
const $ = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M$` : n >= 1e4 ? `${Math.round(n / 1e3)} k$` : `${Math.round(n).toLocaleString("fr-FR")} $`);
const nb = (n) => (n == null ? "—" : n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : n >= 1e3 ? `${(n / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k` : String(n));
const drapeau = (c) => (c && /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(...[...c].map((x) => 127397 + x.charCodeAt(0))) : "");
const cibleDe = (c) => (/b2b|entreprise|professionnel|équipe|business/i.test(c ?? "") ? "B2B" : /b2c|particulier|grand public|consommateur/i.test(c ?? "") ? "B2C" : null);

function Visuel({ src, nom, url, logo }) {
  const [bad, setBad] = useState(false);
  return (
    <div className="mt-3 aspect-[16/10] overflow-hidden rounded-xl border border-line bg-paper">
      {src && !bad ? <img src={src} alt={`Aperçu de ${nom}`} loading="lazy" onError={() => setBad(true)} className="h-full w-full object-cover object-top" />
        : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-paper to-white">{logo ?? <CompanyLogo name={nom} url={url} className="w-16 h-16" pad="p-2" />}</div>}
    </div>
  );
}

function Anneau({ valeur, max, libelle, texte }) {
  const p = Math.max(0, Math.min(1, valeur / max));
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="#EDEDED" strokeWidth="3.5" /><circle cx="18" cy="18" r="15.5" fill="none" stroke="#E8571C" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${p * 97.4} 97.4`} /></svg>
        <div className="absolute inset-0 grid place-items-center text-center leading-none"><span className="text-[17px] font-black tnum">{texte}</span></div>
      </div>
      <p className="text-[11px] font-bold tracking-wider text-ink-faint uppercase">{libelle}</p>
    </div>
  );
}

function Carte({ entete, badge, sousTitre, description, tags, visuel, chiffres, favori, ouvrir, libelleOuvrir = "Ouvrir la fiche" }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white p-4 hover:border-ink/25 transition">
      <div className="flex items-center gap-2.5 min-w-0">{entete}<div className="ml-auto shrink-0">{badge}</div></div>
      {sousTitre}
      <div className="mt-3 border-t border-line pt-3">
        {description ? <p className="text-[14px] leading-snug text-ink line-clamp-3 min-h-[3.9em]">{description}</p> : <p className="text-[13.5px] italic text-ink-faint min-h-[3.9em]">Description en cours de lecture</p>}
      </div>
      {tags?.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{tags}</div>}
      {visuel}
      <div className="mt-3 rounded-xl bg-paper/70 border border-line p-3">{chiffres}</div>
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        {favori}
        <button onClick={ouvrir} className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-[13.5px] font-bold text-white hover:bg-ink/85">{libelleOuvrir} <span aria-hidden>↗</span></button>
      </div>
    </div>
  );
}

const Tag = ({ children, fonce }) => <span className={cx("rounded-full px-2.5 py-1 text-[12px] font-semibold", fonce ? "bg-ink text-white" : "bg-accent/10 text-accent-dark")}>{children}</span>;

// Sans IA, certains noms sont la phrase d'accroche du site : on affiche alors le nom tiré de l'adresse (fireworks.ai → Fireworks)
const nomDe = (s) => {
  const n = String(s.nom ?? "").trim();
  if (n && n.split(/\s+/).length <= 4 && n.length <= 32) return n;
  const base = String(s.domaine ?? "").split(".")[0];
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : n;
};

export function CarteSaas({ s: brut, ouvrir, debloquer }) {
  const s = { ...brut, nom: nomDe(brut) };
  const mrr = Number(s.succes?.mrr ?? 0) || Number(s.succes?.revenu_30j ?? 0) || (s.succes?.montant ? Number(s.succes.montant) / 12 : 0);
  const verifie = s.succes?.type === "revenu_verifie";
  const cible = cibleDe(s.cible);
  const facile = s.copiable > 0 ? Math.max(1, Math.min(10, 11 - Math.round(s.copiable / 10))) : null;
  return (
    <Carte
      entete={<><CompanyLogo name={s.nom} url={`https://${s.domaine}`} className="w-10 h-10 shrink-0" pad="p-1.5" /><div className="min-w-0"><p className="font-bold text-[16px] leading-tight truncate">{s.nom}</p><p className="text-[12px] text-ink-faint truncate">{s.domaine}</p></div></>}
      badge={s.vitrine ? <button onClick={(e) => { e.stopPropagation(); debloquer?.(); }} className="rounded-full bg-gradient-to-r from-[#E8571C] to-[#F59E0B] px-3 py-1.5 text-[12.5px] font-bold text-white">🔒 Voir le revenu</button>
        : mrr > 0 ? <span className="rounded-xl bg-paper px-2.5 py-1.5 text-[14px] font-black tnum">{$(mrr)} <span className="text-[11.5px] font-medium text-ink-faint">/mois</span></span> : null}
      sousTitre={(s.pays || mrr > 0) && <p className="mt-2 text-[12.5px] text-ink-soft">{drapeau(s.pays)} {mrr > 0 ? <span className={verifie ? "font-semibold text-[#166534]" : "text-ink-soft"}>{verifie ? "Revenu vérifié" : "Revenu public"}</span> : null}</p>}
      description={s.description}
      tags={[s.categorie && <Tag key="c">{s.categorie}</Tag>, cible && <Tag key="b" fonce>{cible}</Tag>, s.en_decollage && <Tag key="d">En décollage</Tag>].filter(Boolean)}
      visuel={<Visuel src={s.image} nom={s.nom} url={`https://${s.domaine}`} />}
      chiffres={
        <div className="flex items-center gap-3">
          {facile != null ? <Anneau valeur={11 - facile} max={10} texte={<>{facile}<span className="block text-[9px] font-medium text-ink-faint">/10</span></>} libelle="Difficulté" /> : null}
          <div className="min-w-0 flex-1 grid grid-cols-2 gap-2 text-[12px]">
            <div><p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">Revenu</p><p className="mt-0.5 font-black text-[15px] tnum">{s.vitrine ? "🔒" : mrr > 0 ? `${$(mrr)}` : <span className="text-[12.5px] font-medium text-ink-faint">non public</span>}</p></div>
            <div><p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">Prix</p><p className="mt-0.5 font-black text-[15px] tnum">{s.prix_entree_eur != null ? `${s.prix_entree_eur} €` : <span className="text-[12.5px] font-medium text-ink-faint">{s.gratuit ? "gratuit" : s.sur_devis ? "sur devis" : "—"}</span>}</p></div>
          </div>
        </div>
      }
      favori={<Favori id={s.id} nom={s.nom} />}
      ouvrir={ouvrir}
    />
  );
}

export function CarteAppli({ a }) {
  const ouvrir = () => window.open(a.url, "_blank", "noopener");
  return (
    <Carte
      entete={<>{a.icone ? <img src={a.icone} alt="" loading="lazy" className="w-10 h-10 rounded-xl border border-line shrink-0" /> : <span className="w-10 h-10 rounded-xl bg-paper shrink-0" />}<div className="min-w-0"><p className="font-bold text-[16px] leading-tight truncate">{a.nom}</p><p className="text-[12px] text-ink-faint truncate">{a.editeur}</p></div></>}
      badge={a.rang_revenus ? <span className="rounded-xl bg-[#FEF3C7] px-2.5 py-1.5 text-[12.5px] font-black text-[#92400E]">{a.rang_revenus}ᵉ recettes</span> : a.prix > 0 ? <span className="rounded-xl bg-paper px-2.5 py-1.5 text-[13px] font-black tnum">{a.prix.toLocaleString("fr-FR")} $</span> : null}
      sousTitre={a.rang_revenus && a.rang_pays ? <p className="mt-2 text-[12.5px] text-ink-soft">Classement des recettes · {a.rang_pays}</p> : null}
      description={a.description}
      tags={[a.categorie && <Tag key="c">{a.categorie}</Tag>, a.abonnement && <Tag key="a" fonce>Abonnement</Tag>].filter(Boolean)}
      visuel={<Visuel src={a.capture} nom={a.nom} logo={a.icone ? <img src={a.icone} alt="" className="w-16 h-16 rounded-2xl" /> : null} />}
      chiffres={
        <div className="flex items-center gap-3">
          {a.note != null && <Anneau valeur={Number(a.note)} max={5} texte={Number(a.note).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} libelle="Note ★" />}
          <div className="min-w-0 flex-1 grid grid-cols-2 gap-2 text-[12px]">
            <div><p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">Avis</p><p className="mt-0.5 font-black text-[15px] tnum">{nb(a.avis)}</p></div>
            <div><p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">Prix</p><p className="mt-0.5 font-black text-[15px] tnum">{a.prix > 0 ? `${a.prix.toLocaleString("fr-FR")} $` : "Gratuite"}</p></div>
          </div>
        </div>
      }
      favori={<Favori type="appli" id={a.id} nom={a.nom} />}
      ouvrir={ouvrir}
      libelleOuvrir="Voir sur l'App Store"
    />
  );
}
