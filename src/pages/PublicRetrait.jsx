import Logo from "../components/Logo";

// Page publique liée au robot de lecture (BingooBot) : ce qu'il lit, comment le bloquer, comment demander une correction ou un retrait.
const HF = { fontFamily: "var(--font-titre)" };
export default function PublicRetrait() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="max-w-3xl mx-auto px-5 pt-6"><a href="#/accueil"><Logo /></a></header>
      <main className="max-w-3xl mx-auto px-5 py-10 space-y-5 text-[16px] leading-relaxed">
        <h1 className="text-[34px] font-black leading-tight tracking-tight" style={HF}>BingooBot : ce qu'il lit, et comment le retirer</h1>
        <p>Bingoo! Explorer recense des logiciels SaaS à partir de leurs pages publiques : page d'accueil, page des tarifs, page carrières et page des nouveautés. Il relève les prix affichés, les formules, la présence d'offres d'emploi et la date de la dernière nouveauté publiée. Il ne crée aucun compte, ne remplit aucun formulaire et ne collecte aucune donnée personnelle.</p>
        <p><b>Le robot respecte le fichier robots.txt</b> : une page interdite à tous les robots (« User-agent: * ») ou à « BingooBot » n'est pas lue. Il visite chaque site au plus une fois par semaine.</p>
        <p><b>Chiffres d'entreprise.</b> Les chiffres affichés dans « Idées et réussites » (chiffre d'affaires, revenu récurrent, levées de fonds, salariés) ne sont pas lus par le robot : ils viennent d'articles de presse, de communiqués ou de documents officiels déjà publiés, et chacun renvoie à sa source. Les noms de fondateurs ou dirigeants n'y figurent que s'ils sont cités publiquement.</p>
        <p><b>Correction ou retrait.</b> Si vous éditez un logiciel présent dans Explorer et souhaitez corriger une information ou retirer sa fiche, écrivez à <a className="underline" href="mailto:bingoo@maisonravita.fr?subject=Explorer%20%3A%20correction%20ou%20retrait">bingoo@maisonravita.fr</a> depuis une adresse de votre domaine, en indiquant l'adresse du site. Une personne citée peut aussi demander le retrait de son nom à la même adresse. La demande est traitée sous 72 heures.</p>
      </main>
    </div>
  );
}
