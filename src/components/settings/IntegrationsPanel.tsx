import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Eye, EyeOff, ExternalLink, Blocks, Plus, Trash2, Webhook, Globe, Bot } from "lucide-react";
import { toast } from "sonner";
import { IntegrationsGrid, ALL_PROVIDERS } from "@/components/shared/IntegrationsGrid";

export const IntegrationsPanel = () => {
  return (
    <div className="space-y-8">
      <IntegrationsGrid />

      {/* MCPs */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Blocks className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">MCPs</h3>
        </div>
        <p className="text-xs text-muted-foreground">Conecte servidores MCP para estender o contexto.</p>
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <Plus className="w-3 h-3" /> Adicionar MCP
        </Button>
      </div>

      {/* Webhooks */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Webhooks</h3>
        </div>
        <p className="text-xs text-muted-foreground">Configure webhooks para receber e enviar eventos em tempo real.</p>
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <Plus className="w-3 h-3" /> Adicionar Webhook
        </Button>
      </div>
    </div>
  );
};

const WABA_FIELDS = [
  { key: "whatsapp_access_token", label: "Access Token", placeholder: "Token permanente do System User", help: "Encontre em Meta Business Suite → Configurações → Usuários do sistema" },
  { key: "whatsapp_phone_number_id", label: "Phone Number ID", placeholder: "Ex: 123456789012345", help: "ID do número registrado no WABA" },
  { key: "whatsapp_business_account_id", label: "Business Account ID", placeholder: "Ex: 987654321098765", help: "ID da conta WhatsApp Business (WABA)" },
  { key: "whatsapp_verify_token", label: "Verify Token", placeholder: "Token personalizado para webhook", help: "Qualquer string que você escolher para verificação do webhook" },
];

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp", logo: "https://cdn.simpleicons.org/whatsapp" },
  { value: "instagram", label: "Instagram", logo: "https://cdn.simpleicons.org/instagram" },
  { value: "facebook", label: "Facebook", logo: "https://cdn.simpleicons.org/facebook" },
  { value: "linkedin", label: "LinkedIn", logo: "https://cdn.simpleicons.org/linkedin" },
  { value: "tiktok", label: "TikTok", logo: "https://cdn.simpleicons.org/tiktok" },
  { value: "website", label: "WebSite", logo: "" },
];

export const ChannelsPanel = () => {
  const [connectedChannels, setConnectedChannels] = useState<string[]>([]);
  const [wabaDialog, setWabaDialog] = useState(false);
  const [wabaFields, setWabaFields] = useState<Record<string, string>>({});
  const [wabaConnected, setWabaConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [userAgents, setUserAgents] = useState<{ id: string; name: string }[]>([]);
  const [selectedWhatsAppAgent, setSelectedWhatsAppAgent] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load WABA credentials
      const { data } = await supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id);
      if (data) {
        const fields: Record<string, string> = {};
        let hasToken = false;
        data.forEach((row: any) => {
          if (WABA_FIELDS.some(f => f.key === row.provider)) {
            fields[row.provider] = row.api_key;
            if (row.provider === "whatsapp_access_token") hasToken = true;
          }
          if (row.provider === "whatsapp_agent_id") {
            setSelectedWhatsAppAgent(row.api_key);
          }
        });
        setWabaFields(fields);
        setWabaConnected(hasToken);
        if (hasToken) setConnectedChannels(prev => prev.includes("whatsapp") ? prev : [...prev, "whatsapp"]);
      }

      // Load user agents
      const { data: agents } = await supabase
        .from("user_agents")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");
      if (agents) setUserAgents(agents);
    };
    loadData();
  }, []);

  const handleSaveWaba = async () => {
    const token = wabaFields.whatsapp_access_token?.trim();
    const phoneId = wabaFields.whatsapp_phone_number_id?.trim();
    if (!token || !phoneId) {
      toast.error("Access Token e Phone Number ID são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login primeiro."); return; }
      for (const field of WABA_FIELDS) {
        const val = wabaFields[field.key]?.trim();
        if (val) {
          await supabase.from("user_api_keys").upsert(
            { user_id: user.id, provider: field.key, api_key: val },
            { onConflict: "user_id,provider" }
          );
        }
      }
      setWabaConnected(true);
      setConnectedChannels(prev => prev.includes("whatsapp") ? prev : [...prev, "whatsapp"]);
      setWabaDialog(false);
      toast.success("WhatsApp Business conectado com sucesso!");
    } finally { setSaving(false); }
  };

  const handleDisconnectWaba = async () => {
    setSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      for (const field of WABA_FIELDS) {
        await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", field.key);
      }
      setWabaFields({});
      setWabaConnected(false);
      setConnectedChannels(prev => prev.filter(c => c !== "whatsapp"));
      setWabaDialog(false);
      toast.success("WhatsApp Business desconectado.");
    } finally { setSaving(false); }
  };

  const toggleChannel = (value: string) => {
    if (value === "whatsapp") {
      setWabaDialog(true);
      return;
    }
    setConnectedChannels(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
    const ch = CHANNELS.find(c => c.value === value);
    if (ch) {
      const wasConnected = connectedChannels.includes(value);
      toast.success(wasConnected ? `${ch.label} desconectado` : `${ch.label} conectado`);
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Canais de Comunicação</h3>
          <p className="text-xs text-muted-foreground mt-1">Configure onde seus agentes e automações vão operar.</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {connectedChannels.length} conectados
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHANNELS.map((ch) => {
          const isSelected = ch.value === "whatsapp" ? wabaConnected : connectedChannels.includes(ch.value);
          return (
            <div
              key={ch.value}
              className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"
              }`}
            >
              {ch.logo ? (
                <img src={ch.logo} alt={ch.label} className="w-8 h-8 rounded-lg object-contain shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <Globe className="w-8 h-8 text-primary shrink-0" />
              )}
              <span className="text-sm font-semibold text-foreground flex-1">{ch.label}</span>
              <Button size="sm" variant={isSelected ? "default" : "outline"}
                onClick={() => toggleChannel(ch.value)} className="shrink-0 text-xs h-8 gap-1.5">
                {isSelected ? (<><Check className="w-3 h-3" /> {ch.value === "whatsapp" ? "Gerenciar" : "Conectado"}</>) : "Conectar"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* WhatsApp WABA Dialog */}
      <Dialog open={wabaDialog} onOpenChange={setWabaDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <img src="https://cdn.simpleicons.org/whatsapp" alt="WhatsApp" className="w-8 h-8" />
              <div>
                <DialogTitle className="text-base">
                  {wabaConnected ? "Gerenciar" : "Conectar"} WhatsApp Business
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Conecte sua conta WABA (WhatsApp Business API) para enviar e receber mensagens.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {WABA_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{field.label}</label>
                <div className="relative">
                  <Input
                    type={showFields[field.key] ? "text" : "password"}
                    value={wabaFields[field.key] || ""}
                    onChange={(e) => setWabaFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="pr-10 text-sm font-mono"
                  />
                  <button type="button" onClick={() => setShowFields(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showFields[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">{field.help}</p>
              </div>
            ))}

            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-sm font-medium text-foreground">Webhook URL</label>
              <div className="flex items-center gap-2">
                <Input value={webhookUrl} readOnly className="text-xs font-mono bg-muted" />
                <Button variant="outline" size="sm" className="shrink-0 text-xs"
                  onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada!"); }}>
                  Copiar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cole esta URL nas configurações do webhook no{" "}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5">
                  Meta for Developers <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            {/* WhatsApp Agent Selector */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium text-foreground">Agente padrão para WhatsApp</label>
              </div>
              <Select
                value={selectedWhatsAppAgent}
                onValueChange={async (value) => {
                  setSelectedWhatsAppAgent(value);
                  const { supabase } = await import("@/integrations/supabase/client");
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  if (value === "none") {
                    await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", "whatsapp_agent_id");
                    setSelectedWhatsAppAgent("");
                    toast.success("Agente WhatsApp removido.");
                  } else {
                    await supabase.from("user_api_keys").upsert(
                      { user_id: user.id, provider: "whatsapp_agent_id", api_key: value },
                      { onConflict: "user_id,provider" }
                    );
                    toast.success("Agente WhatsApp configurado!");
                  }
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Nenhum agente selecionado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (desativar respostas automáticas)</SelectItem>
                  {userAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                O agente selecionado responderá automaticamente às mensagens recebidas no WhatsApp.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              {wabaConnected ? (
                <Button variant="destructive" size="sm" className="text-xs gap-1.5" onClick={handleDisconnectWaba} disabled={saving}>
                  <Trash2 className="w-3 h-3" /> Desconectar
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setWabaDialog(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveWaba} disabled={saving || !wabaFields.whatsapp_access_token?.trim() || !wabaFields.whatsapp_phone_number_id?.trim()}>
                  {wabaConnected ? "Atualizar" : "Conectar"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
