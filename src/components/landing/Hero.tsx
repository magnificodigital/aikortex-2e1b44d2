import { ArrowRight } from "lucide-react";
import aikortexLogoWhite from "@/assets/aikortex-logo-white.png";
import aikortexLogoBlack from "@/assets/aikortex-logo-black.png";
import type { SectionProps } from "./types";

const WHATSAPP_NUMBER = "5511952673915";
const WHATSAPP_MESSAGE = "Olá! Quero agendar uma demonstração da Aikortex.";
const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const Hero = ({ t, isDark }: SectionProps) => (
  <section id="top" className="relative z-10 min-h-[100svh] flex flex-col items-center justify-center px-4 py-16 text-center">
    {/* Logo */}
    <img
      src={isDark ? aikortexLogoWhite : aikortexLogoBlack}
      alt="Aikortex"
      className="h-11 sm:h-12 w-auto object-contain mb-10"
    />

    {/* Headline */}
    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight text-foreground">
      {t.hero.titleLead}
      <br />
      <span className="serif-italic font-normal text-foreground/90">{t.hero.titleAccent}</span>
    </h1>

    {/* Subtitle (duas linhas) */}
    <div className="mt-7 max-w-xl space-y-2">
      <p className="text-base lg:text-lg text-foreground/80 leading-relaxed">{t.hero.subtitle}</p>
      <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">{t.hero.subtitle2}</p>
    </div>

    {/* CTA WhatsApp */}
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
        e.currentTarget.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
      }}
      className="cta-glow-btn inline-flex items-center gap-2 mt-10 px-8 py-4 rounded-full text-sm font-medium"
    >
      {t.hero.ctaPrimary}
      <ArrowRight className="w-4 h-4 arrow-icon" />
    </a>
  </section>
);

export default Hero;
