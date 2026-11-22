import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { CarteSaas } from "../components/Cartes";
import { supabase } from "../lib/supabase";
import { CompteAvant } from "./Landing";

// « Pas d'idée ? Découvre les SaaS qui marchent déjà » : une page publique, sans compte.
// En clair : quelques géants impossibles à refaire seul et deux SaaS faciles à lancer (revenu, prix, difficulté).
// Le reste est flouté avec un cadenas : le serveur n'envoie que leur catégorie, rien d'identifiable.
const JK = { fontFamily: "'Plus Jakarta Sans', Geist, system-ui, sans-serif" };
const FAUX = ["Saasify Pro", "Bookeasy", "Flowmate", "Clientio", "Postwise", "Invoicely"];
const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };

export default function Decouvrir() {
  const nav = useNavigate();
  const [d, setD] = useState(null), [compte, setCompte] = useState(null);
  const [nb, setNb] = useState(null);
  useEffect(() => {
    supabase.rpc("saas_decouvrir").then(({ data }) => setD(data ?? { clairs: [], floutes: [], total: 0 }));
    // Même compteur que l'accueil : SaaS et applis suivis
    supabase.rpc("saas_stats_entete").then(({ data }) => { if (data?.total) setNb(Number(data.total) + Number(data.applis ?? 0)); });
  }, []);
  // Un clic sur un SaaS : le compte d'abord, puis sa fiche (ou l'Explorer complet)
  const ouvrir = async (vers, quoi) => {
    ecrire("bingoo-depart", { vers, at: Date.now() });
    const { data } = await supabase.auth.getSession();
    if (data.session && !data.session.user?.is_anonymous) { nav(vers); return; }
    setCompte({ vers, quoi });
  };
  const total = nb ? Math.floor(nb / 1000) * 1000 : d?.total ? Math.floor(d.total / 1000) * 1000 : null;
  const geants = (d?.clairs ?? []).filter((s) => (s.difficulte ?? 0) >= 5 || Number(s.succes?.montant ?? 0) >= 1e9);
  const faciles = (d?.clairs ?? []).filter((s) => !geants.includes(s));
  const carte = (s) => <CarteSaas key={s.domaine} s={{ ...s, id: s.domaine, libre: true }} ouvrir={() => ouvrir(`/explorer/${s.domaine}`, `Crée ton compte gratuit pour ouvrir la fiche de ${s.nom} et construire ta version.`)} />;
  const titre = (t, sous) => <div className="mt-12"><h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[#1E2030]">{t}</h2><p className="mt-1 text-[15px] text-[#5B6075]">{sous}</p></div>;

  return (
    <div className="min-h-full bg-[#F6F5F2] text-ink" style={JK}>
      <header className="sticky top-0 z-30 px-3 sm:px-6 pt-3">
        <div className="mx-auto flex h-[60px] max-w-[1180px] items-center justify-between gap-3 rounded-full bg-[#15171F]/95 pl-5 pr-2 text-white shadow-[0_18px_40px_-22px_rgba(0,0,0,.7)] backdrop-blur">
          <button onClick={() => nav("/")} aria-label="Bingoo!"><Logo height={28} inverse /></button>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[14px] sm:text-[15px] font-semibold whitespace-nowrap">
            <button onClick={() => nav("/connexion?mode=login")} className="rounded-full px-3 sm:px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10">Se connecter</button>
            <button onClick={() => ouvrir("/explorer", "Crée ton compte gratuit pour explorer les SaaS qui marchent.")} className="rounded-full bg-white text-[#15171F] px-4 sm:px-5 py-2.5 hover:bg-white/90"><span className="sm:hidden">Commencer</span><span className="hidden sm:inline">Commencer gratuitement</span></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 sm:px-6 pb-24 pt-10 sm:pt-14">
        <p className="text-[13px] font-bold uppercase tracking-[.16em] text-accent">Pas d'idée ? Pars de ce qui marche</p>
        <h1 className="mt-2 max-w-[820px] text-[34px] sm:text-[52px] font-bold leading-[1.05] tracking-[-.02em] text-[#1E2030]">{total ? `${Math.floor(total / 1000)}K SaaS et applis, avec leurs revenus.` : "Des milliers de SaaS et d'applis, avec leurs revenus."}</h1>
        <p className="mt-3 max-w-[720px] text-[17px] leading-relaxed text-[#3A3F55]">Leurs revenus, leurs prix, et ce qu'il faut pour les refaire. Choisis celui qui te plaît : Bingoo! construit ta version, à ton nom.</p>

        {!d ? <div className="mt-16 grid place-items-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div> : <>
          {geants.length > 0 && <>{titre("Les géants, pour te donner l'échelle", "Impossibles à refaire seul, mais ils montrent ce que rapporte un logiciel. Chiffres en clair.")}
            <div className={`mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 ${geants.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>{geants.map(carte)}</div></>}
          {faciles.length > 0 && <>{titre("Faciles à lancer, et ils encaissent déjà", "Deux exemples en clair : revenu vérifié, prix, difficulté. Bingoo! sait construire ta version.")}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{faciles.map(carte)}</div></>}
          {titre(`Et ${total ? `plus de ${Math.floor(total / 1000) - 1}K` : "des milliers d'"} autres`, "Les plus rentables et les plus faciles à refaire sont réservés aux membres.")}
          <div className="relative mt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(d.floutes ?? []).slice(0, 12).map((f, i) => <CarteSaas key={i} s={{ id: `f${i}`, domaine: "exemple.com", nom: FAUX[i % FAUX.length], categorie: f.categorie, vitrine: true }} debloquer={() => ouvrir("/explorer", "Crée ton compte gratuit pour débloquer les SaaS qui marchent.")} />)}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#F6F5F2] to-transparent" aria-hidden />
          </div>
          <div className="mt-8 rounded-3xl bg-[#15171F] px-6 py-10 text-center text-white">
            <p className="text-[26px] sm:text-[32px] font-bold leading-tight">Débloque tous les SaaS qui marchent</p>
            <p className="mx-auto mt-2 max-w-[560px] text-[15.5px] text-white/75">Leurs noms, leurs revenus vérifiés, leurs prix et ce qu'il faut pour les refaire. Puis Bingoo! construit ta version.</p>
            <button onClick={() => ouvrir("/explorer", "Crée ton compte gratuit pour débloquer les SaaS qui marchent.")} className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-[16px] font-bold text-white hover:brightness-110">Créer mon compte gratuit</button>
          </div>
        </>}
      </main>

      {compte && createPortal(
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[#15171F]/45 px-4 py-10 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setCompte(null)}>
          <div className="w-full max-w-[560px]" onClick={(e) => e.stopPropagation()}><CompteAvant quoi={compte.quoi} retourTexte="← Retour" onRetour={() => setCompte(null)} onFini={() => nav(compte.vers)} /></div>
        </div>, document.body)}
    </div>
  );
}
