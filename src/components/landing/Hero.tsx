import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { SectionProps } from "./types";

const Hero = ({ t, isDark, openAuth }: SectionProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section id="top" className="relative z-10 px-4 pt-16 pb-10 sm:pt-20">
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
        {/* Eyebrow */}
        <span className="font-mono-tight text-xs uppercase tracking-[0.22em] text-muted-foreground border border-border/60 rounded-full px-4 py-1.5 mb-8">
          {t.hero.eyebrow}
        </span>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight text-foreground">
          {t.hero.titleLead}
          <br />
          <span className="serif-italic font-normal text-foreground/90">{t.hero.titleAccent}</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base lg:text-lg text-muted-foreground max-w-xl leading-relaxed">
          {t.hero.subtitle}
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => openAuth("signup")}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
              e.currentTarget.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
            }}
            className="cta-glow-btn inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium"
          >
            {t.hero.ctaPrimary}
            <ArrowRight className="w-4 h-4 arrow-icon" />
          </button>
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-medium border border-border text-foreground hover:bg-accent transition-colors"
          >
            {t.hero.ctaSecondary}
          </a>
        </div>

        <p className="mt-4 text-xs text-muted-foreground/70">{t.hero.noCard}</p>

        {/* Demo video */}
        <div className="w-full max-w-3xl mt-12 group">
          <div className={`relative aspect-video rounded-2xl overflow-hidden border shadow-2xl ${isDark ? "border-white/10 bg-white/[0.03] backdrop-blur-sm" : "border-border bg-card"}`}>
            {!isPlaying ? (
              <>
                <img
                  src="https://img.youtube.com/vi/QyDYR1bwznw/maxresdefault.jpg"
                  alt={t.hero.videoLabel}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/25 transition-opacity duration-300 flex items-center justify-center">
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="w-16 h-16 rounded-full bg-white/95 text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200"
                    aria-label="Play"
                  >
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </button>
                </div>
              </>
            ) : (
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/QyDYR1bwznw?rel=0&modestbranding=1&start=56&autoplay=1"
                title={t.hero.videoLabel}
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
