import { declencheur, emailGenerique, quandTexte, typeDe } from "../lib/opportunite";
import { cx } from "../lib/utils";

/** Le haut d'une carte opportunité : pourquoi maintenant, et à qui. */
export default function Opportunite({ p, compact = false }) {
  const d = declencheur(p);
  const generique = emailGenerique(p?.email);
  return (
    <div className={cx("grid gap-3", compact ? "" : "sm:grid-cols-2")}>
      <section className="rounded-2xl bg-[#FFF1E6] px-4 py-3">
        <p className="text-[12.5px] font-bold text-[#C2410C]">Pourquoi maintenant</p>
        {d ? (
          <>
            <p className="mt-0.5 text-[14.5px] font-semibold text-ink">{typeDe(d.type)}{d.quand ? <span className="font-normal text-ink-soft"> · {quandTexte(d.quand)}</span> : null}</p>
            <p className="mt-0.5 text-[13.5px] text-ink-soft line-clamp-3">{d.label}</p>
            <p className="mt-1 text-[12px] text-ink-faint">Source : {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="underline hover:text-ink">{d.source || new URL(d.url).hostname.replace(/^www\./, "")}</a> : d.source || "registre officiel"}</p>
          </>
        ) : <p className="mt-0.5 text-[13.5px] text-ink-soft">Repérée par le Radar</p>}
      </section>
      <section className="rounded-2xl bg-paper px-4 py-3">
        <p className="text-[12.5px] font-bold text-ink-soft">À qui</p>
        <p className="mt-0.5 text-[14.5px] font-semibold text-ink">{p?.contact_name || "Décideur à confirmer"}{p?.contact_role ? <span className="font-normal text-ink-soft">, {String(p.contact_role).replace(/\s*\(.*$/, "")}</span> : null}</p>
        <p className="mt-0.5 text-[13.5px] text-ink-soft break-all">{p?.email}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className={cx("rounded-full px-2 py-0.5 font-semibold", generique ? "bg-warn-soft text-warn" : "bg-good/10 text-good")}>{generique ? "Adresse d'accueil : le message demande de transmettre" : "Adresse nominative"}</span>
          {p?.contact_source && <span className="text-ink-faint">Nom : {p.contact_source}</span>}
        </p>
      </section>
    </div>
  );
}
