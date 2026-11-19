// Recette d’une application de l’espace QA. Exécution : node scripts/e2e/saas-qa.mjs.
// Renseigner BINGOO_QA_API (URL /functions/v1/t/app), BINGOO_QA_APP (slug),
// BINGOO_QA_RESERVATION (ID de la page) et BINGOO_QA_RESERVATIONS (collection).
// Facultatif : BINGOO_QA_EMAIL=delivered@resend.dev avec un compte de test disponible.
// Facultatif : BINGOO_QA_STRIPE=true pour une application configurée en mode test.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { setTimeout as attendre } from "node:timers/promises";

const { BINGOO_QA_API, BINGOO_QA_APP, BINGOO_QA_RESERVATION, BINGOO_QA_RESERVATIONS,
  BINGOO_QA_EMAIL, BINGOO_QA_STRIPE } = process.env;
assert(BINGOO_QA_API?.startsWith("https://") && /^[a-z0-9-]+$/.test(BINGOO_QA_APP ?? ""), "URL HTTPS et slug QA requis");
assert(BINGOO_QA_RESERVATION && BINGOO_QA_RESERVATIONS, "Configurer une application QA avec réservation publique");
assert(!BINGOO_QA_EMAIL || BINGOO_QA_EMAIL === "delivered@resend.dev", "Utiliser l’adresse de simulation Resend");
const base = `${BINGOO_QA_API.replace(/\/$/, "")}/${BINGOO_QA_APP}`;
const col = BINGOO_QA_RESERVATIONS;
const page = BINGOO_QA_RESERVATION;
const reference = randomBytes(6).toString("hex");
const email = BINGOO_QA_EMAIL || `qa-${reference}@demo.local`;
const password = randomBytes(18).toString("hex");
let token;
let disponibilite, reservation;
async function appel(action, data = {}, { prive = true, statut = 200 } = {}) {
  const response = await fetch(`${base}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(prive && token ? { "x-app-token": token } : {}) },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(response.status, statut, `${action} : HTTP ${response.status} attendu ${statut}`);
  return response.json();
}
try {
  const inscription = await appel("signup", { email, password, nom: "Recette Bingoo!", source: "qa" });
  assert(inscription.token && inscription.user?.id, "L’inscription doit ouvrir une session");
  await appel("login", { email, password: "incorrect" }, { statut: 401 });
  const connexion = await appel("login", { email, password });
  token = connexion.token;
  assert(token && connexion.user?.id === inscription.user.id, "La connexion doit retrouver ce compte");
  const profil = await appel("me");
  assert.equal(profil.user.id, inscription.user.id);
  console.log("✓ Inscription, connexion et compte");

  disponibilite = await appel("add", { col: "disponibilites", data: { jour: 5, debut: "10:00", fin: "13:00" } });
  const maj = await appel("update", { col: "disponibilites", id: disponibilite.id, data: { fin: "14:00" } });
  assert.equal(maj.fin, "14:00");
  const lu = await appel("get", { col: "disponibilites", id: disponibilite.id });
  assert.equal(lu.fin, "14:00");
  console.log("✓ Écriture, modification et relecture des données");

  const date = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const scope = { col, page, espace: profil.espace };
  const visiteur = { client_email: `reservation-${reference}@demo.local`, client_telephone: "0600000000", client_nom: "Recette Bingoo!" };
  reservation = await appel("public-add", {
    ...scope, data: { ...visiteur, date, heure: "11:00", duree_minutes: 30, statut: "Confirmée" },
  }, { prive: false });
  assert(reservation.id, "La demande de réservation doit être enregistrée");
  const reservations = await appel("public-list", scope, { prive: false });
  const creneau = reservations.find((r) => r.id === reservation.id);
  assert.equal(creneau?.date, date);
  assert.equal(creneau?.heure, "11:00");
  for (const champ of Object.keys(visiteur)) assert(!(champ in creneau), `Champ privé visible : ${champ}`);
  assert.equal((await appel("get", { col, id: reservation.id })).client_email, visiteur.client_email);
  console.log("✓ Réservation publique et confidentialité des coordonnées");

  if (BINGOO_QA_EMAIL) {
    const envoi = await appel("mail", { a: email, sujet: `Recette ${reference}`, texte: "Test de livraison Bingoo!" });
    assert(envoi.id, "L’envoi doit être enregistré");
    let traite;
    for (let essai = 0; essai < 10; essai++) {
      const reponse = await appel("mails");
      traite = reponse.find((m) => m.id === envoi.id);
      if (["envoye", "erreur"].includes(traite?.statut)) break;
      await attendre(2000);
    }
    assert.equal(traite?.statut, "envoye", "Le fournisseur doit accepter l’e-mail simulé");
    console.log("✓ E-mail de recette accepté par le fournisseur");
  } else {
    console.log("· E-mail : configurer BINGOO_QA_EMAIL pour vérifier l’envoi");
  }
  if (BINGOO_QA_STRIPE === "true") {
    const checkout = await appel("checkout", { formule: 0, retour: `https://bingoo.fr/#/app/${BINGOO_QA_APP}` });
    const url = new URL(checkout.url);
    assert.equal(url.hostname, "checkout.stripe.com");
    assert(/\/cs_test_/.test(url.pathname), "Stripe Checkout doit être en mode test");
    console.log("✓ Session Stripe Checkout en mode test");
  } else {
    console.log("· Paiement : configurer Stripe en mode test et BINGOO_QA_STRIPE=true");
  }
} finally {
  if (token) {
    if (reservation?.id) await appel("remove", { col, id: reservation.id });
    if (disponibilite?.id) await appel("remove", { col: "disponibilites", id: disponibilite.id });
    await appel("logout");
  }
}
