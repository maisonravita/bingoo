import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { legalReady } from "./Legal";
import { cx } from "../lib/utils";

// Pages par métier : ce que le Radar surveille vraiment pour ce métier, et un essai en direct sur les données officielles.
// Rien d'inventé : pas de faux client, pas de chiffre non mesuré. Les résultats affichés viennent des vraies sources.
const URL_ = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
async function call(action, body) {
  const res = await fetch(`${URL_}/functions/v1/r/${action}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Erreur réseau, réessaie");
  return data;
}
const SERIF = { fontFamily: "Nunito, Geist, system-ui, sans-serif", fontWeight: 800, letterSpacing: "-.02em" };
const euro = (n) => n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : n >= 1e3 ? `${Math.round(n / 1e3).toLocaleString("fr-FR")} k€` : `${Math.round(n)} €`;

export const METIERS = {
  nettoyage: {
    menu: "Nettoyage",
    titre: "Les contrats de nettoyage à reprendre, des mois avant l'appel d'offres",
    sous: "Bingoo! lit chaque nuit les contrats publics et les annonces légales. Tu sais quel marché de propreté se termine, qui le tient aujourd'hui, et quelle entreprise vient de s'installer près de chez toi.",
    signaux: [
      ["Contrats publics qui se terminent", "Mairies, hôpitaux, écoles, administrations : la date de fin, le montant et le titulaire actuel."],
      ["Appels d'offres de ta zone", "Les nouvelles consultations de propreté et d'entretien, dès leur publication."],
      ["Nouveaux sites et déménagements", "Une entreprise qui s'installe ou déménage choisit son prestataire dans les semaines qui suivent."],
      ["Nouveaux dirigeants", "Un nouveau directeur revoit souvent ses contrats de services."],
    ],
    essai: { type: "contrats", secteur: "nettoyage", titre: "Les contrats de nettoyage qui se terminent dans ton département" },
  },
  securite: {
    menu: "Sécurité",
    titre: "Les contrats de sécurité à renouveler, avant tes concurrents",
    sous: "Gardiennage, surveillance, sécurité incendie : Bingoo! te montre les marchés qui arrivent à échéance, leur titulaire actuel, et les nouveaux sites à protéger.",
    signaux: [
      ["Contrats publics qui se terminent", "Les marchés de gardiennage et de surveillance à renouveler, avec le titulaire et le montant."],
      ["Appels d'offres de ta zone", "Les consultations de sécurité dès leur publication."],
      ["Nouveaux sites et chantiers", "Ouvertures d'établissements et permis de construire : des lieux à sécuriser."],
      ["Nouveaux dirigeants", "Le bon moment pour présenter une alternative au prestataire en place."],
    ],
    essai: { type: "contrats", secteur: "gardiennage", titre: "Les contrats de gardiennage qui se terminent dans ton département" },
  },
  agences: {
    menu: "Agences",
    titre: "Les entreprises qui ont besoin d'une agence, au moment où elles en cherchent une",
    sous: "Communication, web, marketing, conseil : Bingoo! repère les entreprises qui se créent, sont reprises ou ouvrent un site. C'est là qu'elles choisissent leurs partenaires.",
    signaux: [
      ["Créations d'entreprises", "Une société qui démarre a besoin d'un site, d'une marque, d'une stratégie."],
      ["Reprises", "Un nouveau propriétaire revoit l'image, les outils et les prestataires."],
      ["Nouveaux dirigeants", "Une nouvelle direction veut souvent marquer son arrivée."],
      ["Recrutements et levées de fonds", "Une entreprise qui grandit a besoin d'aide pour se faire connaître."],
    ],
    essai: { type: "entreprises", titre: "Les entreprises qui viennent de se créer ou d'être reprises dans ton département" },
  },
  logiciels: {
    menu: "Logiciels",
    titre: "Prends les clients de tes concurrents, au bon moment",
    sous: "Bingoo! lit les sites et les offres d'emploi : qui utilise un outil concurrent, qui recrute l'équipe qui utilisera ton produit, qui visite ton site.",
    signaux: [
      ["Outils concurrents installés", "Les entreprises qui utilisent déjà un concurrent, repérées sur leur site."],
      ["Recrutements liés à ton offre", "Une équipe qui grandit a besoin de nouveaux outils."],
      ["Levées de fonds", "De nouveaux moyens, de nouveaux objectifs, de nouveaux outils."],
      ["Visiteurs de ton site", "Les entreprises qui s'intéressent déjà à toi, reconnues sans cookie."],
    ],
    essai: { type: "site", titre: "Donne l'adresse de ton site : Bingoo! te montre des clients potentiels" },
  },
};

function Header() {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-30 bg-[#D6D1CD]">
      <div className="mx-auto max-w-[1440px] h-[64px] px-4 sm:px-8 flex items-center justify-between gap-4">
        <button onClick={() => nav("/accueil")} aria-label="Accueil Bingoo!"><Logo height={26} /></button>
        <div className="flex items-center gap-3 sm:gap-5 text-[16px]">
          <button onClick={() => nav("/connexion?mode=login")} className="hidden sm:inline hover:opacity-70">Se connecter</button>
          <button onClick={() => nav("/connexion")} className="rounded-lg bg-accent text-white px-4 sm:px-5 py-2.5 hover:bg-accent-dark transition">S'inscrire</button>
        </div>
      </div>
    </header>
  );
}

/** Essai en direct sur les vraies données (commande publique ou annonces légales), sans compte et sans IA. */
function Essai({ e }) {
  const nav = useNavigate();
  const [dept, setDept] = useState("");
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (e.type === "site") {
    return (
      <div className="rounded-2xl bg-[#F1EFED] p-6 sm:p-10">
        <h2 className="text-[30px] sm:text-[40px] leading-[1.08] tracking-[-.02em]" style={SERIF}>{e.titre}</h2>
        <p className="mt-4 text-[17px] text-ink-soft max-w-xl">Bingoo! lit ton site, comprend ce que tu vends et à qui, puis cherche dans les sources officielles les entreprises à contacter au bon moment.</p>
        <button onClick={() => { nav("/accueil"); setTimeout(() => document.getElementById("essai")?.scrollIntoView({ behavior: "smooth" }), 400); }} className="mt-8 rounded-lg bg-accent text-white px-7 py-4 text-[17px] hover:bg-accent-dark transition">Essayer avec mon site</button>
      </div>
    );
  }
  const go = async (ev) => {
    ev.preventDefault(); setBusy(true); setErr(""); setR(null);
    try { setR(e.type === "contrats" ? await call("free-renewals", { secteur: e.secteur, dept }) : await call("free-signals", { cible: "*", dept })); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-2xl bg-[#F1EFED] p-6 sm:p-10">
      <h2 className="text-[30px] sm:text-[40px] leading-[1.08] tracking-[-.02em]" style={SERIF}>{e.titre}</h2>
      <form onSubmit={go} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl">
        <label className="sr-only" htmlFor="m-dept">Département</label>
        <input id="m-dept" value={dept} onChange={(x) => setDept(x.target.value.toUpperCase().slice(0, 3))} placeholder="Ton département (ex. 75)" inputMode="numeric" className="flex-1 rounded-lg border border-[#8A8682] bg-white px-4 py-4 text-[17px] outline-none focus:border-ink focus:ring-2 focus:ring-ink/10" />
        <button type="submit" disabled={busy || !dept.trim()} className="rounded-lg bg-accent text-white px-7 py-4 text-[17px] hover:bg-accent-dark disabled:opacity-50 transition">{busy ? "Recherche…" : "Voir maintenant"}</button>
      </form>
      <p className="mt-3 text-[14px] text-ink-soft">Données officielles, gratuites, sans compte.</p>
      {err && <p className="mt-4 rounded-lg bg-[#FDF0EC] px-4 py-3 text-[15px] text-[#9A3412]">{err}</p>}
      {r && e.type === "contrats" && (
        <div className="mt-8">
          <p className="text-[17px]"><span className="text-[34px] leading-none tracking-[-.02em] align-[-4px]" style={SERIF}>{r.total}</span> contrat{r.total > 1 ? "s" : ""} se termine{r.total > 1 ? "nt" : ""} dans les 12 mois{r.montant_total ? <>, pour {euro(r.montant_total)} au total</> : null}.</p>
          {!r.total && <p className="mt-2 text-ink-soft">Rien dans ce département pour l'instant. Essaie un département voisin.</p>}
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            {r.visibles.map((c, i) => (
              <div key={i} className="rounded-xl bg-white p-5">
                <p className="text-[13px] text-accent-dark">Fin estimée {new Date(c.fin).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
                <p className="mt-1.5 text-[17px] leading-snug" style={SERIF}>{c.acheteur}</p>
                <p className="mt-1 text-[14px] text-ink-soft line-clamp-3">{c.objet}</p>
                <p className="mt-2 text-[13.5px]">{c.montant ? euro(c.montant) : null}{c.titulaire ? <span className="text-ink-soft">{c.montant ? " · " : ""}titulaire : {c.titulaire}</span> : null}</p>
              </div>
            ))}
          </div>
          {r.caches > 0 && <Suite n={r.caches} quoi="contrat" />}
        </div>
      )}
      {r && e.type === "entreprises" && (
        <div className="mt-8">
          <p className="text-[17px]"><span className="text-[34px] leading-none tracking-[-.02em] align-[-4px]" style={SERIF}>{r.total}</span> entreprise{r.total > 1 ? "s" : ""} créée{r.total > 1 ? "s" : ""} ou reprise{r.total > 1 ? "s" : ""} {r.jours > 1 ? `ces ${r.jours} derniers jours` : "ces dernières 24 heures"}.</p>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            {r.visibles.map((c, i) => (
              <div key={i} className="rounded-xl bg-white p-5">
                <p className="text-[13px] text-accent-dark">{c.signal} · {new Date(c.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
                <p className="mt-1.5 text-[17px] leading-snug" style={SERIF}>{c.nom}</p>
                <p className="mt-1 text-[14px] text-ink-soft line-clamp-3">{c.activite}</p>
                <p className="mt-2 text-[13.5px] text-ink-soft">{c.ville}</p>
              </div>
            ))}
          </div>
          {r.caches > 0 && <Suite n={r.caches} quoi="entreprise" />}
        </div>
      )}
    </div>
  );
}

function Suite({ n, quoi }) {
  const nav = useNavigate();
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5">
      <p className="text-[15px]">{n} autre{n > 1 ? "s" : ""} {quoi}{n > 1 ? "s" : ""}, avec la personne à contacter et le message prêt, dans ton compte.</p>
      <button onClick={() => nav("/connexion")} className="rounded-lg bg-[#1C1C1C] text-white px-5 py-3 text-[15px] hover:bg-black transition">Créer mon compte gratuit</button>
    </div>
  );
}

export default function Metier({ slug }) {
  const nav = useNavigate();
  const m = METIERS[slug] ?? METIERS.nettoyage;
  useEffect(() => { document.title = `Bingoo! pour ${m.menu.toLowerCase()} : ${m.titre}`; window.scrollTo(0, 0); }, [slug]);
  return (
    <div className="min-h-full bg-[#FAF9F6] text-ink">
      <div className="bg-[#D6D1CD]">
        <Header />
        <div className="px-0 sm:px-8">
          <section className="mx-auto max-w-[1440px] bg-white px-5 sm:px-10 pt-14 sm:pt-20 pb-14 sm:pb-16">
            <nav className="flex flex-wrap gap-2 text-[14px]" aria-label="Métiers">
              {Object.entries(METIERS).map(([k, x]) => <a key={k} href={`#/metier/${k}`} className={cx("rounded-full px-3.5 py-1.5 border", k === slug ? "bg-ink text-white border-ink" : "border-black/15 hover:bg-black/[.04]")}>{x.menu}</a>)}
            </nav>
            <h1 className="mt-8 max-w-[1000px] text-[40px] sm:text-[60px] lg:text-[72px] leading-[1.03] tracking-[-.03em]" style={SERIF}>{m.titre}</h1>
            <p className="mt-6 max-w-[700px] text-[18px] sm:text-[20px] leading-[1.5]">{m.sous}</p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <button onClick={() => nav("/connexion")} className="rounded-lg bg-[#1C1C1C] text-white px-8 py-4 text-[18px] hover:bg-black transition">Commencer gratuitement</button>
              <a href={`#/metier/${slug}`} onClick={(ev) => { ev.preventDefault(); document.getElementById("essai")?.scrollIntoView({ behavior: "smooth" }); }} className="rounded-lg bg-white border border-black/15 px-8 py-4 text-[18px] text-center hover:bg-[#FAFAF9] transition">Voir les données de mon secteur</a>
            </div>
          </section>
        </div>
      </div>

      <main className="mx-auto max-w-[1300px] px-5 sm:px-10">
        <section className="py-16 sm:py-24">
          <h2 className="text-[32px] sm:text-[44px] leading-[1.08] tracking-[-.02em]" style={SERIF}>Ce que Bingoo! surveille pour toi</h2>
          <div className="mt-10 grid sm:grid-cols-2 gap-x-12 gap-y-10">
            {m.signaux.map(([t, d]) => (
              <div key={t} className="border-t border-black/15 pt-5">
                <p className="text-[21px]" style={SERIF}>{t}</p>
                <p className="mt-2 text-[16px] text-ink-soft leading-[1.5]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="essai" className="scroll-mt-24 pb-16 sm:pb-24"><Essai e={m.essai} /></section>

        <section className="pb-16 sm:pb-24 grid md:grid-cols-3 gap-10">
          {[["Il repère", "Chaque nuit, le Radar lit les sources officielles et le web, et garde ce qui concerne ton métier."], ["Il trouve la bonne personne", "La fonction qui décide, avec son e-mail, son téléphone et son profil LinkedIn quand ils sont trouvables."], ["Il écrit, tu valides", "Un message qui part du signal. Rien ne part sans ton accord."]].map(([t, d]) => (
            <div key={t}><p className="text-[22px]" style={SERIF}>{t}</p><p className="mt-2 text-[16px] text-ink-soft leading-[1.5]">{d}</p></div>
          ))}
        </section>

        <section className="pb-24 text-center">
          <p className="text-[34px] sm:text-[48px] leading-[1.05] tracking-[-.02em]" style={SERIF}>Une longueur d'avance sur tes prochains clients.</p>
          <button onClick={() => nav("/connexion")} className="mt-8 rounded-lg bg-accent text-white px-9 py-4 text-[18px] hover:bg-accent-dark transition">Commencer gratuitement</button>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-[14px] text-ink-soft">
          <Logo height={28} />
          <div className="flex flex-wrap gap-5">
            <a href="#/accueil" className="hover:text-ink">Accueil</a>
            <a href="#/outils" className="hover:text-ink">Outils gratuits</a>
            {legalReady && <><a href="#/mentions-legales" className="hover:text-ink">Mentions légales</a><a href="#/confidentialite" className="hover:text-ink">Confidentialité</a></>}
          </div>
        </div>
      </footer>
    </div>
  );
}
