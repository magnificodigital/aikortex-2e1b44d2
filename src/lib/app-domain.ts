// Arquitetura de 3 domínios (mesma SPA, comportamento por hostname):
//   aikortex.com / www      → SITE institucional (marketing)
//   app.aikortex.com        → PRODUTO (agências/clientes)
//   dash.aikortex.com       → DASH (painel do admin do SaaS)
// localhost / *.vercel.app  → tratados como "app" (acesso pleno em dev/preview).

export type AppMode = "site" | "app" | "dash";

export const DOMAINS = {
  site: "https://aikortex.com",
  app: "https://app.aikortex.com",
  dash: "https://dash.aikortex.com",
} as const;

export function getAppMode(): AppMode {
  if (typeof window === "undefined") return "app";
  const h = window.location.hostname;
  if (h.startsWith("dash.")) return "dash";
  if (h === "aikortex.com" || h === "www.aikortex.com") return "site";
  // app.aikortex.com, localhost, previews .vercel.app → produto
  return "app";
}
