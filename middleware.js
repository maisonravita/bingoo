// Domaine d'un membre (site ou SaaS construit par Bingoo!) : sa page d'accueil reçoit ses propres balises (Google, partage),
// rendues par /api/site. Les domaines de Bingoo! ne passent pas par ici.
export const config = { matcher: "/" };

export default function middleware(request) {
  const host = (request.headers.get("host") || "").toLowerCase().replace(/:\d+$/, "");
  if (!host || /(^|\.)(bingoo\.fr|maisonravita\.fr|vercel\.app)$|^localhost$|^127\./.test(host)) return;
  const url = new URL(request.url);
  url.pathname = "/api/site";
  url.search = "?host=" + encodeURIComponent(host);
  return new Response(null, { headers: { "x-middleware-rewrite": url.toString() } });
}
