/**
 * IntegrationInstagramForm — conexao do Instagram DM.
 *
 * CAMINHO PRINCIPAL (1-clique): "Conectar com Facebook" → popup Meta →
 * agencia autoriza → edge instagram-embedded-signup resolve token,
 * conta IG e webhook sozinha. Se o user tiver varias Paginas, aparece
 * um seletor. Zero cola de token.
 *
 * CAMINHO AVANCADO (collapse): campos manuais pra quem precisa
 * (token/IDs) — mesmo destino em user_api_keys.
 */
import { useEffect, useState } from "react";
import { Loader2, Save, Copy, Camera, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { loadFacebookSdk } from "./MetaEmbeddedSignupButton";
import { toast } from "sonner";

const PROVIDERS = ["instagram_access_token", "instagram_account_id", "instagram_verify_token", "instagram_agent_id"] as const;
const NONE_AGENT = "__none__";
const META_IG_CONFIG_ID = import.meta.env.VITE_META_IG_CONFIG_ID || "";
// Fallback sem config_id: login classico por escopos.
const IG_SCOPES = "instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata,business_management";

export default function IntegrationInstagramForm({ onClose }: { onClose: () => void }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [connectedAs, setConnectedAs] = useState<string | null>(null);
  const [pagesToPick, setPagesToPick] = useState<{ id: string; name: string; ig_username: string | null }[] | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const webhookUrl = fnUrl("instagram-webhook");

  useEffect(() => {
    loadFacebookSdk().then(() => setSdkReady(true)).catch(() => {
      // SDK bloqueado (adblock etc) — caminho manual continua disponivel
    });
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [keysRes, agentsRes] = await Promise.all([
        supabase.from("user_api_keys").select("provider, api_key")
          .eq("user_id", user.id).in("provider", [...PROVIDERS]),
        supabase.from("user_agents").select("id, name").eq("user_id", user.id).order("name"),
      ]);
      const map: Record<string, string> = {};
      (keysRes.data ?? []).forEach((r: any) => { map[r.provider] = r.api_key ?? ""; });
      setFields(map);
      if (map.instagram_account_id) setConnectedAs(map.instagram_account_id);
      setAgents((agentsRes.data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  /** POSTa pro embedded-signup ({code} ou {page_id}) e trata o retorno. */
  async function completeSignup(body: { code?: string; page_id?: string }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); return; }
    const resp = await fetch(fnUrl("instagram-embedded-signup"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      toast.error(j?.message || "Falha na conexão com o Instagram");
      return;
    }
    if (j.needs_selection) {
      setPagesToPick(j.pages ?? []);
      return;
    }
    if (j.connected) {
      setPagesToPick(null);
      setConnectedAs(j.ig_username ? `@${j.ig_username}` : "conectado");
      toast.success(`Instagram conectado${j.ig_username ? `: @${j.ig_username}` : ""} — DMs já caem no inbox`);
    }
  }

  function handleConnect() {
    if (!window.FB) { toast.error("SDK do Facebook não carregou — use o modo manual abaixo"); return; }
    setConnecting(true);
    const loginOpts: any = META_IG_CONFIG_ID
      ? { config_id: META_IG_CONFIG_ID, response_type: "code", override_default_response_type: true }
      : { scope: IG_SCOPES, response_type: "code", override_default_response_type: true };

    window.FB.login(async (response: any) => {
      try {
        if (response?.authResponse?.code) {
          await completeSignup({ code: response.authResponse.code });
        } else if (response?.error) {
          toast.error(`Meta: ${response.error.message ?? "erro desconhecido"}`);
        }
      } finally {
        setConnecting(false);
      }
    }, loginOpts);
  }

  async function handleManualSave() {
    const token = fields.instagram_access_token?.trim();
    const accountId = fields.instagram_account_id?.trim();
    if (!token || !accountId) { toast.error("Access Token e ID da conta são obrigatórios"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Não autenticado"); return; }
      const rows = PROVIDERS
        .filter((p) => (fields[p] ?? "").trim() && fields[p] !== NONE_AGENT)
        .map((p) => ({ user_id: user.id, provider: p, api_key: fields[p].trim() }));
      const { error } = await supabase.from("user_api_keys").upsert(rows, { onConflict: "user_id,provider" });
      if (error) throw error;
      setConnectedAs(accountId);
      toast.success("Instagram configurado");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAgent(agentId: string) {
    setFields((prev) => ({ ...prev, instagram_agent_id: agentId === NONE_AGENT ? "" : agentId }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (agentId === NONE_AGENT) {
      await supabase.from("user_api_keys").delete()
        .eq("user_id", user.id).eq("provider", "instagram_agent_id");
    } else {
      await supabase.from("user_api_keys").upsert(
        { user_id: user.id, provider: "instagram_agent_id", api_key: agentId },
        { onConflict: "user_id,provider" },
      );
    }
    toast.success("Agente das DMs atualizado");
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      {/* ── Caminho 1-clique ── */}
      {connectedAs ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-foreground">
            Instagram conectado: <span className="font-semibold">{connectedAs}</span>
          </p>
        </div>
      ) : (
        <Button
          className="w-full gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-700 hover:to-orange-600 text-white"
          onClick={handleConnect}
          disabled={!sdkReady || connecting}
        >
          {connecting
            ? (<><Loader2 className="w-4 h-4 animate-spin" /> Conectando…</>)
            : (<><Camera className="w-4 h-4" /> Conectar com Facebook</>)}
        </Button>
      )}
      <p className="text-[11px] text-muted-foreground text-center">
        Faça login e autorize — a gente resolve token, conta e webhook automaticamente.
      </p>

      {/* Seletor quando o user tem varias Paginas com IG */}
      {pagesToPick && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <Label className="text-xs">Qual conta Instagram usar?</Label>
          {pagesToPick.map((p) => (
            <button
              key={p.id}
              onClick={() => completeSignup({ page_id: p.id })}
              className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition"
            >
              <span className="font-medium">{p.ig_username ? `@${p.ig_username}` : p.name}</span>
              <span className="text-muted-foreground"> — Página {p.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Agente que responde as DMs */}
      <div className="space-y-1.5">
        <Label className="text-xs">Agente que responde DMs</Label>
        <Select
          value={fields.instagram_agent_id || NONE_AGENT}
          onValueChange={handleSaveAgent}
        >
          <SelectTrigger><SelectValue placeholder="Usar o mesmo do WhatsApp" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_AGENT}>Usar o mesmo do WhatsApp</SelectItem>
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Avancado: manual ── */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition">
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            Configuração manual (avançado)
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Page Access Token</Label>
            <Input type="password" value={fields.instagram_access_token ?? ""} onChange={set("instagram_access_token")}
              placeholder="Token da Página com instagram_manage_messages" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ID da conta Instagram Business</Label>
            <Input value={fields.instagram_account_id ?? ""} onChange={set("instagram_account_id")}
              placeholder="ex: 17841400000000000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Verify Token do webhook</Label>
            <Input value={fields.instagram_verify_token ?? ""} onChange={set("instagram_verify_token")}
              placeholder="Só necessário na configuração manual do webhook" />
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">URL do webhook</Label>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 text-[10px] break-all">{webhookUrl}</code>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                onClick={() => navigator.clipboard.writeText(webhookUrl).then(() => toast.success("URL copiada"))}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={handleManualSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar manual
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}
