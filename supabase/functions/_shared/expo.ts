// App mobile (étape 3) : la coque native Expo autour de l'app du membre, publiée en « Snack » (sans compte Expo).
// Le membre l'ouvre sur son téléphone dans Expo Go. La même coque servira à la compilation pour les stores (étape 4).
// - SDK : celui de Snack (54 aujourd'hui, réglable) ; modules natifs aux versions de ce SDK, lues à chaque publication.
// - La coque : l'app en plein écran (?natif=1 : pas de bandeau « installer »), écran de démarrage à la couleur de l'app,
//   tirer pour recharger, bouton retour Android, écran « pas de connexion » avec « Réessayer », liens externes dans le navigateur.
// deno-lint-ignore-file no-explicit-any

const SNACK = "https://exp.host/--/api/v2";

// SDK d'Expo : celui que Snack (et donc Expo Go par Snack) fait tourner, pas forcément le tout dernier publié par Expo.
// Snack propose aujourd'hui les SDK 50 à 56 et ouvre en 54 : on suit son choix (réglable par SNACK_SDK sans redéployer le code).
// Les modules natifs prennent les versions qui vont avec ce SDK (lues dans le paquet expo de cette version).
async function versions() {
  const sdk = /^\d+\.0\.0$/.test(Deno.env.get("SNACK_SDK") ?? "") ? Deno.env.get("SNACK_SDK")! : "54.0.0";
  const majeur = sdk.split(".")[0];
  const mods = await fetch(`https://cdn.jsdelivr.net/npm/expo@${majeur}/bundledNativeModules.json`).then((x) => x.json()).catch(() => ({}));
  // Versions telles qu'Expo les écrit (« ~3.0.9 ») : c'est ce que Snack recommande
  const v = (p: string, d: string) => String(mods?.[p] ?? d);
  return { sdk, deps: { "react-native-webview": v("react-native-webview", "13.15.0"), "react-native-safe-area-context": v("react-native-safe-area-context", "~5.6.0"), "expo-status-bar": v("expo-status-bar", "~3.0.9") } };
}

/** Le code de la coque (App.js), pour une app donnée. */
export function codeCoque(o: { nom: string; url: string; couleur: string; hotes: string[] }) {
  const J = JSON.stringify;
  return `// ${o.nom.replace(/\n/g, " ")} : application construite avec Bingoo!
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

const NOM = ${J(o.nom)};
const ADRESSE = ${J(o.url)};
const COULEUR = ${J(o.couleur)};
const HOTES = ${J(o.hotes)};

// Les pages de l'app restent dans l'app ; le reste (site externe, paiement, e-mail, téléphone) s'ouvre à côté
const interne = (url) => { try { const h = new URL(url).hostname; return HOTES.some((x) => h === x || h.endsWith("." + x)); } catch (e) { return url.startsWith("about:") || url.startsWith("data:"); } };

export default function App() {
  const vue = useRef(null);
  const [pret, setPret] = useState(false), [horsLigne, setHorsLigne] = useState(false), [retour, setRetour] = useState(false), [cle, setCle] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const s = BackHandler.addEventListener("hardwareBackPress", () => { if (retour && vue.current) { vue.current.goBack(); return true; } return false; });
    return () => s.remove();
  }, [retour]);
  const reessayer = useCallback(() => { setHorsLigne(false); setPret(false); setCle((k) => k + 1); }, []);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        {horsLigne ? (
          <View style={styles.centre}>
            <View style={[styles.logo, { backgroundColor: COULEUR }]}><Text style={styles.lettre}>{NOM.slice(0, 1).toUpperCase()}</Text></View>
            <Text style={styles.titre}>Pas de connexion</Text>
            <Text style={styles.texte}>{NOM} a besoin d'internet pour afficher tes données à jour.</Text>
            <Pressable onPress={reessayer} style={[styles.bouton, { backgroundColor: COULEUR }]}><Text style={styles.boutonTexte}>Réessayer</Text></Pressable>
          </View>
        ) : (
          <WebView
            key={cle}
            ref={vue}
            source={{ uri: ADRESSE }}
            style={styles.page}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            pullToRefreshEnabled
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            onLoadEnd={() => setPret(true)}
            onNavigationStateChange={(n) => setRetour(!!n.canGoBack)}
            onError={() => setHorsLigne(true)}
            onShouldStartLoadWithRequest={(r) => {
              if (r.isTopFrame === false || interne(r.url)) return true;
              Linking.openURL(r.url).catch(() => {});
              return false;
            }}
          />
        )}
        {!pret && !horsLigne && (
          <View style={[StyleSheet.absoluteFill, styles.centre, { backgroundColor: COULEUR }]} pointerEvents="none">
            <Text style={styles.demarrage}>{NOM}</Text>
            <ActivityIndicator color="#ffffff" style={{ marginTop: 18 }} />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#ffffff" },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  logo: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  lettre: { color: "#ffffff", fontSize: 34, fontWeight: "800" },
  titre: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  texte: { marginTop: 8, fontSize: 15, color: "#64748B", textAlign: "center", lineHeight: 21 },
  bouton: { marginTop: 22, borderRadius: 999, paddingHorizontal: 26, paddingVertical: 13 },
  boutonTexte: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  demarrage: { color: "#ffffff", fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
});
`;
}

/** Publie (ou republie) la coque de l'app en Snack : renvoie son identifiant et ses liens. */
export async function publierCoque(app: { slug: string; spec: any; domaine?: string | null; domaine_statut?: string | null }) {
  const s = app.spec ?? {};
  const propre = app.domaine_statut === "ok" && app.domaine;
  const url = propre ? `https://${app.domaine}/?natif=1` : `https://www.bingoo.fr/#/app/${app.slug}?natif=1`;
  const hotes = ["bingoo.fr", "supabase.co", ...(propre ? [String(app.domaine)] : [])];
  const nom = String(s.nom ?? "Mon app").slice(0, 40);
  const couleur = /^#[0-9a-f]{6}$/i.test(s.couleur ?? "") ? s.couleur : "#4F46E5";
  const { sdk, deps } = await versions();
  const r = await fetch(`${SNACK}/snack/save`, {
    method: "POST", headers: { "content-type": "application/json", "Snack-Api-Version": "3.0.0" },
    body: JSON.stringify({
      manifest: { sdkVersion: sdk, name: nom, description: `${nom} : application construite avec Bingoo!`, dependencies: deps },
      code: { "App.js": { type: "CODE", contents: codeCoque({ nom, url, couleur, hotes }) } },
      dependencies: Object.fromEntries(Object.entries(deps).map(([k, v]) => [k, { version: v }])),
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d?.id) throw new Error(`Expo : ${d?.errors?.[0]?.message ?? r.status}`);
  const id = String(d.hashId ?? d.id);
  return { id, sdk, page: `https://snack.expo.dev/${id}`, at: new Date().toISOString() };
}
