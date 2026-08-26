import MarketingLanding from "@/components/landing/MarketingLanding";
import AppLanding from "./AppLanding";

// Domínios que servem o site institucional (hero «Agência Inteligente»).
// Qualquer outro host (app.aikortex.com, aikortex.vercel.app, previews, localhost)
// mantém a landing do app inalterada.
const MARKETING_HOSTS = new Set(["aikortex.com", "www.aikortex.com"]);

const resolveIsMarketing = (): boolean => {
  if (typeof window === "undefined") return false;
  // Override para preview/testes: ?view=marketing força o hero; ?view=app força o app.
  const override = new URLSearchParams(window.location.search).get("view");
  if (override === "marketing") return true;
  if (override === "app") return false;
  return MARKETING_HOSTS.has(window.location.hostname);
};

const LandingPage = () => (resolveIsMarketing() ? <MarketingLanding /> : <AppLanding />);

export default LandingPage;
