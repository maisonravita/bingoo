import { useState } from "react";
import { cx } from "../lib/utils";

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

/** Logo d'une entreprise (icône de son site) ; si le site n'en a pas, pastille avec son initiale. */
export default function CompanyLogo({ name, url, className = "w-10 h-10", pad = "p-1.5" }) {
  const [bad, setBad] = useState(false);
  const h = hostOf(url);
  const hue = [...(name || h || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  if (h && !bad) return <img src={`https://www.google.com/s2/favicons?domain=${h}&sz=64`} alt="" onError={() => setBad(true)} onLoad={(e) => e.currentTarget.naturalWidth < 20 && setBad(true)} className={cx(className, pad, "rounded-xl border border-line bg-white object-contain shrink-0")} />;
  return <span aria-hidden className={cx(className, "rounded-xl grid place-items-center text-white font-black shrink-0")} style={{ background: `hsl(${hue} 35% 24%)` }}>{(name || h || "?").trim()[0]?.toUpperCase()}</span>;
}
