import DashboardLayout from "@/components/DashboardLayout";
import { Radio } from "lucide-react";

const SintonIA = () => (
  <DashboardLayout>
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Radio className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">SintonIA</h1>
          <p className="text-sm text-muted-foreground">Hub de mídia e comunidade</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { title: "Episódios", desc: "Podcast e debates sobre IA" },
          { title: "Comunidade", desc: "Networking e discussões" },
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

export default SintonIA;
