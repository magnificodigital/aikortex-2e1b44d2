import { Plug, SlidersHorizontal, TrendingUp } from "lucide-react";
import type { SectionProps } from "./types";

const stepIcons = [Plug, SlidersHorizontal, TrendingUp];

const HowItWorks = ({ t }: SectionProps) => (
  <section id="como-funciona" className="relative z-10 px-4 py-16 sm:py-24 scroll-mt-20">
    <div className="max-w-5xl mx-auto">
      <div className="max-w-2xl mx-auto text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          {t.how.title}
        </h2>
        <p className="mt-4 text-muted-foreground">{t.how.subtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {t.how.steps.map((step, i) => {
          const Icon = stepIcons[i] ?? Plug;
          return (
            <div key={step.name} className="relative glass-card p-6 sm:p-7">
              <span className="serif-italic text-5xl text-primary/25 absolute top-4 right-5 select-none">
                {i + 1}
              </span>
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary mb-5">
                <Icon className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold text-foreground mb-2">{step.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default HowItWorks;
