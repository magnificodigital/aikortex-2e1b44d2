import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Copy, ExternalLink, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";

interface Props {
  onClose?: () => void;
}

const WABA_FIELDS = [
  {
    key: "whatsapp_access_token",
    label: "System User Access Token",
    placeholder: "EAAxxx... (token permanente)",
    help: "Meta Business Suite → Configurações de negócios → Usuários do sistema → gerar token",
  },
  {
    key: "whatsapp_phone_number_id",
    label: "Phone Number ID",
    placeholder: "Ex: 123456789012345",
    help: "ID do número WABA (não é o número de telefone em si)",
  },
  {
    key: "whatsapp_business_account_id",
    label: "Business Account ID (WABA ID)",
    placeholder: "Ex: 987654321098765",
    help: "ID da conta WhatsApp Business — necessário para listar templates",
  },
  {
    key: "whatsapp_verify_token",
    label: "Verify Token (webhook)",
    placeholder: "string aleatória escolhida por você",
    help: "Você define essa string e cola no Meta Developers → Webhook → Verificação",
  },
] as const;

/**
 * Form WABA reusado dentro do dialog do canal WhatsApp no OutboundChannelsBlock.
 * Lê/grava campos diretamente em user_api_keys (padrão A: BYOK).
 */
export default function IntegrationWhatsAppForm({ onClose }: Props) {
  const qc = useQueryClient();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const webhookUrl = fnUrl("whatsapp-webhook");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: keys } = await supabase
        .from("user_api_keys")
        .select("provider, api_key")
        .eq("user_id", user.id)
        .in("provider", [
          ...WABA_FIELDS.map((f) => f.key),
          "whatsapp_agent_id",
        ]);
      const fieldMap: Record<string, string> = {};
      let agentId = "";
      (keys ?? []).forEach((row: any) => {
        if (row.provider === "whatsapp_agent_id") agentId = row.api_key ?? "";
        else fieldMap[row.provider] = row.api_key ?? "";
      });
      setFields(fieldMap);
      setSelectedAgent(agentId);

      const { data: ag } = await supabase
        .from("user_agents")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");
      setAgents(ag ?? []);
      setLoading(false);
    })();
  }, []);

  const isConfigured = (key: string) => (fields[key] ?? "").trim().length > 0;

  const onSave = async () => {
    const token = fields.whatsapp_access_token?.trim();
    const phoneId = fields.whatsapp_phone_number_id?.trim();
    if (!token || !phoneId) {
      toast.error("Access Token e Phone Number ID são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Não autenticado"); return; }
      for (const f of WABA_FIELDS) {
        const val = fields[f.key]?.trim();
        if (val) {
          await supabase
            .from("user_api_keys")
            .upsert({ user_id: user.id, provider: f.key, api_key: val }, { onConflict: "user_id,provider" });
        }
      }
      qc.invalidateQueries({ queryKey: ["whatsapp-integration-status"] });
      toast.success("WhatsApp Business conectado");
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const onDisconnect = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const providers = [
        ...WABA_FIELDS.map((f) => f.key),
        "whatsapp_agent_id",
      ];
      await supabase.from("user_api_keys").delete().eq("user_id", user.id).in("provider", providers);
      setFields({});
      setSelectedAgent("");
      qc.invalidateQueries({ queryKey: ["whatsapp-integration-status"] });
      toast.success("WhatsApp Business desconectado");
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const onAgentChange = async (value: string) => {
    setSelectedAgent(value);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (value === "none") {
      await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", "whatsapp_agent_id");
      setSelectedAgent("");
      toast.success("Agente WhatsApp removido");
    } else {
      await supabase.from("user_api_keys").upsert(
        { user_id: user.id, provider: "whatsapp_agent_id", api_key: value },
        { onConflict: "user_id,provider" }
      );
      toast.success("Agente WhatsApp configurado");
    }
  };

  const isAnyConfigured = WABA_FIELDS.some((f) => isConfigured(f.key));

  return (
    <div className="space-y-4">
      {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}

      <p className="text-xs text-muted-foreground leading-relaxed">
        Conecte sua conta WhatsApp Business API (Meta Cloud API) para enviar mensagens via cadências
        e receber respostas. Para uso fora da janela de 24h, é obrigatório usar templates aprovados pela Meta.{" "}
        <a
          href="https://developers.facebook.com/docs/whatsapp/cloud-api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Documentação Meta <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      {WABA_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">{f.label}</Label>
            {isConfigured(f.key) && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] h-4 gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> ok
              </Badge>
            )}
          </div>
          <div className="relative">
            <Input
              type={show[f.key] ? "text" : "password"}
              value={fields[f.key] ?? ""}
              onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="pr-10 text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => setShow((s) => ({ ...s, [f.key]: !s[f.key] }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {show[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">{f.help}</p>
        </div>
      ))}

      {/* Webhook URL */}
      <div className="space-y-1 pt-2 border-t border-border">
        <Label className="text-xs">Webhook URL</Label>
        <div className="flex items-center gap-2">
          <Input value={webhookUrl} readOnly className="text-xs font-mono bg-muted" />
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-xs gap-1.5"
            onClick={() => {
              navigator.clipboard.writeText(webhookUrl);
              toast.success("URL copiada");
            }}
          >
            <Copy className="w-3 h-3" /> Copiar
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Cole essa URL em <strong>Meta for Developers → WhatsApp → Configuração → Webhook</strong>,
          usando o Verify Token acima.
        </p>
      </div>

      {/* Agente padrão (opcional, p/ auto-reply) */}
      <div className="space-y-1 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-primary" />
          <Label className="text-xs">Agente padrão para WhatsApp (opcional)</Label>
        </div>
        <Select value={selectedAgent} onValueChange={onAgentChange}>
          <SelectTrigger className="text-xs h-9">
            <SelectValue placeholder="Nenhum agente selecionado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum (desativar auto-resposta)</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          Agente que vai responder automaticamente mensagens recebidas no WhatsApp.
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        {isAnyConfigured ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDisconnect}
            disabled={saving}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Desconectar
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving || !fields.whatsapp_access_token?.trim() || !fields.whatsapp_phone_number_id?.trim()}
          >
            {saving ? "Salvando..." : "Salvar conexão"}
          </Button>
        </div>
      </div>
    </div>
  );
}
