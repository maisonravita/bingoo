import Visite from "../components/Visite";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHead } from "../components/ui";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useToast } from "../components/ui";

const FAQ = [
  ["Comment démarrer ?", <>Crée une <Link className="underline" to="/mission">Mission</Link> en écrivant ton objectif (par exemple « 10 rendez-vous avec des agences immobilières à Lyon d'ici mars »). Bingoo! choisit les cibles, trouve les entreprises, cherche le bon contact et prépare les e-mails. Toi, tu valides.</>],
  ["Est-ce que Bingoo! envoie des e-mails sans mon accord ?", <>Non, tant que le pilote automatique est coupé (réglage par défaut) : chaque e-mail attend ta validation dans <Link className="underline" to="/valider">À valider</Link>. Si tu actives le pilote automatique dans Réglages, les envois partent seuls, dans la limite du jour.</>],
  ["Qui sont les agents (Iris, Léo, Sam…) ?", "Ce sont des agents logiciels d'intelligence artificielle, pas des personnes. Chacun fait une tâche précise : chercher des entreprises, trouver les coordonnées, rédiger, envoyer, relancer, lire les réponses. Tout ce qu'ils font est écrit dans leur journal."],
  ["D'où viennent les entreprises et les coordonnées ?", "Du registre officiel des entreprises (data.gouv.fr) pour les noms, adresses et dirigeants, puis des sites internet et annuaires professionnels pour les e-mails et téléphones publiés. Bingoo! n'invente jamais une adresse : s'il ne trouve rien de publié, il propose un autre canal (téléphone, LinkedIn, formulaire)."],
  ["Pourquoi j'envoie peu d'e-mails au début ?", "Pour protéger ta réputation d'expéditeur. Les premières semaines, la limite d'envois monte progressivement (préchauffage). Envoyer trop d'un coup depuis une adresse neuve fait finir tes e-mails en indésirables."],
  ["Pourquoi une action indique « limite du jour atteinte » ?", "Chaque formule comprend un nombre d'actions IA par jour (enquêtes, rédactions, analyses), affiché sur chaque bouton. Le compteur repart à zéro chaque nuit."],
  ["Comment ma mission s'arrête-t-elle ?", <>Elle se met en pause toute seule à la date de fin, quand le budget IA ou le nombre maximum d'entreprises est atteint, ou quand l'objectif est rempli. Tu règles ces limites dans <Link className="underline" to="/mission">Mission</Link>. Tu peux aussi la mettre en pause à tout moment.</>],
  ["Que se passe-t-il quand un prospect répond ?", <>Bingoo! lit la réponse, la classe (intéressé, question, pas intéressé, absent…) et prépare une réponse adaptée dans <Link className="underline" to="/reponses">Réponses</Link>. Si c'est positif, tu reçois une alerte par e-mail tout de suite. Les relances s'arrêtent dès qu'il a répondu.</>],
  ["Un prospect ne veut plus être contacté : que faire ?", <>Rien : s'il répond « STOP » ou passe par la page <a className="underline" href="#/opposition">Ne plus être contacté</a>, il est bloqué automatiquement, pour toutes les entreprises qui utilisent Bingoo!.</>],
  ["Est-ce légal de prospecter par e-mail ?", "Oui entre professionnels, si le message est en rapport avec la fonction de la personne et qu'elle peut s'y opposer facilement (c'est le cas : « STOP » et lien d'opposition dans chaque e-mail). Bingoo! ne prospecte pas les particuliers par e-mail."],
];

export default function Aide() {
  const [open, setOpen] = useState(0);
  const [visite, setVisite] = useState(false);
  const { ws } = useWs();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    if (q.trim().length < 5) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("feedback").insert({ workspace_id: ws.id, user_id: user?.id, score: null, would_pay: "", message: q.trim().slice(0, 3000), page: "aide" });
    setBusy(false);
    if (error) return toast("Envoi impossible, réessaie dans un instant.", "bad");
    setQ(""); toast("Question envoyée : on te répond par e-mail.", "good");
  };
  return (
    <div>
      <PageHead title="Aide" sub="Les réponses aux questions les plus fréquentes." />
      {visite && <Visite onFin={() => setVisite(false)} fin="Fermer" />}
      <button type="button" onClick={() => setVisite(true)} className="mb-5 w-full text-left rounded-2xl border border-line bg-white p-4 flex items-center gap-4 hover:border-ink-faint transition">
        <img src="./demo-carte.jpg" alt="" className="w-24 h-16 rounded-lg object-cover shrink-0" />
        <span className="min-w-0"><span className="block font-semibold">Revoir la visite de Bingoo!</span><span className="block text-sm text-ink-soft">L'équipe, la carte interactive, le Radar, l'extension : en vidéo, en 2 minutes.</span></span>
      </button>
      <Card className="divide-y divide-line">
        {FAQ.map(([q, a], i) => (
          <div key={i}>
            <button className="w-full text-left px-5 py-4 font-medium flex justify-between gap-4" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              {q}<span className="text-ink-faint">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <div className="px-5 pb-5 -mt-1 text-sm text-ink-soft leading-relaxed">{a}</div>}
          </div>
        ))}
      </Card>
      <Card className="p-5 mt-5">
        <p className="font-semibold">Tu ne trouves pas ta réponse ?</p>
        <p className="text-sm text-ink-soft">Pose ta question ici : on te répond par e-mail, à l'adresse de ton compte.</p>
        <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} placeholder="Ta question…" className="mt-3 w-full rounded-lg border border-line px-3 py-2.5 bg-white text-sm" />
        <button disabled={busy || q.trim().length < 5} className="mt-2 rounded-full bg-ink text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40" onClick={ask}>{busy ? "Envoi…" : "Envoyer la question"}</button>
      </Card>
    </div>
  );
}
