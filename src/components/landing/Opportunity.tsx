import { TrendingUp } from "lucide-react";
import type { SectionProps } from "./types";

const Opportunity = ({ t }: SectionProps) => (
  <section className="relative z-10 px-4 py-16 sm:py-20">
    <div className="max-w-4xl mx-auto text-center">
      <span className="font-mono-tight text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {t.opportunity.title}
      </span>
      <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        {t.opportunity.subtitle}
      </h2>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 text-left">
        {t.opportunity.items.map((item) => (
          <div key={item} className="glass-card flex items-start gap-3 p-4">
            <TrendingUp className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
            <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Opportunity;
