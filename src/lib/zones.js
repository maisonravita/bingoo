export const IDF = ["75", "77", "78", "91", "92", "93", "94", "95"];
export const PRESETS = [
  { label: "Île-de-France", zone: IDF },
  { label: "Lyon et Rhône", zone: ["69", "01", "38", "42"] },
  { label: "Marseille et PACA", zone: ["13", "83", "84", "06"] },
  { label: "Toute la France", zone: [] },
];
export const parseZone = (s) => String(s).toUpperCase().split(/[\s,;]+/).map((x) => x.trim()).filter((x) => /^(\d{2}|2A|2B|97\d)$/.test(x));
export const zoneLabel = (z) => !z?.length ? "Toute la France" : PRESETS.find((p) => p.zone.length && p.zone.join() === [...z].sort().join() || p.zone.join() === z.join())?.label ?? z.join(", ");
export const fmtN = (n) => n == null ? "?" : n >= 10000 ? `${Math.round(n / 1000)} k` : n.toLocaleString("fr-FR");
