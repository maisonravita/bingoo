// Lecture et écriture de fichiers CSV (Excel français : « ; », Google Sheets : « , »).

export function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", ",", "\t"].map((s) => [s, first.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"' && cell === "") q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  const [head = [], ...body] = rows;
  return { headers: head.map((h) => h.trim()), rows: body };
}

export function toCsv(headers, rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}

export function download(name, content, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Champs Kairo et noms de colonnes reconnus automatiquement
export const FIELDS = [
  { key: "name", label: "Entreprise", syn: ["entreprise", "societe", "société", "company", "nom entreprise", "raison sociale", "organisation", "organization", "account", "nom"] },
  { key: "contact_name", label: "Contact (prénom nom)", syn: ["contact", "nom complet", "full name", "name", "personne", "interlocuteur", "decideur", "décideur"] },
  { key: "first_name", label: "Prénom", syn: ["prenom", "prénom", "first name", "firstname"] },
  { key: "last_name", label: "Nom de famille", syn: ["nom de famille", "last name", "lastname", "surname"] },
  { key: "contact_role", label: "Fonction", syn: ["fonction", "poste", "titre", "title", "job title", "role", "rôle"] },
  { key: "email", label: "E-mail", syn: ["email", "e-mail", "mail", "courriel", "adresse email", "adresse e-mail"] },
  { key: "phone", label: "Téléphone", syn: ["telephone", "téléphone", "tel", "tél", "phone", "mobile", "portable"] },
  { key: "website", label: "Site web", syn: ["site", "site web", "website", "url", "domaine", "domain"] },
  { key: "address", label: "Adresse", syn: ["adresse", "address", "rue"] },
  { key: "postal_code", label: "Code postal", syn: ["code postal", "cp", "zip", "postal code", "code_postal"] },
  { key: "city", label: "Ville", syn: ["ville", "city", "commune", "localite", "localité"] },
  { key: "siret", label: "SIRET", syn: ["siret"] },
  { key: "siren", label: "SIREN", syn: ["siren"] },
  { key: "activity", label: "Activité", syn: ["activite", "activité", "secteur", "industry", "industrie", "naf"] },
  { key: "linkedin_url", label: "LinkedIn", syn: ["linkedin", "linkedin url", "profil linkedin"] },
  { key: "notes", label: "Notes", syn: ["notes", "note", "commentaire", "commentaires"] },
];
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[_\-.]+/g, " ").trim();

export function guessMapping(headers) {
  const used = new Set();
  const map = {};
  for (const f of FIELDS) {
    const syn = f.syn.map(norm);
    const i = headers.findIndex((h, idx) => !used.has(idx) && syn.includes(norm(h)));
    const j = i >= 0 ? i : headers.findIndex((h, idx) => !used.has(idx) && syn.some((s) => s.length > 3 && norm(h).includes(s)));
    if (j >= 0) { map[f.key] = j; used.add(j); }
  }
  return map;
}
