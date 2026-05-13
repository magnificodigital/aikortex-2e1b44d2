import { Stethoscope, ShieldCheck, Building2, UtensilsCrossed, GraduationCap, Car, Wallet, ShoppingBag, Cloud, ShieldAlert, Sparkles, PawPrint, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Stethoscope,           // Saúde
  ShieldCheck,           // Advocacia
  Building2,             // Imobiliária
  UtensilsCrossed,       // Food/Restaurante
  GraduationCap,         // Educação
  Car,                   // Automotivo
  Wallet,                // Finanças
  ShoppingBag,           // Retail
  Cloud,                 // SaaS B2B
  ShieldAlert,           // Seguros
  Sparkles,              // Estética
  PawPrint,              // Pet
};

export const getNicheIcon = (iconName: string | null | undefined): LucideIcon =>
  (iconName && ICON_MAP[iconName]) || ShoppingBag;
