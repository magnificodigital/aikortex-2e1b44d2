import { useState, useEffect, useRef, useCallback } from "react";
import ModuleGate from "@/components/shared/ModuleGate";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye, Code2, Database, RotateCw, ExternalLink, Github, Upload, Save,
  LayoutDashboard, Settings, PanelLeftClose, PanelLeftOpen, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatPanel from "@/components/app-builder/ChatPanel";
import FileTree from "@/components/app-builder/FileTree";
import CodeEditor from "@/components/app-builder/CodeEditor";
import PreviewPanel from "@/components/app-builder/PreviewPanel";
import DatabasePanel from "@/components/app-builder/DatabasePanel";
import DashboardPanel from "@/components/app-builder/DashboardPanel";
import TerminalPanel from "@/components/app-builder/TerminalPanel";
import AppConfigPanel from "@/components/app-builder/AppConfigPanel";
import { AppBuilderProvider, useAppBuilder } from "@/contexts/AppBuilderContext";

type TabId = "preview" | "dashboard" | "code" | "database";
type AppChannel = "whatsapp" | "web";

const tabs: { id: TabId; label: string; icon: typeof Eye }[] = [
  { id: "preview", label: "Preview", icon: Eye },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "code", label: "Código", icon: Code2 },
  { id: "database", label: "Database", icon: Database },
];

const AppBuilderInner = ({ initialPrompt }: { initialPrompt: string }) => {
  const navigate = useNavigate();
  const { channel, setChannel, saveApp, appName, appId, files, tables, isGenerating, chatMessages, setFiles, setTables, setAppName, setChannel: setCtxChannel, setChatMessages, setWizardStep, setWizardData, setWizardConfig, setStructuredConfig, setAppState } = useAppBuilder();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("preview");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialized = useRef(false);

  // Auto-save: debounce 3s after meaningful state changes
  useEffect(() => {
    // Skip auto-save if no user, still generating, or no files yet
    if (!user || isGenerating || files.length === 0) return;
    // Skip the first render to avoid saving on load
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setSaving(true);
      const id = await saveApp(user.id);
      setSaving(false);
      if (id) {
        toast.success("Salvo automaticamente", { duration: 1500 });
      }
    }, 3000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [files, tables, appName, channel, chatMessages, user, isGenerating]);

  const finishRename = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== appName) {
      setAppName(trimmed);
      toast.success("Projeto renomeado!");
    }
    setEditingName(false);
  };

  useEffect(() => {
    if (!appId) return;
    supabase
      .from("user_apps")
      .select("*")
      .eq("id", appId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setAppName(data.name);
        setCtxChannel(data.channel as "whatsapp" | "web");
        if (Array.isArray(data.files)) setFiles(data.files as any);
        if (Array.isArray(data.tables_schema)) setTables(data.tables_schema as any);
        // Restore chat history and wizard state from config
        const cfg = data.config as any;
         if (cfg && typeof cfg === "object") {
          if (Array.isArray(cfg.chatMessages)) setChatMessages(cfg.chatMessages);
          if (cfg.wizardStep) setWizardStep(cfg.wizardStep);
          if (cfg.wizardData) setWizardData(cfg.wizardData);
          if (cfg.wizardConfig) setWizardConfig(cfg.wizardConfig);
          if (cfg.structuredConfig) setStructuredConfig(cfg.structuredConfig);
          if (cfg.appState) setAppState(cfg.appState);
        }
      });
  }, [appId]);

  const handleSave = async () => {
    if (!user) { toast.error("Faça login para salvar."); return; }
    setSaving(true);
    const id = await saveApp(user.id);
    setSaving(false);
    if (id) toast.success("App salvo!");
    else toast.error("Erro ao salvar.");
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Chat Panel — collapsible */}
      {!chatCollapsed && (
        <ChatPanel onBack={() => navigate("/apps")} initialPrompt={initialPrompt} />
      )}

      {/* Main workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top bar */}
        <div className="h-12 border-b border-border flex items-center justify-between px-3 shrink-0 bg-card/30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setChatCollapsed(!chatCollapsed)}
              title={chatCollapsed ? "Abrir chat" : "Fechar chat"}
            >
              {chatCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
            </Button>
            <div className="h-5 w-px bg-border" />
            {editingName ? (
              <form onSubmit={(e) => { e.preventDefault(); finishRename(); }} className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={finishRename}
                  className="h-6 w-40 text-xs px-1.5 py-0"
                />
              </form>
            ) : (
              <button
                className="text-xs font-semibold text-foreground tracking-tight hover:text-primary transition-colors cursor-text"
                onClick={() => { setNameDraft(appName); setEditingName(true); }}
                title="Clique para renomear"
              >
                {appName}
              </button>
            )}
            <span className="text-[10px] text-muted-foreground">— {channel === "whatsapp" ? "WhatsApp App" : "Web App"}</span>
          </div>

          {/* Center tabs */}
          <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant={showConfig ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              title="Configurações do App"
              onClick={() => setShowConfig(!showConfig)}
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <div className="h-5 w-px bg-border" />
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-full" onClick={handleSave} disabled={saving}>
              <Save className="w-3 h-3" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1 rounded-full bg-primary hover:bg-primary/90">
              <Upload className="w-3 h-3" />
              Publicar
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex min-h-0">
            {activeTab === "preview" && <PreviewPanel channel={channel} />}
            {activeTab === "dashboard" && <DashboardPanel channel={channel} />}
            {activeTab === "code" && (
              <>
                <FileTree selectedFile={selectedFile} onSelectFile={setSelectedFile} channel={channel} />
                <CodeEditor fileName={selectedFile} channel={channel} />
              </>
            )}
            {activeTab === "database" && <DatabasePanel />}
          </div>
          
        </div>
      </div>

      <AppConfigPanel channel={channel} onChannelChange={setChannel} open={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  );
};

const AppBuilder = () => {
  const location = useLocation();
  const state = location.state as any;
  const initialPrompt = state?.initialPrompt || "";
  const initialChannel = (state?.channel as AppChannel) || "web";
  const existingAppId = state?.appId || null;

  return (
    <ModuleGate moduleKey="aikortex.apps">
      <AppBuilderProvider initialChannel={initialChannel} existingAppId={existingAppId}>
        <AppBuilderInner initialPrompt={initialPrompt} />
      </AppBuilderProvider>
    </ModuleGate>
  );
};

export default AppBuilder;
