import { BIZ_TYPES } from "../lib/labels";
import { cx } from "../lib/utils";

/** Choix du type d'entreprise (déduit du site, corrigeable en un clic). */
export default function BizType({ value, onChange, publicValue, onPublic }) {
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-2">
        {BIZ_TYPES.map(([k, t, d]) => (
          <button type="button" key={k} onClick={() => onChange(k)} className={cx("text-left rounded-xl border px-3.5 py-2.5 transition", value === k ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-faint")}>
            <span className="block font-semibold text-[14px]">{t}</span>
            <span className={cx("block text-[12px] leading-snug", value === k ? "text-white/70" : "text-ink-faint")}>{d}</span>
          </button>
        ))}
      </div>
      {onPublic && (
        <label className="mt-2.5 flex items-center gap-2 text-[13px] text-ink-soft">
          <input type="checkbox" checked={publicValue !== false} onChange={(e) => onPublic(e.target.checked)} />
          Je vends aussi à des acheteurs publics (collectivités, hôpitaux, administrations)
        </label>
      )}
    </div>
  );
}
