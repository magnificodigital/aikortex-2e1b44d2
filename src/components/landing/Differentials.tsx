import { Zap, Cpu, Users, Handshake } from "lucide-react";
import type { SectionProps } from "./types";

const diffIcons = [Zap, Cpu, Users, Handshake];

const Differentials = ({ t }: SectionProps) => (
  <section id="diferenciais" className="relative z-10 px-4 py-16 sm:py-20 scroll-mt-20">
    <div className="max-w-5xl mx-auto">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          {t.differentials.title}
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {t.differentials.items.map((item, i) => {
          const Icon = diffIcons[i] ?? Zap;
          return (
            <div key={item.name} className="glass-card flex items-start gap-4 p-6">
              <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary">
                <Icon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">{item.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default Differentials;
