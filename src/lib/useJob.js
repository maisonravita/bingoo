import { useState } from "react";
import { fn } from "./supabase";

/** Lance une action serveur par lots, en boucle, avec progression. */
export function useJob(toast) {
  const [job, setJob] = useState(null);
  const run = async ({ key, action, body, rounds, label, done }) => {
    if (job) return;
    let total = 0, found = 0;
    setJob({ key, text: `${label}…` });
    try {
      for (let i = 0; i < rounds; i++) {
        const r = await fn(action, body);
        const n = r.done ?? r.inserted ?? r.results?.length ?? 0;
        total += n;
        found += r.found ?? 0;
        setJob({ key, text: `${label} · ${total}${r.remaining != null ? ` (reste ${r.remaining})` : ""}` });
        window.dispatchEvent(new Event("kairo:refresh"));
        if (!n || r.remaining === 0) break;
      }
      toast(done(total, found), "good");
    } catch (e) {
      toast(e.message, "bad");
    } finally {
      setJob(null);
      window.dispatchEvent(new Event("kairo:refresh"));
    }
  };
  return { job, run };
}
