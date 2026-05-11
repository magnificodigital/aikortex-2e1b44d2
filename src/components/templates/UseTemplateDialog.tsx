import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2 } from "lucide-react";
import { useActiveClient } from "@/hooks/use-active-client";
import { supabase } from "@/integrations/supabase/client";
import type { TemplateRow } from "@/types/templates";
import { buildDefaultFlowForAgent } from "@/lib/agent-flow-builder";

type Props = {
  template: TemplateRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const UseTemplateDialog = ({ template, open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const { activeClientId, activeClient, activeClientName, isAgencyMode } = useActiveClient();

  const [name, setName] = useState("");
  const [extra1, setExtra1] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isApp = template?.category === "app";

  useEffect(() => {
    if (!open || !template) return;
    setName(`${template.name} - ${activeClientName}`);
    const cfg = (isApp ? template.app_config : template.agent_config) || {};
    setExtra1(isApp ? (cfg.description ?? "") : (cfg.tone_of_voice ?? cfg.toneOfVoice ?? ""));
  }, [open, template, activeClientName, isApp]);

  const valid = useMemo(() => {
    if (isAgencyMode || !activeClientId) return false;
    if (!name || name.trim().length < 3) return false;
    return true;
  }, [name, isAgencyMode, activeClientId]);

  if (!template) return null;

  const handleSubmit = async () => {
    if (!valid || !template || !activeClientId || !activeClient) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Faça login para continuar.");
        setSubmitting(false);
        return;
      }

      if (template.category === "app") {
        const cfg = (template.app_config ?? {}) as Record<string, any>;
        const payload = {
          user_id: user.id,
          client_id: activeClientId,
          name: name.trim(),
          description: extra1 || cfg.description || template.description || "",
          channel: cfg.channel || "web",
          config: cfg.config || {},
          files: cfg.files || [],
          tables_schema: cfg.tables_schema || [],
          status: "draft",
        };
        const { data, error } = await supabase
          .from("user_apps")
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        toast.success(`App "${name.trim()}" criado para ${activeClient.client_name}`);
        onOpenChange(false);
        navigate("/app-builder", { state: { appId: (data as any).id, channel: payload.channel } });
      } else {
        const cfg = (template.agent_config ?? {}) as Record<string, any>;
        const payload: Record<string, any> = {
          user_id: user.id,
          client_id: activeClientId,
          name: name.trim(),
          agent_type: cfg.agent_type || "Custom",
          description: cfg.description || template.description || "",
          avatar_url: cfg.avatar_url || "",
          model: cfg.model || "gemini-2.5-flash",
          provider: cfg.provider || "auto",
          status: "configuring",
          config: {
            ...(cfg.config || {}),
            ...(extra1 ? { toneOfVoice: extra1 } : {}),
          },
        };
        const { data, error } = await supabase
          .from("user_agents")
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        try {
          const flow = buildDefaultFlowForAgent(data as any);
          await supabase.from("user_flows" as any).insert({
            user_id: user.id,
            name: flow.name,
            description: flow.description,
            nodes: flow.nodes,
            edges: flow.edges,
            is_active: false,
            trigger_type: "trigger_chat",
            trigger_config: { agent_id: (data as any).id },
          } as any);
        } catch {}
        toast.success(`Agente "${name.trim()}" criado para ${activeClient.client_name}`);
        onOpenChange(false);
        navigate(`/aikortex/agents/${(data as any).id}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao criar a partir do template.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Usar template: {template.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <span>Adapte para</span>
            <Badge variant="secondary" className="gap-1 font-normal">
              <Building2 className="w-3 h-3" />
              {activeClientName}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Nome {isApp ? "do app" : "do agente"} *</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              placeholder={isApp ? "Nome do app" : "Nome do agente"}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-extra">
              {isApp ? "Descrição curta (opcional)" : "Tom de voz (opcional)"}
            </Label>
            <Textarea
              id="tpl-extra"
              value={extra1}
              onChange={(e) => setExtra1(e.target.value)}
              disabled={submitting}
              rows={2}
              placeholder={isApp ? "Para que serve este app…" : "Profissional e caloroso…"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar {isApp ? "app" : "agente"} →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UseTemplateDialog;
