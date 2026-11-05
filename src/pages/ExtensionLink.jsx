import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { EXT_IDS, pingExtension, sendKey } from "../lib/ext";
import { Button, Card, Spinner } from "../components/ui";
import Visite, { VISITE_EXTENSION } from "../components/Visite";

/** Ouverte par l'extension juste après son installation : relie l'extension à l'espace, sans rien copier. */
export default function ExtensionLink() {
  const { ws } = useWs();
  const nav = useNavigate();
  const { search } = useLocation();
  const id = new URLSearchParams(search).get("ext") ?? EXT_IDS[0];
  const [state, setState] = useState("wait");
  const [visite, setVisite] = useState(false);
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    (async () => {
      const p = await pingExtension(id);
      if (!p) return setState("absente");
      if (p.linked) return setState("ok");
      try {
        const { key } = await fn("r/apikey-create", { workspace_id: ws.id, name: `Extension Chrome du ${new Date().toLocaleDateString("fr-FR")}` });
        const ok = await sendKey(id, key);
        setState(ok ? "ok" : "erreur");
        if (ok) setVisite(true); // première liaison : ce que fait l'extension, en trois écrans
      } catch { setState("erreur"); }
    })();
  }, [id, ws.id]);
  return (
    <div className="max-w-md mx-auto mt-16">
      {visite && <Visite etapes={VISITE_EXTENSION} onFin={() => setVisite(false)} fin="Compris" />}
      <Card className="p-8 text-center">
        {state === "wait" && <><Spinner /><p className="mt-4 text-ink-soft">On relie ton extension…</p></>}
        {state === "ok" && <>
          <p className="text-5xl">🎉</p>
          <h1 className="font-serif text-3xl mt-3">C'est prêt !</h1>
          <p className="text-ink-soft mt-2">L'extension Bingoo! est reliée à ton espace. Tu peux fermer cet onglet.</p>
          <Button className="mt-6" variant="primary" onClick={() => nav("/linkedin")}>Découvrir le pilote LinkedIn</Button>
        </>}
        {state === "absente" && <>
          <h1 className="font-serif text-2xl">Extension introuvable</h1>
          <p className="text-ink-soft mt-2">Ouvre cette page dans Chrome, là où l'extension Bingoo! est installée.</p>
          <Button className="mt-6" onClick={() => nav("/reglages#acces")}>Installer l'extension</Button>
        </>}
        {state === "erreur" && <>
          <h1 className="font-serif text-2xl">La liaison n'a pas marché</h1>
          <p className="text-ink-soft mt-2">Recharge la page pour réessayer.</p>
          <Button className="mt-6" variant="primary" onClick={() => location.reload()}>Réessayer</Button>
        </>}
      </Card>
    </div>
  );
}
