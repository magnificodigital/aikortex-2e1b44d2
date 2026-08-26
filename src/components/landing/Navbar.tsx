import { useState } from "react";
import { Sun, Moon, Menu, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import aikortexLogoWhite from "@/assets/aikortex-logo-white.png";
import aikortexLogoBlack from "@/assets/aikortex-logo-black.png";
import type { LandingCopy, Lang } from "./types";

interface NavbarProps {
  t: LandingCopy;
  isDark: boolean;
  lang: Lang;
  onLangChange: (value: string) => void;
  toggleTheme: () => void;
  openAuth: (mode: "signin" | "signup") => void;
}

const navLinks = (t: LandingCopy) => [
  { href: "#como-funciona", label: t.nav.howItWorks },
  { href: "#recursos", label: t.nav.features },
  { href: "#diferenciais", label: t.nav.differentials },
];

const Navbar = ({ t, isDark, lang, onLangChange, toggleTheme, openAuth }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = navLinks(t);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/40 border-b border-border/40">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Logo */}
        <a href="#top" className="flex items-center shrink-0">
          <img
            src={isDark ? aikortexLogoWhite : aikortexLogoBlack}
            alt="Aikortex"
            className="h-7 w-auto object-contain"
          />
        </a>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Select value={lang} onValueChange={onLangChange}>
            <SelectTrigger className="h-8 w-12 justify-center border-none bg-transparent p-0 focus:ring-0" aria-label="Language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">BR</SelectItem>
              <SelectItem value="en">EN</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => openAuth("signin")}
            className="px-4 py-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.nav.signIn}
          </button>
          <button
            onClick={() => openAuth("signup")}
            className="cta-glow-btn px-5 py-2 rounded-full text-sm font-medium"
          >
            {t.nav.startNow}
          </button>
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors" aria-label="Theme">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col px-5 py-4 gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="my-2 border-t border-border/40" />
            <Select value={lang} onValueChange={(v) => { onLangChange(v); setMobileOpen(false); }}>
              <SelectTrigger className="h-9 w-full justify-center gap-2 border border-border bg-muted px-3 text-sm focus:ring-0 rounded-lg" aria-label="Language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">BR</SelectItem>
                <SelectItem value="en">EN</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => { openAuth("signin"); setMobileOpen(false); }}
              className="w-full py-2.5 mt-2 rounded-full text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.nav.signIn}
            </button>
            <button
              onClick={() => { openAuth("signup"); setMobileOpen(false); }}
              className="cta-glow-btn w-full py-2.5 mt-1 rounded-full text-sm font-medium"
            >
              {t.nav.startNow}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
