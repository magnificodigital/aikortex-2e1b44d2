import DashboardLayout from "@/components/DashboardLayout";
import { Calendar } from "lucide-react";

const IAgora = () => (
  <DashboardLayout>
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">IAgora</h1>
          <p className="text-sm text-muted-foreground">Hub de eventos e networking</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { title: "Eventos", desc: "Agenda de eventos do ecossistema" },
          { title: "Palestrantes", desc: "Submeta palestras e participe" },
          { title: "Comunidade", desc: "Conecte-se com parceiros" },
        ].map((item) => (
          <div key={item.title} className="glass-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </DashboardLayout>
);

export default IAgora;
