// Explication prudente des liens Attrey, calculée à partir de l'URL et du texte disponible.
// Ne transforme jamais la découverte d'un lien en demande réelle, publication récente ou accord de prospection.
const tidy=(x)=>String(x||"").replace(/https?:\/\/\S+/g,"").replace(/^[\s*#\d).:-]+/,"").replace(/\*+/g,"").replace(/\s+/g," ").trim();
const uninformative=(x)=>!x||/^(?:lien|publication publique à vérifier|publication|url|source|https?)\s*:?$/i.test(x);
const human=(s)=>s.replace(/[-_]+/g," ").replace(/\s+/g," ").trim();
const locationHint=(path)=>{
  const x=path.match(/paris[- ]?(\d{1,2})(?:eme|e|er)?(?:-|\/|$)/i);
  return x?`Paris ${x[1]}e`:/paris/i.test(path)?"Paris":null;
};
export function explainAttreyCandidate(item) {
  let u;
  try{u=new URL(item.source_url);}catch{return null;}
  const host=u.hostname.replace(/^www\./i,"").toLowerCase();
  const path=decodeURIComponent(u.pathname).toLowerCase();
  const title=tidy(item.title);
  const excerpt=tidy(item.excerpt);
  const uselessText=uninformative(title)||/^-?\s*lien\s*:/i.test(title);
  const isListing=/\/rooms\/\d+|\/ad\/(?:locations|ventes_immobilieres)\/\d+|\/annonces\//i.test(path);
  const city=locationHint(path);
  const genericTitle=(name)=>city?`${name} — ${city}`:name;
  let type="Page publique à examiner",why="Lien repéré pendant la veille immobilière ; sa pertinence reste à confirmer.",
    what="Page détectée dans une recherche de sources ouvertes.",next="Ouvrir la page pour identifier son contenu et vérifier si elle présente un besoin réel.",
    group="a_examiner",label="À examiner",headline="Page publique à examiner";

  if(host.endsWith("allovoisins.com")){
    const category=/\/v\/(?:si\/)?/.test(path);
    const topic=/conciergerie/.test(path)?"conciergerie":/gestion-de-location/.test(path)?"gestion locative":"services immobiliers";
    headline=genericTitle(`AlloVoisins — ${topic}`);
    type=category?"Page de catégorie de services AlloVoisins":"Page publique AlloVoisins";
    what=category?`Cette URL mène à une rubrique locale de ${topic}, et non à une demande individuelle identifiée.`:"Lien AlloVoisins trouvé dans la recherche de demandes immobilières.";
    why="Attrey surveille ces pages pour repérer d'éventuelles demandes de propriétaires.";
    next="Chercher une demande datée et formulée par un particulier. Ne pas traiter cette page de catégorie comme un prospect.";
    group="veille";label="Page de veille";
  }else if(host.endsWith("airbnb.fr")||host.endsWith("airbnb.com")){
    headline=genericTitle("Airbnb — fiche de logement");
    type="Annonce de location de courte durée";
    what="Cette URL correspond au format d'une fiche de logement Airbnb. Sa disponibilité et son contenu ne sont pas encore vérifiés.";
    why="Elle permet de repérer un logement présent sur le marché de la location saisonnière.";
    next="Vérifier le logement et l'existence d'un besoin de gestion distinct. Une annonce Airbnb n'est pas une demande de conciergerie.";
    group="annonce";label="Bien potentiel";
  }else if(host.endsWith("abritel.fr")||host.endsWith("vrbo.com")){
    headline=genericTitle("Abritel — location saisonnière");
    type="Annonce de logement saisonnier";
    what="Lien vers une page de location saisonnière ; le bien et son statut restent à confirmer.";
    why="Attrey repère les biens existants susceptibles d'intéresser son activité immobilière.";
    next="Vérifier l'annonce. Ne pas présumer que le propriétaire souhaite déléguer sa gestion.";
    group="annonce";label="Bien potentiel";
  }else if(host.endsWith("seloger.com")){
    headline=genericTitle(/\/locations\//.test(path)?"SeLoger — location d'appartement":/\/achat\//.test(path)?"SeLoger — vente immobilière":"SeLoger — annonce immobilière");
    type="Annonce immobilière";
    what=`URL d'annonce SeLoger${/\/locations\//.test(path)?" dans la rubrique location":""}. Prix, disponibilité et identité de l'annonceur non confirmés.`;
    why="Attrey peut identifier des biens présents sur le marché, sans que cela prouve un besoin commercial.";
    next="Ouvrir l'annonce, vérifier si elle est active, sa localisation et la qualité de l'annonceur avant toute démarche.";
    group="annonce";label="Bien potentiel";
  }else if(host.endsWith("pap.fr")){
    headline=genericTitle("PAP — annonce d'appartement");
    type="Annonce immobilière sur PAP";
    what="Lien d'annonce immobilière PAP (particulier à particulier) ; détails et disponibilité à vérifier.";
    why="Cette source est utile pour repérer des biens de particuliers sur le marché.";
    next="Vérifier si l'annonce est actuelle et distinguer propriétaire réel, professionnel éventuel et simple annonce.";
    group="annonce";label="Bien potentiel";
  }else if(host.endsWith("leboncoin.fr")){
    headline=genericTitle(/\/ad\/locations\//.test(path)?"Leboncoin — annonce de location":"Leboncoin — annonce immobilière");
    type="Petite annonce immobilière";
    what="Lien vers une petite annonce publique ; il ne prouve pas que son auteur souhaite un service de conciergerie.";
    why="Attrey explore les annonces de logements et les éventuelles demandes immobilières.";
    next="Lire l'annonce et sa date, confirmer le type d'annonceur et l'objet exact avant d'envisager un suivi.";
    group="annonce";label="Bien potentiel";
  }else if(host.endsWith("expat.com")||host.endsWith("reddit.com")){
    const subject=title&&!uselessText?title:human(path.split("/").pop()?.replace(/\.html$/,"").replace(/^\d+-/,"")||"");
    headline=subject&&subject.length>8?subject:"Discussion publique sur le logement";
    type="Discussion publique de forum";
    what=`Un sujet publié sur ${host.endsWith("reddit.com")?"Reddit":"Expat.com"}. Le titre indique un thème, pas nécessairement un projet immobilier encore actif.`;
    why=/apartment|appartement|housing|logement|location|rent|buying an apartment|cherche|sous location/i.test(headline)
      ?"Son titre évoque une question ou une recherche liée au logement."
      :"Il a été repéré dans un forum surveillé pour les déménagements et besoins de logement.";
    next="Lire le premier message, vérifier sa date réelle, la ville et si l'auteur recherche toujours une solution.";
    group="a_examiner";label="Discussion à qualifier";
  }else if(host.endsWith("linkedin.com")){
    headline=title&&!uselessText?title:"LinkedIn — publication professionnelle";
    type="Publication LinkedIn";
    what="Publication professionnelle identifiée pendant la recherche de partenaires et de mobilité.";
    why="Peut révéler un acteur du marché ou un partenariat potentiel, pas nécessairement une demande client.";
    next="Vérifier la date de la publication et si elle exprime une demande actuelle. Une promotion d'entreprise n'est pas un prospect.";
    group="veille";label="Partenaire / veille";
  }else if(host.endsWith("facebook.com")){
    headline=title&&!uselessText?title:"Facebook — publication publique";
    type="Publication Facebook publique";
    what="Lien trouvé dans les résultats publics ; aucun contenu privé ou groupe fermé n'est consulté.";
    why="Des publications publiques peuvent parfois contenir des demandes de logement.";
    next="Vérifier que le post est accessible, récent et qu'il contient une demande explicite.";
    group="a_examiner";label="À qualifier";
  }else{
    headline=title&&!uselessText?title:human(host.split(".")[0])+" — page immobilière";
    if(/realestate|immobilier|mobilit|relocat|housing|logement/i.test(host+" "+headline)){
      type="Site professionnel ou ressource immobilière";
      what="Site ou page professionnelle lié à l'immobilier ou à la mobilité, sans demande client individuelle confirmée.";
      why="Peut servir à comprendre le marché, trouver des intermédiaires ou préparer des partenariats.";
      next="Vérifier le rôle de l'organisation et l'existence d'un besoin concret avant de la considérer comme prospect.";
      group="veille";label="Partenaire / veille";
    }
  }
  // Le texte original n'est pas nécessairement fiable : seules les informations lisibles et utiles sont affichées.
  const detail=excerpt && !/^lien\s*:?$/i.test(excerpt) && excerpt.length>28 ? excerpt.slice(0,280) : null;
  const published=item.source_published_at?new Date(item.source_published_at):null;
  const knownDate=published && !Number.isNaN(published.getTime());
  return {
    type,headline,what,why,next,group,label,
    detail,
    source:host,
    publishedLabel:knownDate?`Publication indiquée : ${published.toLocaleDateString("fr-FR")}`:"Date de publication inconnue",
    firstSeenLabel:item.first_seen_at?`Repéré par Attrey le ${new Date(item.first_seen_at).toLocaleDateString("fr-FR")}`:"Date de découverte inconnue"
  };
}
