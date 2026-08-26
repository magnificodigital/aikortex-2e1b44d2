import { ArrowRight, Sparkles } from "lucide-react";
import type { SectionProps } from "./types";

const LaunchCTA = ({ t, openAuth }: SectionProps) => (
  <section className="relative z-10 px-4 py-20 sm:py-28">
    <div className="max-w-4xl mx-auto">
      <div className="glass-card relative overflow-hidden px-6 py-14 sm:px-12 sm:py-16 text-center">
        {/* glow de fundo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-24 h-64 opacity-60 blur-3xl"
          style={{ background: "radial-gradient(ellipse 50% 80% at 50% 100%, hsl(var(--primary) / 0.35), transparent 70%)" }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 font-mono-tight text-xs uppercase tracking-[0.22em] text-primary mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            {t.launch.eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground max-w-2xl mx-auto leading-[1.12]">
            {t.launch.title}
          </h2>
          <p className="mt-5 text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {t.launch.subtitle}
          </p>
          <button
            onClick={() => openAuth("signup")}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
              e.currentTarget.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
            }}
            className="cta-glow-btn inline-flex items-center gap-2 mt-9 px-8 py-4 rounded-full text-sm font-medium"
          >
            {t.launch.cta}
            <ArrowRight className="w-4 h-4 arrow-icon" />
          </button>
          <p className="mt-4 text-xs text-muted-foreground/70">{t.launch.note}</p>
        </div>
      </div>
    </div>
  </section>
);

export default LaunchCTA;
