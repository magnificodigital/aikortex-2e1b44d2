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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
  const { clients } = useWorkspace();
  const { activeClientId, isAllClients } = useActiveClient();

  const [clientId, setClientId] = useState<string>("");
  const [name, setName] = useState("");
  const [extra1, setExtra1] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);
  const isApp = template?.category === "app";

  // Reset form when opens
  useEffect(() => {
    if (!open || !template) return;
    const defaultClient = !isAllClients && activeClientId ? activeClientId : "";
    setClientId(defaultClient);
    const dc = clients.find((c) => c.id === defaultClient);
    setName(dc ? `${template.name} - ${dc.client_name}` : template.name);
    const cfg = (isApp ? template.app_config : template.agent_config) || {};
    setExtra1(isApp ? (cfg.description ?? "") : (cfg.tone_of_voice ?? cfg.toneOfVoice ?? ""));
  }, [open, template, activeClientId, isAllClients, clients, isApp]);

  // Update name when client changes
  useEffect(() => {
    if (!template) return;
    const c = clients.find((x) => x.id === clientId);
    if (c) setName(`${template.name} - ${c.client_name}`);
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const valid = useMemo(() => {
    if (!clientId) return false;
    if (!name || name.trim().length < 3) return false;
    return true;
  }, [clientId, name]);

  if (!template) return null;

  const handleSubmit = async () => {
    if (!valid || !template) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Faça login para continuar.");
        setSubmitting(false);
        return;
      }
      const client = clients.find((c) => c.id === clientId)!;

      if (template.category === "app") {
        const cfg = (template.app_config ?? {}) as Record<string, any>;
        const payload = {
          user_id: user.id,
          client_id: clientId,
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
        // usage_count tracking pulado: agências não têm UPDATE em platform_templates (RLS)
        toast.success(`App "${name.trim()}" criado para ${client.client_name}`);
        onOpenChange(false);
        navigate("/app-builder", { state: { appId: (data as any).id, channel: payload.channel } });
      } else {
        const cfg = (template.agent_config ?? {}) as Record<string, any>;
        const payload: Record<string, any> = {
          user_id: user.id,
          client_id: clientId,
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
        // best-effort default flow
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
        toast.success(`Agente "${name.trim()}" criado para ${client.client_name}`);
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
          <DialogDescription>
            Adapte os campos abaixo para criar {isApp ? "o app" : "o agente"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="client-select">Cliente de destino *</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={submitting}>
              <SelectTrigger id="client-select">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    Nenhum cliente cadastrado.
                  </div>
                ) : clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
