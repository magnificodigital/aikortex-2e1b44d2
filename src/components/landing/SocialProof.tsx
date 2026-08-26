import type { SectionProps } from "./types";

const SocialProof = ({ t }: SectionProps) => (
  <section className="relative z-10 px-4 py-16 sm:py-20">
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground text-center mb-12">
        {t.social.title}
      </h2>

      <div className="grid gap-5 md:grid-cols-3">
        {t.social.testimonials.map((tm) => (
          <figure key={tm.name} className="glass-card p-6 flex flex-col">
            <span aria-hidden="true" className="serif-italic text-5xl leading-none text-primary/40 mb-2 select-none">“</span>
            <blockquote className="text-sm text-foreground/90 leading-relaxed flex-1">
              “{tm.quote}”
            </blockquote>
            <figcaption className="mt-5 pt-4 border-t border-border/50">
              <span className="block text-sm font-semibold text-foreground">{tm.name}</span>
              <span className="block text-xs text-muted-foreground">{tm.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Integrações / parceiros */}
      <div className="mt-14 text-center">
        <p className="font-mono-tight text-xs uppercase tracking-[0.22em] text-muted-foreground mb-6">
          {t.social.trustedBy}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground/70">
          {["OpenAI", "Claude", "Gemini", "WhatsApp", "Instagram", "ElevenLabs", "Meta", "Google Calendar"].map((name) => (
            <span key={name} className="font-medium">{name}</span>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default SocialProof;
