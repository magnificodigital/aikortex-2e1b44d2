import { Link } from "react-router-dom";
import { Instagram, Youtube, Linkedin } from "lucide-react";
import aikortexLogoWhite from "@/assets/aikortex-logo-white.png";
import aikortexLogoBlack from "@/assets/aikortex-logo-black.png";
import type { SectionProps } from "./types";

const Footer = ({ t, isDark }: SectionProps) => {
  const L = t.footer.links;
  return (
    <footer className="relative z-10 border-t border-border/40 px-4 pt-16 pb-10 mt-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <img
              src={isDark ? aikortexLogoWhite : aikortexLogoBlack}
              alt="Aikortex"
              className="h-7 w-auto object-contain mb-4"
            />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{t.footer.tagline}</p>
            <div className="flex items-center gap-3 mt-5">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Produto */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">{t.footer.colProduct}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#como-funciona" className="hover:text-foreground transition-colors">{L.howItWorks}</a></li>
              <li><a href="#recursos" className="hover:text-foreground transition-colors">{L.features}</a></li>
              <li><a href="#diferenciais" className="hover:text-foreground transition-colors">{L.differentials}</a></li>
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">{t.footer.colResources}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#recursos" className="hover:text-foreground transition-colors">{L.agents}</a></li>
              <li><a href="#recursos" className="hover:text-foreground transition-colors">{L.integrations}</a></li>
              <li><a href="#recursos" className="hover:text-foreground transition-colors">{L.tutorials}</a></li>
            </ul>
          </div>

          {/* Ajuda + Legal */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">{t.footer.colHelp}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="mailto:suporte@aikortex.com" className="hover:text-foreground transition-colors">{L.support}</a></li>
              <li><a href="mailto:suporte@aikortex.com" className="hover:text-foreground transition-colors">{L.contact}</a></li>
            </ul>
            <h4 className="text-sm font-semibold text-foreground mt-6 mb-3">{t.footer.colLegal}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">{L.privacy}</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">{L.terms}</Link></li>
              <li><Link to="/data-deletion" className="hover:text-foreground transition-colors">{L.dataDeletion}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground/70">
          <span>© {new Date().getFullYear()} {t.footer.rights}</span>
          <span>{t.footer.madeIn}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
