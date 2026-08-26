import { getAppMode } from "@/lib/app-domain";
import MarketingLanding from "@/components/landing/MarketingLanding";
import AppLanding from "./AppLanding";

// Rota `/`: o site institucional (aikortex.com) mostra a home «Agência Inteligente»;
// qualquer outro host (app.aikortex.com, aikortex.vercel.app, previews, localhost)
// mantém a landing do app inalterada.
const resolveIsMarketing = (): boolean => {
  if (typeof window === "undefined") return false;
  // Override para preview/testes: ?view=marketing força o site; ?view=app força o app.
  const override = new URLSearchParams(window.location.search).get("view");
  if (override === "marketing") return true;
  if (override === "app") return false;
  return getAppMode() === "site";
};

const LandingPage = () => (resolveIsMarketing() ? <MarketingLanding /> : <AppLanding />);

export default LandingPage;
