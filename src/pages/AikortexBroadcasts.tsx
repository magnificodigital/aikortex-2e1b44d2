import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import { Send, Plus, Users, Sparkles, AlertTriangle, Activity, Clock, CheckCircle2, XCircle, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMonthlyUsage } from "@/hooks/use-monthly-usage";
import { useUserAgents } from "@/hooks/use-user-agents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const MSGS_PER_AI_CONTACT = 2;

const AikortexBroadcasts = () => {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState("Olá {{name}}, ");
  const [contactsText, setContactsText] = useState("");
  const [broadcastName, setBroadcastName] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { messageCount, monthlyLimit, isAtLimit, hasByok, isUnlimited, isLoading: usageLoading } = useMonthlyUsage();
  const { agents } = useUserAgents();

  // Broadcast logs history
  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["broadcast-logs", user?.id],
    enabled: !!user?.id,
    refetchInterval: activeBroadcastId ? 3000 : false,
    queryFn: async () => {
      const { data } = await supabase
        .from("broadcast_logs")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Track active broadcast progress
  const activeBroadcast = logs.find((l: any) => l.id === activeBroadcastId);
  
  useEffect(() => {
    if (activeBroadcast && activeBroadcast.status !== "running") {
      setActiveBroadcastId(null);
    }
  }, [activeBroadcast]);

  const parsedContacts = contactsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return { phone: parts[0], name: parts[1] || parts[0] };
    });

  const contactCount = parsedContacts.length;
  const estimatedMessages = useAI ? contactCount * MSGS_PER_AI_CONTACT : contactCount;
  const remainingMessages = isUnlimited || hasByok ? Infinity : monthlyLimit - messageCount;
  const hasEnoughCapacity = hasByok || isUnlimited || remainingMessages >= estimatedMessages;

  const handlePreview = async () => {
    if (!parsedContacts.length || !selectedAgent) return;
    setPreviewLoading(true);
    setPreviewMsg(null);
    try {
      const exampleContact = parsedContacts[0];
      const interpolated = template.replace(/\{\{(\w+)\}\}/g, (_, key) => String((exampleContact as any)[key] ?? ""));
      const resp = await supabase.functions.invoke("managed-session-chat", {
        body: {
          agent_db_id: selectedAgent,
          message: `Personalize esta mensagem para ${exampleContact.name || exampleContact.phone}: ${interpolated}. Responda APENAS com a mensagem personalizada, sem explicações.`,
          contact_identifier: `preview_${Date.now()}`,
          channel: "whatsapp",
        },
      });
      setPreviewMsg(resp.data?.reply || "Não foi possível gerar preview");
    } catch {
      setPreviewMsg("Erro ao gerar preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!contactCount || !template.trim()) return;

    setSending(true);
    try {
      const resp = await supabase.functions.invoke("batch-broadcast", {
        body: {
          contacts: parsedContacts,
          message_template: template,
          use_ai: useAI,
          agent_db_id: useAI ? selectedAgent : undefined,
          broadcast_name: broadcastName || undefined,
        },
      });

      if (resp.error) throw new Error(resp.error.message);

      const result = resp.data;
      setActiveBroadcastId(result.broadcast_id);
      toast.success(`Disparo iniciado: ${result.total} contatos em processamento`);
      setDialogOpen(false);
      setContactsText("");
      setBroadcastName("");
      setPreviewMsg(null);
      refetchLogs();
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar disparo");
    } finally {
      setSending(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "running": return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />;
      case "completed": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      default: return null;
    }
  };

  const lastCompleted = logs.find((l: any) => l.status === "completed");

  return (
    <ModuleGate moduleKey="aikortex.disparos">
      <DashboardLayout>
        <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Disparos</h1>
                <p className="text-xs text-muted-foreground">Envios em massa para leads e clientes</p>
              </div>
            </div>
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Novo Disparo
            </Button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Disparos realizados", value: String(logs.length), icon: Send },
              { label: "Total enviados", value: String(logs.reduce((a: number, l: any) => a + (l.sent || 0), 0)), icon: Users },
              { label: "Uso mensal", value: usageLoading ? "..." : isUnlimited ? "∞" : `${messageCount}/${monthlyLimit}`, icon: Activity },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <m.icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{m.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Active broadcast progress */}
          {activeBroadcast && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-foreground">Disparo em andamento</span>
                <Badge variant="secondary">{activeBroadcast.sent}/{activeBroadcast.total_contacts}</Badge>
              </div>
              <Progress value={(activeBroadcast.sent / Math.max(activeBroadcast.total_contacts, 1)) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {activeBroadcast.sent} enviados · {activeBroadcast.failed} falhas · {activeBroadcast.total_contacts - activeBroadcast.sent - activeBroadcast.failed} pendentes
              </p>
            </div>
          )}

          {/* History table */}
          {logs.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Histórico de Disparos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left p-3">Nome</th>
                      <th className="text-left p-3">Data</th>
                      <th className="text-center p-3">Total</th>
                      <th className="text-center p-3">Enviados</th>
                      <th className="text-center p-3">Falhas</th>
                      <th className="text-center p-3">IA</th>
                      <th className="text-center p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3 font-medium text-foreground">{log.broadcast_name || "Sem nome"}</td>
                        <td className="p-3 text-muted-foreground">{new Date(log.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="p-3 text-center">{log.total_contacts}</td>
                        <td className="p-3 text-center text-green-600">{log.sent}</td>
                        <td className="p-3 text-center text-destructive">{log.failed}</td>
                        <td className="p-3 text-center">{log.use_ai ? <Sparkles className="w-3.5 h-3.5 text-primary inline" /> : "—"}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {statusIcon(log.status)}
                            <span className="text-xs capitalize">{log.status === "running" ? "Enviando..." : log.status === "completed" ? "Concluído" : "Falhou"}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center text-center space-y-3">
              <Send className="w-10 h-10 text-muted-foreground/40" />
              <h3 className="text-sm font-semibold text-foreground">Nenhum disparo realizado</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Crie campanhas de disparo em massa via WhatsApp com personalização opcional por IA.
              </p>
            </div>
          )}
        </div>

        {/* Dialog Novo Disparo */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Disparo</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome do disparo (opcional)</Label>
                <Input
                  placeholder="Ex: Campanha Black Friday"
                  value={broadcastName}
                  onChange={(e) => setBroadcastName(e.target.value)}
                />
              </div>

              {/* Contatos */}
              <div className="space-y-2">
                <Label>Contatos (um por linha: telefone, nome)</Label>
                <Textarea
                  placeholder={"5511999990001, João\n5511999990002, Maria"}
                  rows={5}
                  value={contactsText}
                  onChange={(e) => setContactsText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {contactCount} contato{contactCount !== 1 ? "s" : ""} detectado{contactCount !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Template */}
              <div className="space-y-2">
                <Label>Mensagem (use {"{{name}}"} para personalizar)</Label>
                <Textarea
                  rows={3}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Olá {{name}}, temos uma oferta especial para você!"
                />
              </div>

              {/* IA Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Personalizar com IA</p>
                    <p className="text-xs text-muted-foreground">Cada mensagem será reescrita pelo agente</p>
                  </div>
                </div>
                <Switch checked={useAI} onCheckedChange={setUseAI} />
              </div>

              {/* Agent selector + estimativa + preview */}
              {useAI && (
                <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                  <div className="space-y-1.5">
                    <Label>Agente de personalização</Label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar agente" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mensagens estimadas:</span>
                    <Badge variant="secondary">~{estimatedMessages} msgs para {contactCount} contatos</Badge>
                  </div>

                  {!hasByok && !isUnlimited && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Restante no plano:</span>
                      <span className={`font-medium ${hasEnoughCapacity ? "text-foreground" : "text-destructive"}`}>
                        {usageLoading ? "..." : `${remainingMessages} msgs`}
                      </span>
                    </div>
                  )}

                  {!hasEnoughCapacity && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Limite mensal insuficiente. Configure uma chave de API ou faça upgrade do plano.
                    </div>
                  )}

                  {/* Preview */}
                  {selectedAgent && contactCount > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Preview de personalização</Label>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handlePreview} disabled={previewLoading}>
                          {previewLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                          Visualizar
                        </Button>
                      </div>
                      {previewMsg && (
                        <div className="rounded-md bg-background border border-border p-3 text-xs text-foreground whitespace-pre-wrap">
                          {previewMsg}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSend}
                disabled={sending || !contactCount || !template.trim() || (useAI && !selectedAgent) || !hasEnoughCapacity}
                className="gap-2"
              >
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</> : <><Send className="w-4 h-4" /> Enviar Disparo</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ModuleGate>
  );
};

export default AikortexBroadcasts;
