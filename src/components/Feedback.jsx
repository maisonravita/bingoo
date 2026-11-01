import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Card, Textarea, useToast } from "./ui";
import { cx } from "../lib/utils";

/** Avis rapide des utilisateurs pilotes : note, intention de payer, commentaire libre. */
export default function Feedback({ onClose }) {
  const { ws, session } = useWs();
  const toast = useToast();
  const [score, setScore] = useState(null);
  const [pay, setPay] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({ workspace_id: ws.id, user_id: session.user.id, score, would_pay: pay, message: msg.slice(0, 3000), page: window.location.hash.slice(1, 60) });
    setBusy(false);
    if (error) return toast(error.message, "bad");
    toast("Merci, c'est précieux pour améliorer Kairo", "good"); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30" />
      <Card className="relative w-full max-w-md p-5 sm:p-6 rise" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif text-2xl">Ton avis sur Kairo</h2>
        <p className="text-sm mt-4 font-semibold">Recommanderais-tu Kairo à un autre dirigeant ?</p>
        <div className="grid grid-cols-11 gap-1 mt-2">
          {Array.from({ length: 11 }, (_, i) => <button key={i} onClick={() => setScore(i)} className={cx("rounded-lg py-2 text-sm border tnum", score === i ? "bg-ink text-white border-ink" : "bg-white border-line")}>{i}</button>)}
        </div>
        <div className="flex justify-between text-[11px] text-ink-soft mt-1"><span>Pas du tout</span><span>Absolument</span></div>
        <p className="text-sm mt-4 font-semibold">Paierais-tu pour Kairo aujourd'hui ?</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {["Oui", "Peut-être", "Non"].map((x) => <button key={x} onClick={() => setPay(x)} className={cx("rounded-full px-3 py-1.5 text-sm border", pay === x ? "bg-ink text-white border-ink" : "bg-white border-line")}>{x}</button>)}
        </div>
        <Textarea rows={4} className="mt-4" placeholder="Ce qui t'a fait gagner du temps, ce qui bloque, ce qui manque…" value={msg} onChange={(e) => setMsg(e.target.value)} />
        <div className="flex gap-2 mt-4"><Button variant="primary" loading={busy} disabled={score === null && !msg.trim()} onClick={send}>Envoyer</Button><Button variant="ghost" onClick={onClose}>Plus tard</Button></div>
      </Card>
    </div>
  );
}
