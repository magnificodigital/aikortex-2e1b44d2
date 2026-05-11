import { Stethoscope, ShieldCheck, Building2, Tag, type LucideIcon } from "lucide-react";

/**
 * Maps niche_categories.icon string -> Lucide icon component.
 * Extend this map when new niches are seeded by the platform admin.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Stethoscope,
  ShieldCheck,
  Building2,
};

export const getNicheIcon = (iconName: string | null | undefined): LucideIcon =>
  (iconName && ICON_MAP[iconName]) || Tag;
