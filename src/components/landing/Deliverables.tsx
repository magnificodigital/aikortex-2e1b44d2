import { Rocket, GraduationCap, DollarSign, Award, Check } from "lucide-react";
import type { SectionProps } from "./types";

const blockIcons = [Rocket, GraduationCap, DollarSign, Award];

const Deliverables = ({ t }: SectionProps) => (
  <section className="relative z-10 px-4 py-16 sm:py-20">
    <div className="max-w-6xl mx-auto">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          {t.deliverables.title}
        </h2>
        <p className="mt-4 text-muted-foreground">{t.deliverables.subtitle}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {t.deliverables.blocks.map((block, i) => {
          const Icon = blockIcons[i] ?? Rocket;
          return (
            <div key={block.name} className="glass-card p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary glow-primary">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-semibold text-foreground">{block.name}</h3>
              </div>
              <ul className="space-y-2.5">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default Deliverables;
