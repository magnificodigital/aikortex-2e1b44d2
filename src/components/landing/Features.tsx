import { Bot, MessageCircle, Phone, Kanban, MessageSquare, Send, BrainCircuit, CalendarClock, Workflow, Webhook } from "lucide-react";
import type { SectionProps } from "./types";

const featureIcons = [Bot, MessageCircle, Phone, Kanban, MessageSquare, Send, BrainCircuit, CalendarClock, Workflow, Webhook];
// Índices destacados: Omnichannel Meta (1) e Stark Voice (2).
const highlighted = new Set([1, 2]);

const Features = ({ t }: SectionProps) => (
  <section id="recursos" className="relative z-10 px-4 py-16 sm:py-24 scroll-mt-20">
    <div className="max-w-6xl mx-auto">
      <div className="max-w-2xl mx-auto text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          {t.features.title}
        </h2>
        <p className="mt-4 text-muted-foreground">{t.features.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {t.features.items.map((item, i) => {
          const Icon = featureIcons[i] ?? Bot;
          const isHi = highlighted.has(i);
          return (
            <div
              key={item.name}
              className={`glass-card p-5 transition-transform duration-200 hover:-translate-y-0.5 ${isHi ? "ring-1 ring-primary/40 glow-primary" : ""}`}
            >
              <span className={`flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${isHi ? "bg-primary/15 text-primary" : "bg-muted text-foreground/80"}`}>
                <Icon className="w-5 h-5" />
              </span>
              <h3 className="text-base font-semibold text-foreground mb-1.5">{item.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default Features;
