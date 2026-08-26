import type { LandingCopy, Lang } from "./copy";

export type { LandingCopy, Lang };

/** Props compartilhadas por todas as seções da landing. */
export interface SectionProps {
  t: LandingCopy;
  isDark: boolean;
  /** Abre o AuthModal — usado por todos os CTAs de conversão. */
  openAuth: (mode: "signin" | "signup") => void;
}
