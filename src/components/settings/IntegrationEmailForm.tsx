import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useEmailIntegrationStatus,
  useSaveEmailIntegration,
  useDisconnectEmailIntegration,
} from "@/hooks/use-email-integration";

const EMAIL_RE = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

interface Props {
  /** Callback chamado após salvar/desconectar com sucesso (geralmente fecha o dialog). */
  onClose?: () => void;
}

/**
 * Conteúdo do formulário de integração com Resend (Email).
 * Renderizado dentro de um Dialog em OutboundChannelsBlock.
 * Não inclui Card wrapper nem header — esses são responsabilidade do dialog pai.
 */
export default function IntegrationEmailForm({ onClose }: Props) {
  const { data: status, isLoading } = useEmailIntegrationStatus();
  const save = useSaveEmailIntegration();
  const disconnect = useDisconnectEmailIntegration();

  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (status?.from_email) setFromEmail(status.from_email);
    if (status?.from_name) setFromName(status.from_name);
    if (status?.reply_to) setReplyTo(status.reply_to);
  }, [status?.from_email, status?.from_name, status?.reply_to]);

  const trialRemaining = status?.trial_remaining ?? 0;
  const isConnected = !!status?.connected;

  const fromTrimmed = fromEmail.trim();
  const fromDomain = fromTrimmed.includes("@") ? fromTrimmed.split("@")[1] : "";
  const fromValid = EMAIL_RE.test(fromTrimmed);
  const replyTrimmed = replyTo.trim();
  const replyValid = !replyTrimmed || EMAIL_RE.test(replyTrimmed);

  const onSave = async () => {
    const key = apiKey.trim();
    if (!key && !isConnected) {
      toast.error("Informe sua Chave da API do Resend");
      return;
    }
    if (!fromValid) {
      toast.error("Email do remetente inválido — use um endereço completo");
      return;
    }
    if (!replyValid) {
      toast.error("Responder para inválido — deixe vazio ou use um email completo");
      return;
    }
    await save.mutateAsync({
      // Se está editando e não trocou a key, mantém a atual no banco (não envia campo vazio)
      api_key: key || (status as any)?.api_key_full || "",
      from_email: fromTrimmed,
      from_name: fromName.trim() || null,
      reply_to: replyTrimmed || null,
    });
    setApiKey("");
    onClose?.();
  };

  const onDisconnect = async () => {
    await disconnect.mutateAsync();
    onClose?.();
  };

  return (
    <div className="space-y-4">
      {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}

      {!isConnected && trialRemaining > 0 && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 flex gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-blue-700 dark:text-blue-300">Trial ativo</p>
            <p className="text-blue-700/80 dark:text-blue-300/80">
              Você tem <strong>{trialRemaining}</strong> emails gratuitos restantes (cortesia Aikortex).
              Após esgotar, conecte sua chave Resend para continuar.
            </p>
          </div>
        </div>
      )}

      {!isConnected && trialRemaining === 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-amber-700 dark:text-amber-300">Trial esgotado</p>
            <p className="text-amber-700/80 dark:text-amber-300/80">
              Seus 100 emails gratuitos foram usados. Conecte sua chave Resend abaixo para continuar.
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Conecte sua conta Resend para disparar emails ilimitados em cadências.{" "}
        <a
          href="https://resend.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-0.5 hover:underline"
        >
          Criar conta grátis (3.000/mês) <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      <div className="space-y-1">
        <Label className="text-xs">Chave da API (re_...)</Label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isConnected ? `Atual: ••••${status?.api_key_suffix} — deixe vazio para manter` : "re_xxxxxxxxxxxxxxxxxxxxxxxx"}
            className="font-mono text-xs pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Email do remetente</Label>
        <Input
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="contato@send.suaempresa.com.br"
          className="text-xs"
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          O domínio depois do <code className="px-1 py-px rounded bg-muted/60">@</code>{" "}
          {fromDomain ? <strong className="text-foreground">({fromDomain})</strong> : ""} precisa estar{" "}
          <a
            href="https://resend.com/domains"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            verified na sua conta Resend <ExternalLink className="w-3 h-3" />
          </a>
          . Se você verificou um subdomínio (ex.: <code className="px-1 py-px rounded bg-muted/60">send.empresa.com</code>), o email precisa terminar nele — não no domínio root.
        </p>
        {fromTrimmed && !fromValid && (
          <p className="text-[11px] text-destructive">Formato inválido — use um email completo (local@dominio.tld)</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
        <div className="space-y-1">
          <Label className="text-xs">Nome do remetente</Label>
          <Input
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Ex: Clínica São Paulo"
            maxLength={60}
            className="text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Aparece como "<strong>{fromName.trim() || "Nome"}</strong> &lt;{fromTrimmed || "email@..."}&gt;" no inbox.
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Responder para (opcional)</Label>
          <Input
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="atendimento@suaempresa.com"
            className="text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Se preenchido, respostas vão pra esse endereço em vez do "from".
          </p>
          {replyTrimmed && !replyValid && (
            <p className="text-[11px] text-destructive">Formato inválido</p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-border">
        {isConnected ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDisconnect}
            disabled={disconnect.isPending}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Desconectar
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={onSave} disabled={save.isPending || !fromValid || !replyValid || (!isConnected && !apiKey.trim())}>
            {save.isPending ? "Salvando..." : isConnected ? "Salvar alterações" : "Conectar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
