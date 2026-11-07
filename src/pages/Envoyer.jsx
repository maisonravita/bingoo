import { useEffect, useState } from "react";
import { fn } from "../lib/supabase";
import Logo from "../components/Logo";
import Opportunite from "../components/Opportunite";
import { Button } from "../components/ui";

/** Page ouverte depuis l'e-mail du matin : l'opportunité, le message, et un seul bouton. Rien ne part sans ce clic. */
export default function Envoyer() {
  const t = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("t") ?? "";
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fn("m/lien-envoi", { t }).then(setD).catch((e) => setErr(e.message)); }, [t]);
  const envoyer = async () => {
    setBusy(true);
    try { setD(await fn("m/lien-envoi", { t, confirmer: true, ...(d?.type === "reponse" ? { subject: d.message.subject, body: d.message.body } : {}) })); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const FIN = {
    envoye: ["Envoyé.", d?.type === "reponse" ? "Ta réponse est partie de ta boîte. S'il choisit un créneau, le rendez-vous s'ajoute tout seul à ton agenda Bingoo!." : "Le message est parti de ta boîte. La réponse arrivera à la Poste de Bingoo!."],
    utilise: ["Déjà traité.", "Ce lien a déjà servi."],
    traite: ["Déjà traité.", "Ce message a été envoyé ou écarté depuis l'application."],
    expire: ["Lien expiré.", "Les liens du matin durent 48 heures. Ouvre Bingoo! pour retrouver tes opportunités."],
  };
  const fin = d && FIN[d.etat];
  return (
    <div className="min-h-full bg-paper px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Logo />
        {err ? <p className="mt-8 rounded-2xl bg-white border border-line p-6 text-[16px]">{err} <a href="/" className="underline">Ouvrir Bingoo!</a></p>
          : !d ? <div className="mt-8 h-64 rounded-3xl bg-white animate-pulse" />
          : fin ? (
            <div className="mt-8 rounded-3xl bg-white border border-line p-6 sm:p-8">
              <h1 className="text-[32px] font-black" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{fin[0]}</h1>
              <p className="mt-2 text-ink-soft text-[16px]">{d.skipped ? `Non envoyé : ${d.skipped}` : fin[1]}</p>
              <a href="/" className="mt-5 inline-block underline">Ouvrir Bingoo!</a>
            </div>
          ) : d.type === "reponse" ? (
            <article className="mt-8 rounded-3xl bg-white border border-line p-5 sm:p-7">
              <p className="text-[13px] font-bold text-[#C2410C]">Prospect qui a répondu · {d.espace}</p>
              <h1 className="mt-1 text-[30px] font-black leading-tight" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{d.prospect.name}</h1>
              {d.recu.resume && <p className="mt-2 text-[16px]">{d.recu.resume}</p>}
              <div className="mt-4 rounded-2xl bg-paper px-4 py-3">
                <p className="text-[12.5px] font-bold text-ink-soft">Son message</p>
                <p className="mt-1 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-soft">{d.recu.texte}</p>
              </div>
              <div className="mt-5 border-t border-line pt-5">
                <p className="text-[12.5px] font-bold text-ink-soft">Ta réponse (tu peux la modifier)</p>
                <input className="mt-2 w-full rounded-xl border border-line px-3 py-2 font-semibold" value={d.message.subject} onChange={(e) => setD({ ...d, message: { ...d.message, subject: e.target.value } })} aria-label="Objet" />
                <textarea className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-[15px] leading-relaxed" rows={9} value={d.message.body} onChange={(e) => setD({ ...d, message: { ...d.message, body: e.target.value } })} aria-label="Réponse" />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button size="lg" variant="accent" loading={busy} onClick={envoyer}>Envoyer la réponse</Button>
                <a href="/#/reponses" className="self-center text-[15px] font-semibold text-ink-soft hover:text-ink px-2">Ouvrir dans Bingoo!</a>
              </div>
            </article>
          ) : (
            <article className="mt-8 rounded-3xl bg-white border border-line p-5 sm:p-7">
              <p className="text-[13px] font-bold text-[#C2410C]">Opportunité · {d.espace}</p>
              <h1 className="mt-1 text-[30px] font-black leading-tight" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{d.prospect.name}</h1>
              <div className="mt-4"><Opportunite p={d.prospect} /></div>
              <div className="mt-5 border-t border-line pt-5">
                <p className="text-[12.5px] font-bold text-ink-soft">Le message</p>
                <p className="mt-1 font-semibold">{d.message.subject}</p>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-[15px]">{d.message.body}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" variant="accent" loading={busy} onClick={envoyer}>Envoyer</Button>
                <a href="/" className="self-center text-[15px] font-semibold text-ink-soft hover:text-ink px-2">Modifier dans Bingoo!</a>
              </div>
            </article>
          )}
      </div>
    </div>
  );
}
