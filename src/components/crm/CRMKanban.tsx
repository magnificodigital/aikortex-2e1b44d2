import { useState, useCallback, useMemo } from "react";
import { Lead, PipelineStage, PIPELINE_STAGES, TEMPERATURE_CONFIG, LEAD_SOURCES } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { DollarSign, Calendar, Trophy, XCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import confetti from "canvas-confetti";

interface Props {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStageChange: (leadId: string, newStage: PipelineStage) => void;
}

const MAIN_STAGES: PipelineStage[] = ["lead", "em_atendimento", "qualificado", "agendado", "negociacao"];
const FINAL_STAGES: PipelineStage[] = ["ganho", "perdido"];

const CRMKanban = ({ leads, onLeadClick, onStageChange }: Props) => {
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxStage, setLightboxStage] = useState<"ganho" | "perdido" | null>(null);
  const [lightboxSearch, setLightboxSearch] = useState("");
  const [lightboxTempFilter, setLightboxTempFilter] = useState<string>("all");

  const handleDragStart = () => setIsDragging(true);

  const celebrateWin = useCallback(() => {
    // 🎉 Confetti celebration
    const defaults = { startVelocity: 30, spread: 360, ticks: 100, zIndex: 9999 };

    confetti({ ...defaults, particleCount: 100, origin: { x: 0.2, y: 0.6 }, colors: ["#22c55e", "#16a34a", "#facc15", "#f59e0b", "#fbbf24"] });
    confetti({ ...defaults, particleCount: 100, origin: { x: 0.8, y: 0.6 }, colors: ["#22c55e", "#16a34a", "#facc15", "#f59e0b", "#fbbf24"] });

    setTimeout(() => {
      confetti({ ...defaults, particleCount: 60, origin: { x: 0.5, y: 0.4 }, colors: ["#22c55e", "#16a34a", "#facc15"], shapes: ["circle", "square"] });
    }, 250);

    setTimeout(() => {
      confetti({ ...defaults, particleCount: 40, origin: { x: 0.4, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#22c55e"] });
      confetti({ ...defaults, particleCount: 40, origin: { x: 0.6, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#22c55e"] });
    }, 500);

  }, []);

  const mourningLoss = useCallback(() => {
    // 😢 Sad emoji bubbles floating up
    const sadEmojis = ["😢", "😞", "😔", "💔", "😿", "😥"];
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const el = document.createElement("div");
        el.textContent = sadEmojis[Math.floor(Math.random() * sadEmojis.length)];
        el.style.cssText = `
          position: fixed;
          bottom: 80px;
          left: ${20 + Math.random() * 60}%;
          font-size: ${24 + Math.random() * 16}px;
          z-index: 9999;
          pointer-events: none;
          animation: floatUp ${2 + Math.random()}s ease-out forwards;
          opacity: 0.9;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3500);
      }, i * 150);
    }

    // Inject float animation if not present
    if (!document.getElementById("sad-float-style")) {
      const style = document.createElement("style");
      style.id = "sad-float-style";
      style.textContent = `
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          15% { opacity: 0.9; transform: translateY(-30px) scale(1); }
          100% { transform: translateY(-400px) scale(0.6) rotate(${Math.random() > 0.5 ? '' : '-'}15deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

  }, []);

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    if (!result.destination) return;
    const newStage = result.destination.droppableId as PipelineStage;
    if (newStage === "ganho") {
      celebrateWin();
    } else if (newStage === "perdido") {
      mourningLoss();
    }
    onStageChange(result.draggableId, newStage);
  };

  const renderColumn = (stage: PipelineStage, isFinal = false) => {
    const cfg = PIPELINE_STAGES.find((s) => s.value === stage)!;
    const columnLeads = leads.filter((l) => l.stage === stage);
    const totalValue = columnLeads.reduce((sum, l) => sum + l.value, 0);

    return (
      <div key={stage} className={`flex flex-col min-w-0 rounded-xl ${cfg.bg} p-2 overflow-hidden ${isFinal ? "min-h-[80px]" : ""}`}>
        <div className="mb-2 px-1 py-1.5 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className={`text-xs font-semibold ${cfg.color} truncate`}>{cfg.label}</span>
            </div>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{columnLeads.length}</Badge>
          </div>
          {!isFinal && (
            <p className="text-[10px] text-muted-foreground font-medium">
              R$ {totalValue.toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        <Droppable droppableId={stage}>
          {(provided, snapshot) => (
            <ScrollArea className={isFinal ? undefined : "flex-1"}>
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-2 min-h-[60px] rounded-lg p-1 transition-colors ${
                  snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
                }`}
              >
                {columnLeads.map((lead, index) => {
                  const temp = TEMPERATURE_CONFIG[lead.temperature];
                  const source = LEAD_SOURCES.find((s) => s.value === lead.source);

                  return (
                    <Draggable key={lead.id} draggableId={lead.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => onLeadClick(lead)}
                          className={`rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing transition-all space-y-2 ${
                            snapshot.isDragging
                              ? "shadow-lg ring-2 ring-primary/30 rotate-1"
                              : "hover:shadow-md hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-semibold text-foreground leading-tight truncate">{lead.name}</p>
                            <Badge variant="outline" className={`text-[8px] shrink-0 ${temp.color} ${temp.bg} border-0 px-1.5`}>
                              {temp.label}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{lead.company}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{lead.position}</p>
                          {lead.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {lead.tags.slice(0, 2).map((tag) => (
                                <span key={tag} className="text-[8px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-border/30">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[10px] font-medium text-foreground">
                                {lead.value >= 1000 ? `${(lead.value / 1000).toFixed(0)}k` : lead.value}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px]">{source?.icon}</span>
                              <Avatar className="w-5 h-5">
                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                  {lead.assignee.split(" ").map((n) => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                {columnLeads.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-[10px] text-muted-foreground">
                    Arraste leads aqui
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </Droppable>
      </div>
    );
  };

  const renderFinalStage = (stage: PipelineStage) => {
    const cfg = PIPELINE_STAGES.find((s) => s.value === stage)!;
    const columnLeads = leads.filter((l) => l.stage === stage);
    const isWon = stage === "ganho";

    return (
      <Droppable key={stage} droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 transition-all ${
              snapshot.isDraggingOver
                ? isWon
                  ? "border-success bg-success/10 shadow-sm"
                  : "border-destructive bg-destructive/10 shadow-sm"
                : isDragging
                  ? "border-muted-foreground/30 bg-muted/50"
                  : "border-border bg-card/50"
            }`}
          >
            <div
              className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLightboxStage(stage as "ganho" | "perdido")}
            >
              {isWon ? (
                <Trophy className="w-4 h-4 text-success" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span className={`text-xs font-semibold ${isWon ? "text-success" : "text-destructive"}`}>
                {cfg.label}
              </span>
              {columnLeads.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{columnLeads.length}</Badge>
              )}
            </div>
            <div className="flex gap-2 flex-1 overflow-x-auto min-h-[24px]">
              {columnLeads.map((lead, index) => (
                <Draggable key={lead.id} draggableId={lead.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={() => onLeadClick(lead)}
                      className="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 cursor-pointer hover:shadow-sm transition-all"
                    >
                      <p className="text-[11px] font-medium text-foreground whitespace-nowrap">{lead.name}</p>
                      <p className="text-[9px] text-muted-foreground whitespace-nowrap">
                        R$ {lead.value.toLocaleString("pt-BR")}
                      </p>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
    );
  };

    const lightboxLeads = lightboxStage ? leads.filter((l) => l.stage === lightboxStage) : [];
    const lightboxIsWon = lightboxStage === "ganho";
    const lightboxCfg = lightboxStage ? PIPELINE_STAGES.find((s) => s.value === lightboxStage) : null;
    const lightboxTotal = lightboxLeads.reduce((sum, l) => sum + l.value, 0);

    const filteredLightboxLeads = useMemo(() => {
      let filtered = lightboxLeads;
      if (lightboxSearch.trim()) {
        const q = lightboxSearch.toLowerCase();
        filtered = filtered.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.company.toLowerCase().includes(q) ||
            l.position.toLowerCase().includes(q) ||
            l.assignee.toLowerCase().includes(q)
        );
      }
      if (lightboxTempFilter !== "all") {
        filtered = filtered.filter((l) => l.temperature === lightboxTempFilter);
      }
      return filtered;
    }, [lightboxLeads, lightboxSearch, lightboxTempFilter]);

    const handleLightboxOpen = (open: boolean) => {
      if (!open) {
        setLightboxStage(null);
        setLightboxSearch("");
        setLightboxTempFilter("all");
      }
    };

    return (
      <>
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-2 h-[calc(100vh-260px)]">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 min-h-0 flex-1 overflow-hidden">
              {MAIN_STAGES.map((stage) => renderColumn(stage))}
            </div>
            <div className="grid grid-cols-2 gap-2 shrink-0">
              {renderFinalStage("perdido")}
              {renderFinalStage("ganho")}
            </div>
          </div>
        </DragDropContext>

        <Dialog open={!!lightboxStage} onOpenChange={handleLightboxOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {lightboxIsWon ? (
                  <Trophy className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                <span>{lightboxCfg?.label}</span>
                <Badge variant="secondary" className="ml-1">{lightboxLeads.length}</Badge>
              </DialogTitle>
              <DialogDescription>
                Total: R$ {lightboxTotal.toLocaleString("pt-BR")}
              </DialogDescription>
            </DialogHeader>

            {/* Search & Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nome, empresa, cargo..."
                  value={lightboxSearch}
                  onChange={(e) => setLightboxSearch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={lightboxTempFilter}
                onChange={(e) => setLightboxTempFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Todas temp.</option>
                <option value="quente">🔥 Quente</option>
                <option value="morno">🌤️ Morno</option>
                <option value="frio">❄️ Frio</option>
              </select>
            </div>

            {filteredLightboxLeads.length !== lightboxLeads.length && (
              <p className="text-xs text-muted-foreground">
                Mostrando {filteredLightboxLeads.length} de {lightboxLeads.length} leads
              </p>
            )}

            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-2 pr-2">
                {filteredLightboxLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado</p>
                ) : (
                  lightboxLeads.map((lead) => {
                    const temp = TEMPERATURE_CONFIG[lead.temperature];
                    const source = LEAD_SOURCES.find((s) => s.value === lead.source);
                    return (
                      <div
                        key={lead.id}
                        onClick={() => { setLightboxStage(null); onLeadClick(lead); }}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.company} • {lead.position}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className={`text-[10px] ${temp.color} ${temp.bg} border-0`}>
                            {temp.label}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              R$ {lead.value.toLocaleString("pt-BR")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{source?.icon} {lead.assignee}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </>
    );
  };

export default CRMKanban;
