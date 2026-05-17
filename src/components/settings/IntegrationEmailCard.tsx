import { useState, useEffect } from "react";
import { Mail, CheckCircle2, AlertTriangle, ExternalLink, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useEmailIntegrationStatus,
  useSaveEmailIntegration,
  useDisconnectEmailIntegration,
} from "@/hooks/use-email-integration";

const EMAIL_RE = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

export default function IntegrationEmailCard() {
  const { data: status, isLoading } = useEmailIntegrationStatus();
  const save = useSaveEmailIntegration();
  const disconnect = useDisconnectEmailIntegration();

  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (status?.from_email) setFromEmail(status.from_email);
  }, [status?.from_email]);

  const trialRemaining = status?.trial_remaining ?? 0;
  const isConnected = !!status?.connected;
  const showForm = editing || !isConnected;

  const fromTrimmed = fromEmail.trim();
  const fromDomain = fromTrimmed.includes("@") ? fromTrimmed.split("@")[1] : "";
  const fromValid = EMAIL_RE.test(fromTrimmed);

  const onSave = async () => {
    const key = apiKey.trim();
    if (!key) {
      toast.error("Informe sua API Key do Resend");
      return;
    }
    if (!fromValid) {
      toast.error("From inválido — use um endereço completo, ex: contato@send.suaempresa.com");
      return;
    }
    await save.mutateAsync({ api_key: key, from_email: fromTrimmed });
    setApiKey("");
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Email (Resend)</CardTitle>
              <CardDescription className="text-xs mt-1">
                Conecte sua conta Resend para disparar emails ilimitados em cadências.{" "}
                <a
                  href="https://resend.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-0.5 hover:underline"
                >
                  Criar conta grátis (3.000/mês) <ExternalLink className="w-3 h-3" />
                </a>
              </CardDescription>
            </div>
          </div>
          {isConnected ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0">Não conectado</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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

        {isConnected && !editing && (
          <div className="space-y-2 rounded-md border border-border p-3 bg-muted/30">
            <div className="text-xs flex justify-between gap-2">
              <span className="text-muted-foreground">From:</span>
              <span className="font-mono text-foreground">{status?.from_email}</span>
            </div>
            <div className="text-xs flex justify-between gap-2">
              <span className="text-muted-foreground">API Key:</span>
              <span className="font-mono text-foreground">••••{status?.api_key_suffix}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Atualizar</Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Desconectar
              </Button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">API Key (re_...)</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
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
              <Label className="text-xs">From Email</Label>
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
                . Se você verificou um subdomínio (ex.: <code className="px-1 py-px rounded bg-muted/60">send.empresa.com</code>), o From precisa terminar nele — não no domínio root.
              </p>
              {fromTrimmed && !fromValid && (
                <p className="text-[11px] text-destructive">Formato inválido — use um email completo (local@dominio.tld)</p>
              )}
            </div>
            <div className="flex gap-2">
              {editing && (
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setApiKey(""); }}>
                  Cancelar
                </Button>
              )}
              <Button size="sm" onClick={onSave} disabled={save.isPending || !apiKey.trim() || !fromValid}>
                {save.isPending ? "Salvando..." : "Salvar conexão"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
