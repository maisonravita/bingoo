// Traceurs branchés par le membre (Google Analytics, Tag Manager, Meta Pixel) sur la page publique de son SaaS ou site :
// chargés seulement après l'accord du visiteur (bandeau cookies, refus aussi simple que l'accord, choix gardé par appli).
export const aDesTraceurs = (cx) => !!(cx && (/^G-[A-Z0-9]{4,15}$/.test(cx.ga ?? "") || /^GTM-[A-Z0-9]{4,10}$/.test(cx.gtm ?? "") || /^\d{8,20}$/.test(cx.pixel ?? "")));
export const cleCookies = (slug) => "bingoo-cookies-" + slug;
export const choixCookies = (slug) => { try { return localStorage.getItem(cleCookies(slug)); } catch { return null; } };
let charges = false;
export function chargerTraceurs(cx) {
  if (charges || !aDesTraceurs(cx)) return; charges = true;
  const script = (src, texte) => { const x = document.createElement("script"); if (src) { x.async = true; x.src = src; } if (texte) x.text = texte; document.head.appendChild(x); };
  if (/^G-[A-Z0-9]{4,15}$/.test(cx.ga ?? "")) { script("https://www.googletagmanager.com/gtag/js?id=" + cx.ga); script(null, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cx.ga}');`); }
  if (/^GTM-[A-Z0-9]{4,10}$/.test(cx.gtm ?? "")) script(null, `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cx.gtm}');`);
  if (/^\d{8,20}$/.test(cx.pixel ?? "")) script(null, `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${cx.pixel}');fbq('track','PageView');`);
}
