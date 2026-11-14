import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHead } from "../components/ui";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useToast } from "../components/ui";

const FAQ = [
  ["Comment ça marche ?", "Tu réponds à quelques questions, Bingoo! te montre des SaaS qui gagnent déjà de l'argent et qui collent à ton profil. Tu en choisis un, tu t'abonnes, et Bingoo! construit ta version : ton propre SaaS, à ton nom, en ligne en quelques minutes."],
  ["Mon SaaS est-il vraiment à moi ?", "Oui. Il porte ton nom, tes couleurs, ton adresse, et l'argent de tes abonnés arrive directement sur ton compte Stripe. Bingoo! ne prend aucune commission sur tes ventes."],
  [<>Je peux le modifier ?</>, <>Oui, dans l'<Link className="underline" to="/explorer/atelier">Atelier</Link> : tu écris ce que tu veux changer (« ajoute une page tarifs », « mets du vert ») et Bingoo! le fait. Ta formule comprend des modifications chaque mois, au-delà c'est 1 crédit par modification.</>],
  ["À quoi servent les crédits ?", <>Aux extras : une modification au-delà de ton forfait (1 crédit), une vidéo pub animée (10 crédits), un SaaS de plus (60 crédits). Tu les recharges dans <Link className="underline" to="/abonnement#credits">Abonnement</Link>.</>],
  ["Comment je trouve mes premiers clients ?", <>Dans <Link className="underline" to="/explorer/clients">Premiers clients</Link>, <Link className="underline" to="/explorer/methodes">Ce qui marche</Link> et <Link className="underline" to="/explorer/tiktok">TikTok</Link> : les canaux et les formats qui ramènent des clients aux SaaS comme le tien, avec de quoi faire pareil.</>],
  ["Est-ce que je vais gagner de l'argent ?", "Personne ne peut te le promettre : ça dépend de ce que tu fais de ton SaaS. Ce que Bingoo! te donne, c'est un modèle qui a déjà marché ailleurs, ta version prête à vendre et les méthodes qui fonctionnent pour l'utiliser. Imagine où tu peux en être dans quelques mois."],
  ["Comment j'arrête mon abonnement ?", <>Dans <Link className="underline" to="/abonnement">Abonnement</Link>, en un clic. Tu gardes l'accès jusqu'à la fin de la période payée.</>],
];

export default function Aide() {
  const [open, setOpen] = useState(0);
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
