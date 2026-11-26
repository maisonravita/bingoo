import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alerte, Badge, Button, Card, Case, Empty, Erreur, Fenetre, Field, Input, Interrupteur, Menu, Onglets, Progression, Select, Squelette, Tableau, Textarea, ToastProvider, useToast } from "../components/ui";
import { LineChart } from "../components/Charts";
import { cx } from "../lib/utils";
import Logo from "../components/Logo";

/* Le design system de Bingoo! : chaque bloc ci-dessous est le vrai composant utilisé dans
   l'application (src/components/ui.jsx), branché sur les jetons de src/index.css. */

const JETONS = [
  ["ink", "Texte principal"], ["ink-soft", "Texte secondaire"], ["ink-faint", "Texte discret"],
  ["paper", "Fond de page"], ["surface", "Cartes et champs"], ["line", "Bordures"],
  ["accent", "Orange Bingoo!"], ["accent-dark", "Orange pour du texte"], ["accent-soft", "Orange doux"],
  ["good", "Succès"], ["warn", "Attention"], ["bad", "Erreur"], ["info", "Information"],
];
// Paires texte / fond réellement utilisées, contrôlées en direct (WCAG 2.2 AA : 4,5:1 pour le texte, 3:1 pour les grands titres et éléments graphiques)
const PAIRES = [
  ["ink", "paper", 4.5], ["ink-soft", "paper", 4.5], ["ink-faint", "paper", 4.5], ["ink-soft", "surface", 4.5],
  ["accent-dark", "surface", 4.5], ["accent-dark", "accent-soft", 4.5], ["good", "good-soft", 4.5], ["warn", "warn-soft", 4.5],
  ["bad", "bad-soft", 4.5], ["info", "info-soft", 4.5], ["accent", "surface", 3], ["blanc", "accent", 4.5, "texte des boutons orange"], ["line", "surface", 1, "décoratif"],
];

