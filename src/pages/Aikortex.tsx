import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Plus, Bot, Trash2, Pencil, Clock, MoreVertical,
  ArrowRight, Settings2, Sparkles, Target, Headphones,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUserAgents, type UserAgent } from "@/hooks/use-user-agents";
import { AGENT_PRESETS } from "@/types/agent-presets";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import avatar1 from "@/assets/avatars/avatar-1.png";
import avatar2 from "@/assets/avatars/avatar-2.png";
import avatar3 from "@/assets/avatars/avatar-3.png";
import avatar8 from "@/assets/avatars/avatar-8.png";

const TEMPLATE_CARDS = [
  {
    id: "sdr-1",
    name: "Agente SDR",
    description: "Qualifica leads inbound, responde em segundos e agenda reuniões com o time comercial 24/7.",
    avatar: avatar1,
    type: "SDR" as const,
    cat: "Vendas",
    icon: Target,
  },
  {
    id: "sac-1",
    name: "Agente SAC",
    description: "Atende clientes automaticamente, resolve dúvidas e reduz tickets com suporte inteligente.",
    avatar: avatar3,
    type: "SAC" as const,
    cat: "Suporte",
    icon: Headphones,
  },
];

const AVATAR_MAP: Record<string, string> = {
  "sdr-1": avatar1, "sac-1": avatar3,
};

const Aikortex = () => {
  const navigate = useNavigate();
  const { agents, loading, deleteAgent } = useUserAgents();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleOpenAgent = (agentId: string) => {
    navigate(`/aikortex/agents/${agentId}`);
  };

  const handleUseTemplate = (card: typeof TEMPLATE_CARDS[0]) => {
    const preset = AGENT_PRESETS[card.type];

    const storagePrefix = `agent-detail-${card.id}`;
    try {
      ["name", "desc", "objective", "instructions", "toneOfVoice", "greetingMessage"].forEach(k =>
        localStorage.removeItem(`${storagePrefix}-${k}`)
      );
    } catch {}

    navigate(`/aikortex/agents/${card.id}`, {
      state: {
        fromTemplate: true,
        agentType: card.type,
        agentName: card.name,
        preset: {
          agentName: card.name,
          agentObjective: card.description,
          context: preset.context,
          intents: preset.intents,
          stages: preset.stages,
          advancedConfig: preset.advancedConfig,
        },
      },
    });
  };

  const handleNewCustom = () => {
    const newId = `new-${Date.now()}`;
    navigate(`/aikortex/agents/${newId}`, {
      state: {
        fromTemplate: false,
        agentType: "Custom",
        agentName: "Novo Agente",
      },
    });
  };

  const handleDeleteAgent = async () => {
    if (!deleteId) return;
    const success = await deleteAgent(deleteId);
    if (success) toast.success("Agente excluído.");
    setDeleteId(null);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const PROVIDER_BADGE: Record<string, { label: string; className: string }> = {
    anthropic: { label: "Claude", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
    openai:    { label: "GPT",    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    gemini:    { label: "Gemini", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    openrouter:{ label: "Router", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
    auto:      { label: "Auto",   className: "bg-muted text-muted-foreground border-border" },
  };

  const getAvatarSrc = (agent: UserAgent) => {
    if (agent.avatar_url) return agent.avatar_url;
    const key = agent.agent_type?.toLowerCase() === "sdr" ? "sdr-1"
      : agent.agent_type?.toLowerCase() === "sac" ? "sac-1"
      : "sdr-1";
    return AVATAR_MAP[key] || avatar1;
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Agentes IA</h1>
            <p className="text-sm text-muted-foreground">
              Crie agentes inteligentes para vendas, suporte, marketing e mais.
            </p>
          </div>
          <Button onClick={handleNewCustom} className="gap-2 rounded-full">
            <Plus className="w-4 h-4" /> Novo Agente
          </Button>
        </div>

        {/* Saved Agents */}
        {!loading && agents.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-foreground mb-3">Meus Agentes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
                  onClick={() => handleOpenAgent(agent.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={getAvatarSrc(agent)}
                        alt={agent.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-bold text-foreground">{agent.name}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {agent.agent_type} • {agent.status === "online" ? "Online" : "Configurando"}
                          </p>
                          {(() => {
                            const prov = agent.provider || "auto";
                            const badge = PROVIDER_BADGE[prov] || PROVIDER_BADGE.auto;
                            return (
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${badge.className}`}>
                                {badge.label}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenAgent(agent.id); }}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(agent.id); }}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {agent.description || "Sem descrição"}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Atualizado em {formatDate(agent.updated_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates */}
        <h2 className="text-sm font-semibold text-foreground mb-3">Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATE_CARDS.map((card) => (
            <div
              key={card.id}
              onClick={() => handleUseTemplate(card)}
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <img
                  src={card.avatar}
                  alt={card.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-0.5">{card.name}</h3>
              <p className="text-[10px] text-primary/70 font-medium mb-1.5">{card.cat}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{card.description}</p>
              <div className="flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Criar semelhante <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          ))}

          {/* Custom card */}
          <div
            onClick={handleNewCustom}
            className="group rounded-xl border border-dashed border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-accent-foreground" />
              </div>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-0.5">Personalizado</h3>
            <p className="text-[10px] text-primary/70 font-medium mb-1.5">Livre</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Crie um agente do zero com total liberdade: objetivos, canais, integrações e comportamento.
            </p>
            <div className="flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Criar agente <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Agente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAgent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Aikortex;
