import { useState } from "react";
import { NODE_CATEGORIES, NODE_TEMPLATES, type FlowNodeCategory } from "@/types/flow-builder";
import { Input } from "@/components/ui/input";
import { Search, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const categoryBorder: Record<string, string> = {
  trigger: "border-l-emerald-500",
  processing: "border-l-indigo-500",
  logic: "border-l-amber-500",
  control: "border-l-pink-500",
  output: "border-l-cyan-500",
  integration: "border-l-violet-500",
  data_capture: "border-l-emerald-400",
  crm_actions: "border-l-orange-500",
  knowledge: "border-l-purple-500",
  database: "border-l-blue-500",
  dev_advanced: "border-l-slate-500",
};

export default function FlowNodePalette() {
  const [search, setSearch] = useState("");
  const filtered = NODE_TEMPLATES.filter(
    (t) =>
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const grouped = NODE_CATEGORIES.map((cat) => ({
    ...cat,
    items: filtered.filter((t) => t.category === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="h-full flex flex-col bg-card/80 backdrop-blur-sm">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Blocos</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar blocos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={NODE_CATEGORIES.map((c) => c.key)}>
          {grouped.map((group) => (
            <AccordionItem key={group.key} value={group.key} className="border-none">
              <AccordionTrigger className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                  {group.label} ({group.items.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2 space-y-1">
                {group.items.map((template) => (
                  <div
                    key={template.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, template.type)}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border/60 border-l-[3px] cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-all group",
                      categoryBorder[template.category]
                    )}
                  >
                    <GripVertical className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-shrink-0">{template.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{template.label}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{template.description}</p>
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