function lum(rgb) {
  const c = rgb.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

function useJetons(ref, theme) {
  const [v, setV] = useState({});
  useLayoutEffect(() => {
    if (!ref.current) return;
    const cs = getComputedStyle(ref.current);
    const o = {};
    for (const n of ["ink", "ink-soft", "ink-faint", "paper", "surface", "line", "accent", "accent-dark", "accent-soft", "good", "good-soft", "warn", "warn-soft", "bad", "bad-soft", "info", "info-soft"]) o[n] = cs.getPropertyValue(`--${n}`).trim().split(/\s+/).map(Number);
    setV(o);
  }, [ref, theme]);
  return v;
}
const hex = (rgb) => "#" + (rgb ?? []).map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();

function Section({ id, titre, sous, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-20 border-t border-line py-12">
      <div className="mb-6 max-w-2xl">
        <h2 id={`${id}-t`} className="text-[26px] font-extrabold tracking-tight text-ink">{titre}</h2>
        {sous && <p className="mt-1.5 text-[15px] text-ink-soft">{sous}</p>}
      </div>
      {children}
    </section>
  );
}

const EXEMPLE = [12, 18, 15, 22, 27, 24, 31, 29, 36, 41, 38, 46].map((v, i) => ({ v, label: `${i + 1} nov.` }));

function Contenu({ theme, setTheme }) {
  const toast = useToast();
  const racine = useRef(null);
  const j = useJetons(racine, theme);
  const [onglet, setOnglet] = useState("apercu");
  const [fen, setFen] = useState(false);
  const [notif, setNotif] = useState(true);
  const [email, setEmail] = useState("jean@");
  const [chargement, setChargement] = useState(false);
  const emailFaux = email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email);

  return (
    <div ref={racine} data-theme={theme} className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <a href="/" className="flex items-center gap-3"><Logo height={26} inverse={theme === "dark"} /><span className="border-l border-line pl-3 text-sm font-semibold text-ink-soft">Design system</span></a>
          <Onglets label="Thème" valeur={theme} onChange={setTheme} onglets={[{ id: "light", label: "Clair" }, { id: "dark", label: "Sombre" }]} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <div className="py-14">
          <p className="text-sm font-semibold text-accent-dark">Version 1 · novembre 2026</p>
          <h1 className="mt-2 max-w-3xl text-[44px] font-black leading-[1.05] tracking-tight">Les briques communes de Bingoo!</h1>
          <p className="mt-4 max-w-2xl text-[17px] text-ink-soft">Mêmes couleurs, mêmes composants, mêmes règles d'accessibilité partout : site, application et projets construits. Tout ce qui est sur cette page est le vrai composant, en clair et en sombre.</p>
          <nav aria-label="Sommaire" className="mt-6 flex flex-wrap gap-2 text-sm">
            {[["couleurs", "Couleurs"], ["typo", "Typographie"], ["espaces", "Espaces et formes"], ["boutons", "Boutons"], ["formulaires", "Formulaires"], ["navigation", "Navigation"], ["fenetres", "Fenêtres"], ["donnees", "Tableaux et graphiques"], ["notifications", "Notifications"], ["etats", "Chargement, erreur, vide"], ["clavier", "Clavier"], ["animations", "Animations"]].map(([id, l]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-line bg-surface px-3 py-1.5 font-medium text-ink-soft hover:text-ink">{l}</a>
            ))}
          </nav>
        </div>

        <Section id="couleurs" titre="Couleurs" sous="Des couleurs nommées par leur rôle, pas par leur teinte. Le thème sombre change les valeurs, jamais les noms.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {JETONS.map(([n, l]) => (
              <div key={n} className="overflow-hidden rounded-carte border border-line bg-surface">
                <div className="h-16 border-b border-line" style={{ background: `rgb(var(--${n}))` }} />
                <div className="px-3 py-2.5"><p className="text-sm font-semibold">{l}</p><p className="font-mono text-xs text-ink-soft">{n} · {hex(j[n])}</p></div>
              </div>
            ))}
          </div>
          <h3 className="mt-10 text-base font-bold">Contrastes, mesurés en direct sur cette page</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PAIRES.map(([t, f, min, note]) => {
              const c = (n) => (n === "blanc" ? [255, 255, 255] : j[n]); const r = c(t) && c(f) ? ratio(c(t), c(f)) : 0; const ok = r >= min; const doux = note && min === 1;
              return (
                <div key={t + f} className="flex items-center gap-3 rounded-champ border border-line bg-surface p-2.5">
                  <span className="grid h-10 w-14 shrink-0 place-items-center rounded-lg text-sm font-bold" style={{ background: `rgb(var(--${f}))`, color: t === "blanc" ? "#fff" : `rgb(var(--${t}))` }}>Aa</span>
                  <div className="min-w-0 flex-1 text-xs"><p className="truncate font-mono text-ink">{t} / {f}</p><p className="text-ink-soft">{note ?? (min === 3 ? "grands textes, icônes" : "texte courant")}</p></div>
                  <span className={cx("tnum rounded-full px-2 py-0.5 text-xs font-bold", doux ? "bg-paper text-ink-soft" : ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad")}>{r.toFixed(2).replace(".", ",")}:1</span>
                </div>
              );
            })}
          </div>
        </Section>

        <Section id="typo" titre="Typographie" sous="Une seule police, Plus Jakarta Sans. Les titres sont très gras et serrés, le texte reste en regular, 15 px minimum.">
          <div className="divide-y divide-line rounded-carte border border-line bg-surface">
            {[["Titre de page", "text-[44px] font-black leading-[1.05] tracking-tight", "44 / 900"], ["Titre de section", "text-[26px] font-extrabold tracking-tight", "26 / 800"], ["Titre de carte", "text-lg font-bold", "18 / 700"], ["Texte courant, lisible sur tous les écrans", "text-[15px]", "15 / 400"], ["Texte secondaire et légendes", "text-[13px] text-ink-soft", "13 / 400"]].map(([t, c, m]) => (
              <div key={m} className="flex items-baseline justify-between gap-6 px-5 py-4"><p className={cx("min-w-0 truncate", c)}>{t}</p><span className="shrink-0 font-mono text-xs text-ink-faint">{m}</span></div>
            ))}
          </div>
        </Section>

        <Section id="espaces" titre="Espaces et formes" sous="Une grille de 4 px. Trois arrondis seulement : champs, cartes, fenêtres. Les boutons sont en pilule.">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="space-y-2.5">
                {[4, 8, 12, 16, 24, 32, 48, 64].map((n) => <div key={n} className="flex items-center gap-3"><span className="w-10 font-mono text-xs text-ink-soft">{n}</span><span className="h-3 rounded-sm bg-accent/80" style={{ width: n * 3 }} /></div>)}
              </div>
            </Card>
            <div className="grid grid-cols-3 gap-3">
              {[["rounded-champ", "Champs", "12 px"], ["rounded-carte", "Cartes", "16 px"], ["rounded-fenetre", "Fenêtres", "20 px"]].map(([c, l, v]) => (
                <div key={c} className="text-center"><div className={cx("aspect-square border-2 border-ink/70 bg-surface", c)} /><p className="mt-2 text-sm font-semibold">{l}</p><p className="font-mono text-xs text-ink-soft">{v}</p></div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="boutons" titre="Boutons" sous="Un seul bouton principal par écran. Le focus clavier se voit toujours (anneau orange).">
          <Card className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="accent">Construire mon idée</Button><Button variant="primary">Enregistrer</Button><Button>Annuler</Button><Button variant="ghost">Plus tard</Button><Button variant="danger">Supprimer</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Petit</Button><Button>Moyen</Button><Button size="lg" variant="primary">Grand</Button>
              <Button size="icone" aria-label="Rechercher"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg></Button>
              <Button variant="primary" loading={chargement} onClick={() => { setChargement(true); setTimeout(() => setChargement(false), 1800); }}>{chargement ? "Envoi…" : "Envoyer"}</Button>
              <Button disabled>Indisponible</Button>
            </div>
            <div className="flex flex-wrap gap-2"><Badge>Brouillon</Badge><Badge tone="accent">Nouveau</Badge><Badge tone="good">En ligne</Badge><Badge tone="warn">À vérifier</Badge><Badge tone="bad">Hors ligne</Badge><Badge tone="info">Info</Badge></div>
          </Card>
        </Section>

        <Section id="formulaires" titre="Formulaires" sous="Chaque champ a un libellé visible. L'erreur dit quoi corriger et elle est lue par les lecteurs d'écran.">
          <Card className="grid gap-5 p-6 md:grid-cols-2">
            <Field label="Nom du projet" hint="Visible par tes clients."><Input defaultValue="Atelier Nord" /></Field>
            <Field label="Adresse e-mail" error={emailFaux ? "Il manque la fin de l'adresse, par exemple jean@atelier-nord.fr." : null}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Type de projet"><Select defaultValue="site"><option value="saas">SaaS</option><option value="site">Site web</option><option value="outil">Outil ou jeu</option><option value="video">Vidéo</option></Select></Field>
            <Field label="Désactivé"><Input disabled value="Lecture seule" readOnly /></Field>
            <Field label="Description" className="md:col-span-2"><Textarea rows={3} placeholder="Décris ton idée en une phrase" /></Field>
            <div className="flex flex-wrap items-center gap-6 md:col-span-2"><Case label="Recevoir le récapitulatif" defaultChecked /><Case label="Rendre public" /><Interrupteur checked={notif} onChange={setNotif} label="Notifications" /></div>
          </Card>
        </Section>

        <Section id="navigation" titre="Navigation" sous="Onglets et menus se pilotent au clavier : flèches, Début, Fin, Échap.">
          <Card className="flex flex-wrap items-start gap-6 p-6">
            <Onglets label="Vue du projet" valeur={onglet} onChange={setOnglet} onglets={[{ id: "apercu", label: "Aperçu" }, { id: "visites", label: "Visites" }, { id: "clients", label: "Clients" }, { id: "reglages", label: "Réglages" }]} />
            <Menu libelle="Actions" items={[{ label: "Renommer", raccourci: "R" }, { label: "Dupliquer", raccourci: "D" }, { label: "Partager le lien" }, { label: "Supprimer", danger: true }]} />
          </Card>
        </Section>

        <Section id="fenetres" titre="Fenêtres" sous="Le focus reste dans la fenêtre, Échap la ferme, et il revient sur le bouton qui l'a ouverte.">
          <Card className="p-6"><Button variant="primary" onClick={() => setFen(true)}>Ouvrir la fenêtre</Button></Card>
          <Fenetre ouverte={fen} onFermer={() => setFen(false)} titre="Mettre Atelier Nord en ligne ?" actions={<><Button onClick={() => setFen(false)}>Annuler</Button><Button variant="accent" onClick={() => { setFen(false); toast("Atelier Nord est en ligne", "good"); }}>Mettre en ligne</Button></>}>
            Le site sera visible à son adresse. Tu pourras le modifier ou le retirer quand tu veux.
          </Fenetre>
        </Section>

        <Section id="donnees" titre="Tableaux et graphiques" sous="Vrais en-têtes de colonnes, chiffres alignés à droite, défilement horizontal sur mobile. Données d'exemple.">
          <div className="grid gap-6 lg:grid-cols-2">
            <Tableau legende="Pages les plus visitées (exemple)" colonnes={[{ cle: "page", titre: "Page" }, { cle: "vues", titre: "Vues", droite: true }, { cle: "etat", titre: "État", rendu: (l) => <Badge tone={l.etat === "En ligne" ? "good" : "warn"}>{l.etat}</Badge> }]}
              lignes={[{ page: "Accueil", vues: 412, etat: "En ligne" }, { page: "Réalisations", vues: 268, etat: "En ligne" }, { page: "Méthode", vues: 131, etat: "En ligne" }, { page: "Contact", vues: 97, etat: "À vérifier" }]} />
            <Card className="p-5"><p className="mb-3 text-sm font-semibold">Visites (exemple)</p><LineChart points={EXEMPLE} /></Card>
          </div>
        </Section>

        <Section id="notifications" titre="Notifications" sous="Dans la page pour ce qui dure, en bas de l'écran pour confirmer une action.">
          <div className="grid gap-3 md:grid-cols-2">
            <Alerte titre="Ton domaine est en cours de vérification">Ça prend en général quelques minutes.</Alerte>
            <Alerte ton="good" titre="Paiements activés">Ton Stripe est bien relié.</Alerte>
            <Alerte ton="warn" titre="Il manque tes horaires">Ajoute-les pour qu'ils apparaissent sur le site.</Alerte>
            <Alerte ton="bad" titre="La mise en ligne a échoué" action={<Button size="sm">Réessayer</Button>}>Le nom de domaine ne répond pas.</Alerte>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => toast("Modifications enregistrées", "good")}>Afficher une confirmation</Button><Button onClick={() => toast("Projet supprimé", "default", { label: "Annuler", run: () => toast("Projet restauré", "good") })}>Avec « Annuler »</Button></div>
        </Section>

        <Section id="etats" titre="Chargement, erreur, vide" sous="Jamais d'écran blanc : on montre ce qui arrive, ce qui a échoué, ou quoi faire ensuite.">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-6 p-6"><p className="text-sm font-semibold">Chargement</p><Squelette lignes={4} /><Progression valeur={64} label="Construction du site" /></Card>
            <Card><Erreur onReessayer={() => toast("Nouvelle tentative…")}>La connexion à ton Stripe a été refusée. Vérifie la clé puis réessaie.</Erreur></Card>
            <Card><Empty title="Pas encore de projet" action={<Button variant="accent">Construire mon idée</Button>}>Donne ton idée, Bingoo! la construit.</Empty></Card>
          </div>
        </Section>

        <Section id="clavier" titre="Clavier" sous="Tout se fait sans souris.">
          <div className="overflow-hidden rounded-carte border border-line bg-surface">
            {[["Tab / Maj + Tab", "Passer d'un élément à l'autre, dans l'ordre de lecture"], ["Entrée / Espace", "Activer un bouton, cocher une case"], ["← →", "Changer d'onglet"], ["↑ ↓ · Début · Fin", "Se déplacer dans un menu"], ["Échap", "Fermer un menu ou une fenêtre"]].map(([k, d]) => (
              <div key={k} className="flex items-center gap-4 border-b border-line px-5 py-3 last:border-0"><kbd className="min-w-[150px] font-sans text-sm font-semibold">{k}</kbd><span className="text-sm text-ink-soft">{d}</span></div>
            ))}
          </div>
        </Section>

        <Section id="animations" titre="Animations" sous="Courtes et utiles : 120 ms pour un survol, 200 ms par défaut, 320 ms pour une fenêtre. Coupées si l'appareil demande moins d'animations.">
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Rapide", "duration-rapide", "120 ms"], ["Normale", "duration-200", "200 ms"], ["Lente", "duration-lente", "320 ms"]].map(([l, c, v]) => (
              <button key={l} type="button" className="group rounded-carte border border-line bg-surface p-5 text-left">
                <span className={cx("block h-2 w-10 rounded-full bg-accent transition-all group-hover:w-full group-focus-visible:w-full", c)} />
                <span className="mt-3 block text-sm font-semibold">{l}</span><span className="font-mono text-xs text-ink-soft">{v} · survole-moi</span>
              </button>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}

export default function DesignSystem() {
  const [theme, setTheme] = useState(() => (new URLSearchParams(window.location.search).get("theme") === "dark" ? "dark" : "light"));
  useEffect(() => {
    document.title = "Design system · Bingoo!";
    const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex"; document.head.appendChild(m);
    return () => m.remove();
  }, []);
  useEffect(() => { document.body.style.background = theme === "dark" ? "#141518" : ""; }, [theme]);
  return <ToastProvider><Contenu theme={theme} setTheme={setTheme} /></ToastProvider>;
}
