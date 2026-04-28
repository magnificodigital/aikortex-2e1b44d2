import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GeneratedFile {
  name: string;
  path: string;
  content: string;
}

export interface GeneratedTable {
  name: string;
  columns: { name: string; type: string; isPK?: boolean }[];
  rows: Record<string, string>[];
}

export interface TerminalLog {
  text: string;
  type: "command" | "output" | "success" | "error";
  timestamp: number;
}

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  up: boolean;
}

export interface WizardConfig {
  prompt: string;
  companyName: string;
  appName: string;
  tone: string;
  language: string;
  introMessage: string;
  maxMessages: number;
  onboarding: "none" | "soft" | "strict";
  selectedFeatures: string[];
  businessContext: string;
  constraints: string;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type WizardStepId = "discover" | "structure" | "build" | "done";

export interface WizardData {
  prompt: string;
  companyName: string;
  appName: string;
  tone: string;
  language: string;
  introMessage: string;
  maxMessages: number;
  onboarding: "none" | "soft" | "strict";
  selectedFeatures: string[];
  businessContext: string;
  constraints: string;
}

export interface StructuredAppConfig {
  app_type: string;
  app_name: string;
  app_description: string;
  tone: string;
  language: string;
  intro_message: string;
  max_turn_messages: number;
  onboarding_level: string;
  selected_features: string[];
  business_context?: string;
  constraints?: string;
}

/* ── Runtime App State (JSON-driven preview) ── */

export interface AppStatePreview {
  type: "whatsapp" | "web";
  title: string;
  subtitle: string;
  layout: Record<string, any>;
  screen_data: Record<string, any>;
  interactions: any[];
}

export interface AppStateAgentConfig {
  intro_message: string;
  max_turn_messages: number;
  onboarding_level: "none" | "soft" | "strict";
  personality_rules: string[];
  conversation_rules: string[];
  cta_primary: string;
  quick_replies: string[];
}

export interface AppStateFlow {
  id: string;
  name: string;
  description: string;
  steps: any[];
}

export interface AppStateTable {
  name: string;
  columns: { name: string; type: string; required: boolean }[];
}

export interface AppStateFile {
  path: string;
  type: string;
  purpose: string;
  content_summary: string;
}

export interface AppStateUIModule {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface AppStateRuntime {
  render_ready: boolean;
  mocked: boolean;
  warnings: string[];
  next_build_targets: string[];
}

export interface AppState {
  app_meta: {
    type: "whatsapp" | "web";
    name: string;
    description: string;
    tone: string;
    language: string;
    status: string;
  };
  preview: AppStatePreview;
  agent_config: AppStateAgentConfig;
  flows: AppStateFlow[];
  database: {
    tables: AppStateTable[];
  };
  files: AppStateFile[];
  ui_modules: AppStateUIModule[];
  runtime: AppStateRuntime;
}

export interface AppBuilderState {
  channel: "whatsapp" | "web";
  files: GeneratedFile[];
  tables: GeneratedTable[];
  terminalLogs: TerminalLog[];
  dashboardMetrics: DashboardMetric[];
  appName: string;
  isGenerating: boolean;
  wizardConfig: WizardConfig | null;
  chatMessages: ChatMessage[];
  wizardStep: WizardStepId;
  wizardData: WizardData;
  structuredConfig: StructuredAppConfig | null;
  appState: AppState | null;
}

interface AppBuilderContextType extends AppBuilderState {
  setChannel: (ch: "whatsapp" | "web") => void;
  addFile: (file: GeneratedFile) => void;
  setFiles: (files: GeneratedFile[]) => void;
  addTable: (table: GeneratedTable) => void;
  setTables: (tables: GeneratedTable[]) => void;
  addTerminalLog: (log: TerminalLog) => void;
  setDashboardMetrics: (metrics: DashboardMetric[]) => void;
  setAppName: (name: string) => void;
  setIsGenerating: (v: boolean) => void;
  setWizardConfig: (config: WizardConfig) => void;
  setChatMessages: (msgs: ChatMessage[]) => void;
  setWizardStep: (step: WizardStepId) => void;
  setWizardData: (data: WizardData) => void;
  setStructuredConfig: (config: StructuredAppConfig | null) => void;
  setAppState: (state: AppState | null) => void;
  initializeProject: (channel: "whatsapp" | "web", prompt: string) => void;
  saveApp: (userId: string) => Promise<string | null>;
  appId: string | null;
  setAppId: (id: string | null) => void;
}

const AppBuilderContext = createContext<AppBuilderContextType | null>(null);

export const useAppBuilder = () => {
  const ctx = useContext(AppBuilderContext);
  if (!ctx) throw new Error("useAppBuilder must be used within AppBuilderProvider");
  return ctx;
};

/* ── Scaffold generators ── */

function generateWebFiles(prompt: string): GeneratedFile[] {
  const appDesc = prompt.slice(0, 60);
  return [
    { name: "index.html", path: "/index.html", content: `<!doctype html>\n<html lang="pt-BR">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Meu App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>` },
    { name: "App.tsx", path: "/src/App.tsx", content: `import { BrowserRouter, Routes, Route } from "react-router-dom";\nimport Sidebar from "./components/Sidebar";\nimport Header from "./components/Header";\nimport Dashboard from "./pages/Dashboard";\nimport Home from "./pages/Home";\n\n// ${appDesc}\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <div className="flex h-screen">\n        <Sidebar />\n        <div className="flex-1 flex flex-col">\n          <Header />\n          <main className="flex-1 p-6 overflow-auto">\n            <Routes>\n              <Route path="/" element={<Home />} />\n              <Route path="/dashboard" element={<Dashboard />} />\n            </Routes>\n          </main>\n        </div>\n      </div>\n    </BrowserRouter>\n  );\n}` },
    { name: "Dashboard.tsx", path: "/src/pages/Dashboard.tsx", content: `import MetricCard from "../components/MetricCard";\n\nexport default function Dashboard() {\n  return (\n    <div className="space-y-6">\n      <h1 className="text-2xl font-bold">Dashboard</h1>\n      <div className="grid grid-cols-4 gap-4">\n        <MetricCard title="Usuários" value="0" change="+0%" />\n        <MetricCard title="Receita" value="R$ 0" change="+0%" />\n      </div>\n    </div>\n  );\n}` },
    { name: "MetricCard.tsx", path: "/src/components/MetricCard.tsx", content: `interface Props { title: string; value: string; change: string; }\n\nexport default function MetricCard({ title, value, change }: Props) {\n  return (\n    <div className="rounded-xl border p-4 bg-card">\n      <p className="text-sm text-muted-foreground">{title}</p>\n      <p className="text-2xl font-bold mt-1">{value}</p>\n      <span className="text-xs text-green-500">{change}</span>\n    </div>\n  );\n}` },
    { name: "Sidebar.tsx", path: "/src/components/Sidebar.tsx", content: `export default function Sidebar() {\n  return (\n    <aside className="w-60 border-r bg-card p-4">\n      <nav className="space-y-1">\n        <a href="/" className="block px-3 py-2 rounded-md text-sm">Home</a>\n        <a href="/dashboard" className="block px-3 py-2 rounded-md text-sm">Dashboard</a>\n      </nav>\n    </aside>\n  );\n}` },
    { name: "Header.tsx", path: "/src/components/Header.tsx", content: `export default function Header() {\n  return (\n    <header className="h-14 border-b flex items-center px-6">\n      <h1 className="text-lg font-semibold">Meu App</h1>\n    </header>\n  );\n}` },
  ];
}

function generateWhatsAppFiles(prompt: string): GeneratedFile[] {
  const appDesc = prompt.slice(0, 60);
  return [
    { name: "main-agent.ts", path: "/src/agents/main-agent.ts", content: `// ${appDesc}\n// Agente principal do WhatsApp Bot\n\nimport { WhatsAppAPI } from "../integrations/whatsapp-api";\nimport { config } from "../config";\n\nexport class MainAgent {\n  private api: WhatsAppAPI;\n\n  constructor() {\n    this.api = new WhatsAppAPI(config.token, config.phoneNumberId);\n  }\n\n  async handle(from: string, text: string, stage: string) {\n    // Lógica principal do agente\n  }\n}` },
    { name: "qualifier.ts", path: "/src/agents/qualifier.ts", content: `// Agente de qualificação de leads\n\nexport class QualifierAgent {\n  private questions = [\n    "Qual é o seu nome completo?",\n    "Qual é o seu principal objetivo?",\n    "Qual o seu orçamento estimado?",\n  ];\n\n  async qualify(from: string, step: number) {}\n}` },
    { name: "whatsapp-api.ts", path: "/src/integrations/whatsapp-api.ts", content: `const BASE_URL = "https://graph.facebook.com/v21.0";\n\nexport class WhatsAppAPI {\n  constructor(private token: string, private phoneId: string) {}\n\n  async sendText(to: string, body: string) {}\n  async sendButtons(to: string, body: string, buttons: string[]) {}\n  async sendList(to: string, body: string, sections: any[]) {}\n}` },
    { name: "webhook.ts", path: "/src/handlers/webhook.ts", content: `export async function handleWebhook(req: Request) {\n  const body = await req.json();\n  const entry = body.entry?.[0]?.changes?.[0]?.value;\n  const message = entry?.messages?.[0];\n  if (!message) return new Response("OK");\n}` },
    { name: "config.ts", path: "/src/config.ts", content: `export const config = {\n  phoneNumberId: "",\n  token: "",\n  botName: "Assistente",\n  language: "pt-BR",\n};` },
  ];
}

function generateWebTables(): GeneratedTable[] {
  return [
    { name: "users", columns: [{ name: "id", type: "UUID", isPK: true }, { name: "email", type: "TEXT" }, { name: "full_name", type: "TEXT" }, { name: "created_at", type: "TIMESTAMP" }], rows: [] },
    { name: "profiles", columns: [{ name: "id", type: "UUID", isPK: true }, { name: "user_id", type: "UUID" }, { name: "avatar_url", type: "TEXT" }, { name: "bio", type: "TEXT" }], rows: [] },
    { name: "settings", columns: [{ name: "id", type: "UUID", isPK: true }, { name: "user_id", type: "UUID" }, { name: "theme", type: "TEXT" }, { name: "notifications", type: "BOOLEAN" }], rows: [] },
  ];
}

function generateWhatsAppTables(): GeneratedTable[] {
  return [
    { name: "contacts", columns: [{ name: "id", type: "UUID", isPK: true }, { name: "phone", type: "TEXT" }, { name: "name", type: "TEXT" }, { name: "stage", type: "TEXT" }, { name: "created_at", type: "TIMESTAMP" }], rows: [] },
    { name: "conversations", columns: [{ name: "id", type: "UUID", isPK: true }, { name: "contact_id", type: "UUID" }, { name: "status", type: "TEXT" }, { name: "started_at", type: "TIMESTAMP" }, { name: "ended_at", type: "TIMESTAMP" }], rows: [] },
    { name: "messages", columns: [{ name: "id", type: "UUID", isPK: true }, { name: "conversation_id", type: "UUID" }, { name: "direction", type: "TEXT" }, { name: "content", type: "TEXT" }, { name: "sent_at", type: "TIMESTAMP" }], rows: [] },
    { name: "leads", columns: [{ name: "id", type: "UUID", isPK: true }, { name: "contact_id", type: "UUID" }, { name: "score", type: "INTEGER" }, { name: "qualified", type: "BOOLEAN" }, { name: "data", type: "JSONB" }], rows: [] },
  ];
}

function generateWebMetrics(): DashboardMetric[] {
  return [
    { label: "Usuários Ativos", value: "0", change: "--", up: true },
    { label: "Pageviews", value: "0", change: "--", up: true },
    { label: "Conversão", value: "0%", change: "--", up: true },
    { label: "Bounce Rate", value: "0%", change: "--", up: true },
  ];
}

function generateWhatsAppMetrics(): DashboardMetric[] {
  return [
    { label: "Conversas Ativas", value: "0", change: "--", up: true },
    { label: "Leads Qualificados", value: "0", change: "--", up: true },
    { label: "Taxa de Resposta", value: "0%", change: "--", up: true },
    { label: "Tempo Médio", value: "--", change: "--", up: true },
  ];
}

function buildPlaceholderMetrics(appType: "whatsapp" | "web", screenData?: Record<string, any>): DashboardMetric[] {
  if (screenData?.metrics && Array.isArray(screenData.metrics) && screenData.metrics.length > 0) {
    return screenData.metrics.map((m: any) => ({
      label: m.label || m.title || "Métrica",
      value: String(m.value ?? "0"),
      change: m.change || "--",
      up: m.up ?? true,
    }));
  }

  if (appType === "whatsapp") {
    return [
      { label: "Usuários", value: "0", change: "placeholder", up: true },
      { label: "Conversas", value: "0", change: "placeholder", up: true },
      { label: "Sessões", value: "0", change: "placeholder", up: true },
    ];
  }

  return [
    { label: "Usuários", value: "0", change: "placeholder", up: true },
    { label: "Sessões", value: "0", change: "placeholder", up: true },
    { label: "Conversões", value: "0", change: "placeholder", up: true },
  ];
}

/* ── Helper: Sync AppState → legacy structures ── */

function syncAppStateToLegacy(
  appState: AppState,
  existingFiles: GeneratedFile[],
  existingTables: GeneratedTable[],
): { files: GeneratedFile[]; tables: GeneratedTable[]; metrics: DashboardMetric[] } {
  // Convert appState.files to GeneratedFile[]
  const files: GeneratedFile[] = appState.files.map(f => ({
    name: f.path.split("/").pop() || f.path,
    path: f.path,
    content: `// ${f.purpose}\n// ${f.content_summary}`,
  }));

  // Convert appState.database.tables to GeneratedTable[]
  const tables: GeneratedTable[] = appState.database.tables.map(t => ({
    name: t.name,
    columns: t.columns.map(c => ({
      name: c.name,
      type: c.type,
      isPK: c.name === "id" || undefined,
    })),
    rows: [],
  }));

  const sd = appState.preview.screen_data;
  const metrics = buildPlaceholderMetrics(appState.app_meta.type, sd);

  return {
    files: files.length > 0 ? files : existingFiles,
    tables: tables.length > 0 ? tables : existingTables,
    metrics,
  };
}

/* ── Provider ── */

export function AppBuilderProvider({ children, initialChannel = "web", existingAppId }: { children: ReactNode; initialChannel?: "whatsapp" | "web"; existingAppId?: string | null }) {
  const defaultWizardData: WizardData = {
    prompt: "",
    companyName: "",
    appName: "",
    tone: "professional_friendly",
    language: "pt-BR",
    introMessage: "",
    maxMessages: 2,
    onboarding: "soft",
    selectedFeatures: [],
    businessContext: "",
    constraints: "",
  };

  const [appId, setAppId] = useState<string | null>(existingAppId || null);
  const [state, setState] = useState<AppBuilderState>({
    channel: initialChannel,
    files: [],
    tables: [],
    terminalLogs: [],
    dashboardMetrics: [],
    appName: "Meu App",
    isGenerating: false,
    wizardConfig: null,
    chatMessages: [],
    wizardStep: "discover",
    wizardData: defaultWizardData,
    structuredConfig: null,
    appState: null,
  });

  const setChannel = useCallback((ch: "whatsapp" | "web") => setState(s => ({ ...s, channel: ch })), []);
  const addFile = useCallback((file: GeneratedFile) => setState(s => {
    const exists = s.files.findIndex(f => f.name === file.name);
    if (exists >= 0) {
      const updated = [...s.files];
      updated[exists] = file;
      return { ...s, files: updated };
    }
    return { ...s, files: [...s.files, file] };
  }), []);
  const setFiles = useCallback((files: GeneratedFile[]) => setState(s => ({ ...s, files })), []);
  const addTable = useCallback((table: GeneratedTable) => setState(s => {
    const exists = s.tables.findIndex(t => t.name === table.name);
    if (exists >= 0) {
      const updated = [...s.tables];
      updated[exists] = table;
      return { ...s, tables: updated };
    }
    return { ...s, tables: [...s.tables, table] };
  }), []);
  const setTables = useCallback((tables: GeneratedTable[]) => setState(s => ({ ...s, tables })), []);
  const addTerminalLog = useCallback((log: TerminalLog) => setState(s => ({ ...s, terminalLogs: [...s.terminalLogs, log] })), []);
  const setDashboardMetrics = useCallback((metrics: DashboardMetric[]) => setState(s => ({ ...s, dashboardMetrics: metrics })), []);
  const setAppName = useCallback((name: string) => setState(s => ({ ...s, appName: name })), []);
  const setIsGenerating = useCallback((v: boolean) => setState(s => ({ ...s, isGenerating: v })), []);
  const setChatMessages = useCallback((msgs: ChatMessage[]) => setState(s => ({ ...s, chatMessages: msgs })), []);
  const setWizardStep = useCallback((step: WizardStepId) => setState(s => ({ ...s, wizardStep: step })), []);
  const setCtxWizardData = useCallback((data: WizardData) => setState(s => ({ ...s, wizardData: data })), []);
  const setWizardConfig = useCallback((config: WizardConfig) => setState(s => ({ ...s, wizardConfig: config })), []);
  const setStructuredConfig = useCallback((config: StructuredAppConfig | null) => setState(s => ({ ...s, structuredConfig: config })), []);
  const setAppState = useCallback((appState: AppState | null) => {
    setState(s => {
      if (!appState) return { ...s, appState: null };
      const normalizedAppState: AppState = {
        ...appState,
        runtime: {
          render_ready: true,
          mocked: appState.runtime?.mocked ?? true,
          warnings: appState.runtime?.warnings ?? [],
          next_build_targets: appState.runtime?.next_build_targets ?? [],
        },
      };

      // Sync legacy structures from appState
      const { files, tables, metrics } = syncAppStateToLegacy(normalizedAppState, s.files, s.tables);
      return {
        ...s,
        appState: normalizedAppState,
        channel: normalizedAppState.app_meta.type || s.channel,
        files,
        tables,
        dashboardMetrics: metrics,
        appName: normalizedAppState.app_meta.name || s.appName,
        isGenerating: false,
      };
    });
  }, []);

  const initializeProject = useCallback((channel: "whatsapp" | "web", prompt: string) => {
    const files = channel === "whatsapp" ? generateWhatsAppFiles(prompt) : generateWebFiles(prompt);
    const tables = channel === "whatsapp" ? generateWhatsAppTables() : generateWebTables();
    const metrics = channel === "whatsapp" ? generateWhatsAppMetrics() : generateWebMetrics();

    const logs: TerminalLog[] = [
      { text: "$ aikortex init --channel=" + channel, type: "command", timestamp: Date.now() },
      { text: "✓ Projeto inicializado com sucesso", type: "success", timestamp: Date.now() + 100 },
      { text: `✓ ${files.length} arquivos gerados`, type: "success", timestamp: Date.now() + 200 },
      { text: `✓ ${tables.length} tabelas criadas`, type: "success", timestamp: Date.now() + 300 },
      { text: "$ npm run dev", type: "command", timestamp: Date.now() + 400 },
      { text: "➜ Local: http://localhost:5173/", type: "success", timestamp: Date.now() + 500 },
      { text: "ready in 320ms", type: "output", timestamp: Date.now() + 600 },
    ];

    setState(s => ({
      ...s,
      channel,
      files,
      tables,
      terminalLogs: logs,
      dashboardMetrics: metrics,
      isGenerating: false,
    }));
  }, []);

  const saveApp = useCallback(async (userId: string): Promise<string | null> => {
    const configData = {
      chatMessages: state.chatMessages,
      wizardStep: state.wizardStep,
      wizardData: state.wizardData,
      wizardConfig: state.wizardConfig,
      structuredConfig: state.structuredConfig,
      appState: state.appState,
    };

    const payload = {
      user_id: userId,
      name: state.appName,
      description: '',
      channel: state.channel,
      files: JSON.parse(JSON.stringify(state.files)),
      tables_schema: JSON.parse(JSON.stringify(state.tables)),
      config: JSON.parse(JSON.stringify(configData)),
      status: 'draft',
    };

    if (appId) {
      const { error } = await supabase
        .from('user_apps')
        .update(payload)
        .eq('id', appId);
      if (error) { console.error(error); return null; }
      return appId;
    } else {
      const { data, error } = await supabase
        .from('user_apps')
        .insert(payload)
        .select('id')
        .single();
      if (error || !data) { console.error(error); return null; }
      setAppId(data.id);
      return data.id;
    }
  }, [state, appId]);

  return (
    <AppBuilderContext.Provider value={{
      ...state,
      setChannel, addFile, setFiles, addTable, setTables,
      addTerminalLog, setDashboardMetrics, setAppName,
      setIsGenerating, setWizardConfig, setChatMessages, setWizardStep,
      setWizardData: setCtxWizardData, setStructuredConfig, setAppState,
      initializeProject, saveApp, appId, setAppId,
    }}>
      {children}
    </AppBuilderContext.Provider>
  );
}
