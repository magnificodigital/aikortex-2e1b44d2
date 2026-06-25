import { useState, useEffect } from "react";
import { CheckCircle2, ExternalLink, Eye, EyeOff, Phone, Mic, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useVoiceIntegrationStatus,
  useSaveVoiceKeys,
  useDisconnectVoiceProvider,
} from "@/hooks/use-voice-integration";

interface Props {
  onClose?: () => void;
}

/**
 * Form do canal Voz — composto por 2 provedores:
 *   - Telnyx: telefonia (chamadas inbound/outbound via número real)
 *   - ElevenLabs: síntese de voz (TTS)
 *
 * Ambos compartilham o canal "Voz" no AgencyChannelsManager.
 * Cada um pode ser conectado/desconectado independentemente.
 * Dados gravados em user_api_keys (mesma tabela que IntegrationsGrid usa).
 */
export default function IntegrationVoiceForm({ onClose }: Props) {
  const { data: status, isLoading } = useVoiceIntegrationStatus();
  const save = useSaveVoiceKeys();
  const disconnect = useDisconnectVoiceProvider();

  const [telnyxKey, setTelnyxKey] = useState("");
  const [telnyxPublicKey, setTelnyxPublicKey] = useState("");
  const [elevenKey, setElevenKey] = useState("");
  const [agentId, setAgentId] = useState("");
  const [showTelnyx, setShowTelnyx] = useState(false);
  const [showTelnyxPub, setShowTelnyxPub] = useState(false);
  const [showEleven, setShowEleven] = useState(false);

  // Pré-carrega indicação de chaves existentes (não exibe a key em si).
  useEffect(() => {
    setTelnyxKey("");
    setTelnyxPublicKey("");
    setElevenKey("");
    setAgentId(status?.elevenlabs_agent_id ?? "");
  }, [status?.telnyx_connected, status?.elevenlabs_connected, status?.elevenlabs_agent_id]);

  const onSave = async () => {
    const telnyx = telnyxKey.trim();
    const telnyxPub = telnyxPublicKey.trim();
    const eleven = elevenKey.trim();
    const agent = agentId.trim();

    if (!telnyx && !telnyxPub && !eleven && !agent) {
      toast.error("Informe pelo menos um campo para salvar");
      return;
    }

    await save.mutateAsync({
      telnyx_api_key: telnyx || undefined,
      telnyx_public_key: telnyxPub || undefined,
      elevenlabs_api_key: eleven || undefined,
      elevenlabs_agent_id: agent || undefined,
    });
    setTelnyxKey("");
    setTelnyxPublicKey("");
    setElevenKey("");
  };

  const onTestEleven = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("voice-resources", {
        body: { provider: "elevenlabs", action: "test" },
      });
      if (error) throw error;
      if ((data as any)?.ok) toast.success("ElevenLabs validada — chave funcionando");
      else toast.error((data as any)?.message ?? "Falhou");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const onTestTelnyx = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("voice-resources", {
        body: { provider: "telnyx", action: "test" },
      });
      if (error) throw error;
      const d = data as { ok: boolean; balance?: string; currency?: string; message?: string };
      if (d?.ok) {
        toast.success(`Telnyx validada — saldo ${d.balance ?? "?"} ${d.currency ?? ""}`);
      } else {
        toast.error(d?.message ?? "Telnyx falhou");
      }
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}

      <p className="text-xs text-muted-foreground">
        O canal Voz é composto por <strong>dois provedores</strong>: Telnyx para telefonia (chamadas reais)
        e ElevenLabs para síntese de voz. Você pode conectar um, outro ou ambos.
      </p>

      {/* Telnyx */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Telnyx</p>
              <p className="text-[11px] text-muted-foreground">Telefonia (números reais, inbound + outbound)</p>
            </div>
          </div>
          {status?.telnyx_connected ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 shrink-0 text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 text-[10px]">Não conectado</Badge>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">API Key</Label>
          <div className="relative">
            <Input
              type={showTelnyx ? "text" : "password"}
              value={telnyxKey}
              onChange={(e) => setTelnyxKey(e.target.value)}
              placeholder={status?.telnyx_connected ? `Atual: ••••${status.telnyx_suffix} — deixe vazio para manter` : "KEY01234567..."}
              className="font-mono text-xs pr-10 h-8"
            />
            <button
              type="button"
              onClick={() => setShowTelnyx((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showTelnyx ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Public Key (necessária para webhooks)</Label>
          <div className="relative">
            <Input
              type={showTelnyxPub ? "text" : "password"}
              value={telnyxPublicKey}
              onChange={(e) => setTelnyxPublicKey(e.target.value)}
              placeholder={status?.telnyx_public_connected ? "Configurada (deixe vazio para manter)" : "Cole a Telnyx Public Key"}
              className="font-mono text-xs pr-10 h-8"
            />
            <button
              type="button"
              onClick={() => setShowTelnyxPub((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showTelnyxPub ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <a
            href="https://portal.telnyx.com/#/app/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
          >
            portal.telnyx.com <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex gap-1">
            {status?.telnyx_connected && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={onTestTelnyx}
                >
                  Testar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] text-destructive hover:text-destructive"
                  onClick={() => disconnect.mutate("telnyx")}
                  disabled={disconnect.isPending}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Desconectar
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ElevenLabs */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center">
              <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">ElevenLabs</p>
              <p className="text-[11px] text-muted-foreground">Síntese de voz (TTS) e clonagem</p>
            </div>
          </div>
          {status?.elevenlabs_connected ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 shrink-0 text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 text-[10px]">Não conectado</Badge>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">API Key</Label>
          <div className="relative">
            <Input
              type={showEleven ? "text" : "password"}
              value={elevenKey}
              onChange={(e) => setElevenKey(e.target.value)}
              placeholder={status?.elevenlabs_connected ? `Atual: ••••${status.elevenlabs_suffix} — deixe vazio para manter` : "sk_..."}
              className="font-mono text-xs pr-10 h-8"
            />
            <button
              type="button"
              onClick={() => setShowEleven((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showEleven ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <a
            href="https://elevenlabs.io/settings/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
          >
            elevenlabs.io <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex gap-1">
            {status?.elevenlabs_connected && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={onTestEleven}
                >
                  Testar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] text-destructive hover:text-destructive"
                  onClick={() => disconnect.mutate("elevenlabs")}
                  disabled={disconnect.isPending}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Desconectar
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
        <Button size="sm" onClick={onSave} disabled={save.isPending || (!telnyxKey.trim() && !telnyxPublicKey.trim() && !elevenKey.trim())}>
          {save.isPending ? "Salvando..." : "Salvar chaves"}
        </Button>
      </div>
    </div>
  );
}
