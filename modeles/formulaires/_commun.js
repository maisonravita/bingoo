const qsDe = (f) => { let q = f?.questions; if (typeof q === "string") { try { q = JSON.parse(q); } catch (_) { q = null; } } return Array.isArray(q) ? q : []; };
const repDe = (r) => { let x = r?.reponses; if (typeof x === "string") { try { x = JSON.parse(x); } catch (_) { x = null; } } return Array.isArray(x) ? x : []; };
const TYPES_L = { texte: "Réponse courte", long: "Paragraphe", choix: "Choix unique", multiple: "Choix multiples", note: "Note de 1 à 5", nps: "Recommandation 0 à 10", oui_non: "Oui ou non", email: "E-mail", nombre: "Nombre", date: "Date" };
const valTxt = (v) => v == null || v === "" ? "—" : Array.isArray(v) ? v.join(", ") : v === "oui" ? "Oui" : v === "non" ? "Non" : String(v);
