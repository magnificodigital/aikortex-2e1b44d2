/**
 * IntegrationInstagramForm — credenciais do Instagram DM (Meta API).
 *
 * Salva em user_api_keys (mesmo padrao do WhatsApp form):
 *  - instagram_access_token: Page Access Token com instagram_manage_messages
 *  - instagram_account_id:   ID da conta IG Business (webhook entry.id)
 *  - instagram_verify_token: token de verificacao do webhook
 *  - instagram_agent_id:     agente que responde DMs (fallback: o do WhatsApp)
 */
import { useEffect, useState } from "react";
import { Loader2, Save, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { toast } from "sonner";

const PROVIDERS = ["instagram_access_token", "instagram_account_id", "instagram_verify_token", "instagram_agent_id"] as const;

const NONE_AGENT = "__none__";

export default function IntegrationInstagramForm({ onClose }: { onClose: () => void }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const webhookUrl = fnUrl("instagram-webhook");

  useEffect(() => {
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
      setAgents((agentsRes.data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    const token = fields.instagram_access_token?.trim();
    const accountId = fields.instagram_account_id?.trim();
    if (!token || !accountId) {
      toast.error("Access Token e ID da conta são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Não autenticado"); return; }
      const rows = PROVIDERS
        .filter((p) => (fields[p] ?? "").trim() && fields[p] !== NONE_AGENT)
        .map((p) => ({ user_id: user.id, provider: p, api_key: fields[p].trim() }));
      const { error } = await supabase
        .from("user_api_keys")
        .upsert(rows, { onConflict: "user_id,provider" });
      if (error) throw error;
      toast.success("Instagram configurado — aponte o webhook do app Meta pra URL abaixo");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Page Access Token *</Label>
        <Input type="password" value={fields.instagram_access_token ?? ""} onChange={set("instagram_access_token")}
          placeholder="Token da Página com instagram_manage_messages" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">ID da conta Instagram Business *</Label>
        <Input value={fields.instagram_account_id ?? ""} onChange={set("instagram_account_id")}
          placeholder="ex: 17841400000000000" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Verify Token do webhook</Label>
        <Input value={fields.instagram_verify_token ?? ""} onChange={set("instagram_verify_token")}
          placeholder="Crie uma senha qualquer e use a mesma no app Meta" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Agente que responde DMs</Label>
        <Select
          value={fields.instagram_agent_id || NONE_AGENT}
          onValueChange={(v) => setFields((prev) => ({ ...prev, instagram_agent_id: v === NONE_AGENT ? "" : v }))}
        >
          <SelectTrigger><SelectValue placeholder="Usar o mesmo do WhatsApp" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_AGENT}>Usar o mesmo do WhatsApp</SelectItem>
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">URL do webhook (app Meta → Instagram → Webhooks)</Label>
        <div className="flex items-center gap-1.5">
          <code className="flex-1 text-[10px] break-all">{webhookUrl}</code>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
            onClick={() => navigator.clipboard.writeText(webhookUrl).then(() => toast.success("URL copiada"))}>
            <Copy className="w-3 h-3" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Campos: <code>messages</code>. Objeto: Instagram.</p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
