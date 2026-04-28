import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Phone, Monitor, MessageSquare, Globe, Webhook, Bell, Users, Shield,
  Layout, Database, Settings, BarChart3, CreditCard, FileText,
  Bot, Zap, Link2, Upload, Image, Type, MousePointer, Smartphone,
  ChevronRight, Check, Eye, Lock, Unlock, Brain, BookOpen, Key,
  Search, Plus, Trash2, GripVertical, Sparkles, Globe2, FileUp,
  ToggleLeft, Cpu, Layers, X,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { IntegrationsGrid, LLM_PROVIDERS, SERVICE_PROVIDERS } from "@/components/shared/IntegrationsGrid";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppBuilder } from "@/contexts/AppBuilderContext";

type AppChannel = "whatsapp" | "web";

type ConfigTab = "overview" | "intelligence" | "access" | "knowledge" | "channels";

const configTabs: { id: ConfigTab; label: string; icon: typeof Eye }[] = [
  { id: "overview", label: "Geral", icon: Layers },
  { id: "intelligence", label: "IA", icon: Brain },
  { id: "access", label: "Acesso", icon: Shield },
  { id: "knowledge", label: "Dados", icon: BookOpen },
  { id: "channels", label: "Canais", icon: Globe2 },
];

/* ── Section wrapper ── */
function Section({ title, icon: Icon, children, badge }: { title: string; icon: any; children: React.ReactNode; badge?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-xs font-semibold text-foreground flex-1">{title}</h3>
        {badge && <Badge variant="outline" className="text-[9px] h-4">{badge}</Badge>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, defaultOn = false }: { label: string; desc?: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
      <div className="min-w-0">
        <span className="text-xs text-foreground block">{label}</span>
        {desc && <span className="text-[10px] text-muted-foreground">{desc}</span>}
      </div>
      <Switch checked={on} onCheckedChange={setOn} className="shrink-0" />
    </div>
  );
}

/* ──── Tab: Overview ──── */
const OverviewTab = ({ channel }: { channel: AppChannel }) => {
  const { wizardConfig, appName } = useAppBuilder();
  const [description, setDescription] = useState(wizardConfig?.prompt || "");
  const [status, setStatus] = useState<"draft" | "active" | "paused">("draft");
  const [greeting, setGreeting] = useState(wizardConfig?.introMessage || "Olá! 👋 Como posso ajudar?");
  const [tone, setTone] = useState(wizardConfig?.tone || "professional_friendly");
  const [language, setLanguage] = useState(wizardConfig?.language || "pt-BR");

  useEffect(() => {
    if (wizardConfig) {
      setDescription(wizardConfig.prompt);
      setGreeting(wizardConfig.introMessage);
      setTone(wizardConfig.tone);
      setLanguage(wizardConfig.language);
    }
  }, [wizardConfig]);

  return (
    <div className="space-y-5">
      <Section title="Sobre o App" icon={FileText}>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que seu app faz..."
              className="text-xs min-h-[70px] bg-card/50 border-border/50 resize-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Status</label>
            <div className="flex gap-1.5">
              {(["draft", "active", "paused"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium border transition-all ${
                    status === s
                      ? s === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : s === "paused" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-primary/10 text-primary border-primary/30"
                      : "bg-card/50 text-muted-foreground border-border hover:border-border/80"
                  }`}
                >
                  {s === "draft" ? "Rascunho" : s === "active" ? "Ativo" : "Pausado"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Identidade Visual" icon={Image}>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-card/30 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
              <Upload className="w-5 h-5 text-primary/60" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Ícone do App</p>
              <p className="text-[10px] text-muted-foreground">PNG, SVG · 512x512px</p>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Cor principal</label>
            <div className="flex gap-1.5">
              {["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"].map((c) => (
                <button key={c} className="w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground/20 transition-all hover:scale-110" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Perfil do App" icon={Type}>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Tom de voz</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries({
                professional_friendly: "Profissional e Amigável",
                formal: "Formal",
                casual: "Casual e Descontraído",
                empathetic: "Empático e Acolhedor",
                direct: "Direto e Objetivo",
              }).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTone(key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                    tone === key
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-card border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Idioma</label>
            <div className="flex gap-1.5">
              {[["pt-BR", "🇧🇷 Português"], ["en", "🇺🇸 English"], ["es", "🇪🇸 Español"]].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setLanguage(k)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                    language === k
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-card border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {channel === "whatsapp" && (
        <Section title="Mensagens Padrão" icon={MessageSquare}>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Saudação</label>
              <Textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} className="text-xs min-h-[50px] bg-card/50 resize-none" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Fallback</label>
              <Textarea defaultValue="Desculpe, não entendi. Pode reformular?" className="text-xs min-h-[50px] bg-card/50 resize-none" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Fora do horário</label>
              <Textarea defaultValue="Estamos fora do horário. Retornaremos em breve!" className="text-xs min-h-[50px] bg-card/50 resize-none" />
            </div>
          </div>
        </Section>
      )}

      <Section title="Notificações" icon={Bell}>
        <div className="space-y-1.5">
          <ToggleRow label="Lead qualificado" desc="Notificar ao captar lead" />
          <ToggleRow label="Conversa sem resposta" desc="Alerta após 5min inativo" />
          <ToggleRow label="Resumo diário" desc="Relatório por e-mail" />
        </div>
      </Section>
    </div>
  );
};

/* ──── Tab: Intelligence (LLM) ──── */
const IntelligenceTab = () => {
  return (
    <div className="space-y-5">
      <IntegrationsGrid
        providers={LLM_PROVIDERS}
        title="Modelos de IA (LLMs)"
        subtitle="Conecte provedores de IA para potencializar seu app."
      />

      <IntegrationsGrid
        providers={SERVICE_PROVIDERS}
        title="Serviços & Ferramentas"
        subtitle="Conecte ferramentas externas para expandir as capacidades."
      />
    </div>
  );
};

/* ──── Tab: Access ──── */
const AccessTab = () => {
  const [accessMode, setAccessMode] = useState<"public" | "private">("public");
  const [users, setUsers] = useState([
    { email: "admin@empresa.com", role: "admin" },
  ]);
  const [newEmail, setNewEmail] = useState("");

  const addUser = () => {
    if (!newEmail.trim()) return;
    setUsers([...users, { email: newEmail.trim(), role: "user" }]);
    setNewEmail("");
  };

  return (
    <div className="space-y-5">
      <Section title="Modo de Acesso" icon={accessMode === "public" ? Unlock : Lock}>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setAccessMode("public")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              accessMode === "public"
                ? "bg-emerald-500/10 border-emerald-500/30 shadow-sm"
                : "bg-card/50 border-border hover:border-border/80"
            }`}
          >
            <Globe className={`w-5 h-5 ${accessMode === "public" ? "text-emerald-400" : "text-muted-foreground"}`} />
            <div className="text-center">
              <p className="text-xs font-medium text-foreground">Público</p>
              <p className="text-[9px] text-muted-foreground">Qualquer pessoa</p>
            </div>
          </button>
          <button
            onClick={() => setAccessMode("private")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              accessMode === "private"
                ? "bg-amber-500/10 border-amber-500/30 shadow-sm"
                : "bg-card/50 border-border hover:border-border/80"
            }`}
          >
            <Lock className={`w-5 h-5 ${accessMode === "private" ? "text-amber-400" : "text-muted-foreground"}`} />
            <div className="text-center">
              <p className="text-xs font-medium text-foreground">Privado</p>
              <p className="text-[9px] text-muted-foreground">Apenas autorizados</p>
            </div>
          </button>
        </div>
      </Section>

      {accessMode === "private" && (
        <Section title="Usuários Autorizados" icon={Users} badge={`${users.length}`}>
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="h-8 text-xs bg-card/50 flex-1"
                onKeyDown={(e) => e.key === "Enter" && addUser()}
              />
              <Button size="sm" className="h-8 w-8 p-0 shrink-0" onClick={addUser}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {users.map((u, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary">{u.email[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-foreground truncate">{u.email}</p>
                </div>
                <Badge variant="outline" className="text-[8px] h-4 capitalize">{u.role}</Badge>
                <button onClick={() => setUsers(users.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Autenticação" icon={Shield}>
        <div className="space-y-1.5">
          <ToggleRow label="Login obrigatório" desc="Exigir autenticação para usar" />
          <ToggleRow label="Registro aberto" desc="Permitir novos cadastros" defaultOn />
          <ToggleRow label="Login social" desc="Google, Apple" />
        </div>
      </Section>

      <Section title="Limites de Uso" icon={BarChart3}>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Msgs / usuário / dia</label>
            <Input type="number" defaultValue={100} className="h-8 text-xs bg-card/50" />
          </div>
          <ToggleRow label="Rate limiting" desc="Anti-spam automático" defaultOn />
        </div>
      </Section>
    </div>
  );
};

/* ──── Tab: Knowledge ──── */
const KnowledgeTab = () => {
  const [files, setFiles] = useState<{ name: string; size: string; type: string }[]>([
    { name: "catalogo-produtos.pdf", size: "2.4 MB", type: "PDF" },
  ]);
  const [urls, setUrls] = useState<string[]>(["https://meusite.com.br"]);
  const [newUrl, setNewUrl] = useState("");

  const addUrl = () => {
    if (!newUrl.trim()) return;
    setUrls([...urls, newUrl.trim()]);
    setNewUrl("");
  };

  return (
    <div className="space-y-5">
      <Section title="Arquivos de Conhecimento" icon={FileUp} badge={`${files.length}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-center p-6 rounded-xl border-2 border-dashed border-border bg-card/20 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
            <div className="text-center">
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Arraste arquivos ou clique para enviar</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">PDF, TXT, CSV, DOCX · até 10MB</p>
            </div>
          </div>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-card/50 border border-border">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground truncate">{f.name}</p>
                <p className="text-[9px] text-muted-foreground">{f.size} · {f.type}</p>
              </div>
              <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Fontes Web" icon={Search} badge={`${urls.length}`}>
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://meusite.com.br/docs"
              className="h-8 text-xs bg-card/50 flex-1"
              onKeyDown={(e) => e.key === "Enter" && addUrl()}
            />
            <Button size="sm" className="h-8 w-8 p-0 shrink-0" onClick={addUrl}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border">
              <Globe2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-[11px] text-foreground truncate flex-1">{url}</span>
              <button onClick={() => setUrls(urls.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">O conteúdo será indexado automaticamente para consulta da IA.</p>
        </div>
      </Section>

      <Section title="Configurações de Busca" icon={Sparkles}>
        <div className="space-y-1.5">
          <ToggleRow label="Busca semântica" desc="Busca por similaridade de significado" defaultOn />
          <ToggleRow label="Web search" desc="Pesquisar na internet em tempo real" />
          <ToggleRow label="Auto-indexação" desc="Re-indexar ao atualizar arquivos" defaultOn />
        </div>
      </Section>
    </div>
  );
};

/* ──── Tab: Channels ──── */
const ChannelsTab = ({ channel, onChannelChange }: { channel: AppChannel; onChannelChange: (ch: AppChannel) => void }) => {
  return (
    <div className="space-y-5">
      <Section title="Canal Principal" icon={Globe2}>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChannelChange("whatsapp")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              channel === "whatsapp"
                ? "bg-emerald-500/10 border-emerald-500/30 shadow-sm"
                : "bg-card/50 border-border hover:border-border/80"
            }`}
          >
            <Phone className={`w-5 h-5 ${channel === "whatsapp" ? "text-emerald-400" : "text-muted-foreground"}`} />
            <div className="text-center">
              <p className="text-xs font-medium text-foreground">WhatsApp</p>
              <p className="text-[9px] text-muted-foreground">Chatbot conversacional</p>
            </div>
          </button>
          <button
            onClick={() => onChannelChange("web")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              channel === "web"
                ? "bg-primary/10 border-primary/30 shadow-sm"
                : "bg-card/50 border-border hover:border-border/80"
            }`}
          >
            <Monitor className={`w-5 h-5 ${channel === "web" ? "text-primary" : "text-muted-foreground"}`} />
            <div className="text-center">
              <p className="text-xs font-medium text-foreground">Web App</p>
              <p className="text-[9px] text-muted-foreground">Interface visual</p>
            </div>
          </button>
        </div>
      </Section>

      {channel === "whatsapp" && (
        <>
          <Section title="WhatsApp Business API" icon={() => <WhatsAppIcon className="w-4 h-4" />}>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-card/50">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">WABA</p>
                  <p className="text-[10px] text-muted-foreground">Não conectado</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-[10px]">Conectar</Button>
              </div>
              <Input placeholder="Phone Number ID" className="h-8 text-xs bg-card/50" />
              <Input placeholder="Access Token" type="password" className="h-8 text-xs bg-card/50" />
              <Input placeholder="Verify Token" className="h-8 text-xs bg-card/50" />
            </div>
          </Section>

          <Section title="Jornada Conversacional" icon={Zap}>
            <div className="space-y-1.5">
              {["Saudação", "Qualificação", "Atendimento", "Follow-up", "Encerramento"].map((step, i) => (
                <div key={step} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card/50 hover:border-primary/20 transition-colors cursor-pointer group">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-xs text-foreground flex-1">{step}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full h-7 text-[10px] mt-1">+ Adicionar etapa</Button>
            </div>
          </Section>

          <Section title="Agentes" icon={Bot}>
            <div className="space-y-1.5">
              {[
                { name: "Qualificador", desc: "Coleta e qualifica leads" },
                { name: "Atendente", desc: "Responde dúvidas gerais" },
              ].map((agent) => (
                <div key={agent.name} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card/50 cursor-pointer hover:border-primary/20 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-foreground">{agent.name}</p>
                    <p className="text-[9px] text-muted-foreground">{agent.desc}</p>
                  </div>
                  <Settings className="w-3 h-3 text-muted-foreground" />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full h-7 text-[10px]">+ Adicionar agente</Button>
            </div>
          </Section>
        </>
      )}

      {channel === "web" && (
        <>
          <Section title="Configurações Web" icon={Layout}>
            <div className="space-y-1.5">
              <ToggleRow label="Design responsivo" desc="Adaptar para mobile" defaultOn />
              <ToggleRow label="PWA" desc="Instalável no celular" />
              <ToggleRow label="SEO" desc="Otimização para buscadores" defaultOn />
            </div>
          </Section>

          <Section title="Widget de Chat" icon={MessageSquare}>
            <div className="space-y-1.5">
              <ToggleRow label="Chat integrado" desc="Widget flutuante no site" />
              <ToggleRow label="Chat WhatsApp" desc="Redirecionar para WhatsApp" />
            </div>
          </Section>
        </>
      )}

      <Section title="Integrações" icon={Link2}>
        <div className="space-y-1.5">
          {[
            { name: "CRM", desc: "Sincronizar leads", icon: Users },
            { name: "Calendário", desc: "Agendamentos", icon: BarChart3 },
            { name: "Pagamentos", desc: "Cobranças", icon: CreditCard },
            { name: "Webhook", desc: "Eventos externos", icon: Webhook },
          ].map((int) => (
            <div key={int.name} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-2">
                <int.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <div>
                  <p className="text-[11px] font-medium text-foreground">{int.name}</p>
                  <p className="text-[9px] text-muted-foreground">{int.desc}</p>
                </div>
              </div>
              <Switch />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

/* ──── Main Config Panel ──── */
interface AppConfigPanelProps {
  channel: AppChannel;
  onChannelChange: (ch: AppChannel) => void;
  open: boolean;
  onClose: () => void;
}

const AppConfigPanel = ({ channel, onChannelChange, open, onClose }: AppConfigPanelProps) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>("overview");

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[380px] p-0 border-l border-border flex flex-col">
        <SheetHeader className="px-3 py-2.5 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <SheetTitle className="text-sm font-semibold text-foreground truncate min-w-0">Configurações</SheetTitle>
            <Badge variant="outline" className="text-[10px] gap-1 h-5">
              {channel === "whatsapp" ? <WhatsAppIcon className="w-3 h-3 text-emerald-500" /> : <Monitor className="w-3 h-3 text-primary" />}
              {channel === "whatsapp" ? "WhatsApp" : "Web"}
            </Badge>
          </div>
          {/* Tab bar */}
          <div className="flex gap-0.5 p-0.5 bg-muted/40 rounded-lg">
            {configTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3 h-3" />
                <span className="hidden xl:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-3 py-4">
            {activeTab === "overview" && <OverviewTab channel={channel} />}
            {activeTab === "intelligence" && <IntelligenceTab />}
            {activeTab === "access" && <AccessTab />}
            {activeTab === "knowledge" && <KnowledgeTab />}
            {activeTab === "channels" && <ChannelsTab channel={channel} onChannelChange={onChannelChange} />}
          </div>
        </ScrollArea>

        {/* Save */}
        <div className="px-3 py-2.5 border-t border-border shrink-0">
          <Button className="w-full h-8 text-xs rounded-lg gap-1.5" onClick={onClose}>
            <Check className="w-3.5 h-3.5" />
            Salvar Configurações
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AppConfigPanel;
