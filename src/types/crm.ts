export type PipelineStage = "lead" | "em_atendimento" | "qualificado" | "agendado" | "negociacao" | "ganho" | "perdido";

export const PIPELINE_STAGES: { value: PipelineStage; label: string; color: string; bg: string; dot: string }[] = [
  { value: "lead", label: "Lead", color: "text-muted-foreground", bg: "bg-muted", dot: "bg-muted-foreground" },
  { value: "em_atendimento", label: "Em Atendimento", color: "text-info", bg: "bg-info/10", dot: "bg-info" },
  { value: "qualificado", label: "Qualificado", color: "text-warning", bg: "bg-warning/10", dot: "bg-warning" },
  { value: "agendado", label: "Agendado", color: "text-primary", bg: "bg-primary/10", dot: "bg-primary" },
  { value: "negociacao", label: "Negociação", color: "text-accent-foreground", bg: "bg-accent", dot: "bg-accent-foreground" },
  { value: "ganho", label: "Ganho", color: "text-success", bg: "bg-success/10", dot: "bg-success" },
  { value: "perdido", label: "Perdido", color: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive" },
];

export type LeadSource = "linkedin" | "google_maps" | "whatsapp" | "instagram" | "website" | "indicacao" | "manual";

export const LEAD_SOURCES: { value: LeadSource; label: string; icon: string }[] = [
  { value: "linkedin", label: "LinkedIn", icon: "💼" },
  { value: "google_maps", label: "Google Maps", icon: "📍" },
  { value: "whatsapp", label: "WhatsApp", icon: "📱" },
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "website", label: "Website", icon: "🌐" },
  { value: "indicacao", label: "Indicação", icon: "🤝" },
  { value: "manual", label: "Manual", icon: "✍️" },
];

export type LeadTemperature = "frio" | "morno" | "quente";

export interface LeadActivity {
  id: string;
  type: "note" | "call" | "email" | "meeting" | "whatsapp" | "stage_change";
  description: string;
  createdAt: string;
  createdBy: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  stage: PipelineStage;
  source: LeadSource;
  temperature: LeadTemperature;
  value: number;
  assignee: string;
  tags: string[];
  notes: string;
  activities: LeadActivity[];
  createdAt: string;
  updatedAt: string;
  lostReason?: string;
}

export const TEMPERATURE_CONFIG: Record<LeadTemperature, { label: string; color: string; bg: string }> = {
  frio: { label: "Frio", color: "text-info", bg: "bg-info/10" },
  morno: { label: "Morno", color: "text-warning", bg: "bg-warning/10" },
  quente: { label: "Quente", color: "text-destructive", bg: "bg-destructive/10" },
};

// Mock data
export const MOCK_LEADS: Lead[] = [
  {
    id: "lead-1", name: "Carlos Mendes", email: "carlos@techsol.com", phone: "(11) 99999-1234",
    company: "TechSol Ltda", position: "CEO", stage: "lead", source: "linkedin", temperature: "morno",
    value: 15000, assignee: "Ana Silva", tags: ["SaaS", "B2B"], notes: "Interessado em automação",
    activities: [
      { id: "a1", type: "note", description: "Lead capturado via LinkedIn pelo agente BDR", createdAt: "2026-03-13T10:00:00", createdBy: "Agente BDR" },
    ],
    createdAt: "2026-03-13T10:00:00", updatedAt: "2026-03-13T10:00:00",
  },
  {
    id: "lead-2", name: "Fernanda Costa", email: "fernanda@inovamkt.com", phone: "(21) 98888-5678",
    company: "InovaMKT", position: "Diretora de Marketing", stage: "em_atendimento", source: "google_maps", temperature: "quente",
    value: 28000, assignee: "Pedro Rocha", tags: ["Marketing", "Agência"], notes: "Quer demo esta semana",
    activities: [
      { id: "a2", type: "stage_change", description: "Movido para Contato", createdAt: "2026-03-12T14:00:00", createdBy: "Pedro Rocha" },
      { id: "a3", type: "call", description: "Ligação de 12 min - interessada em plano Pro", createdAt: "2026-03-12T15:00:00", createdBy: "Pedro Rocha" },
    ],
    createdAt: "2026-03-11T09:00:00", updatedAt: "2026-03-12T15:00:00",
  },
  {
    id: "lead-3", name: "Roberto Almeida", email: "roberto@construtora.com", phone: "(31) 97777-9012",
    company: "Construtora Almeida", position: "Gerente Comercial", stage: "qualificado", source: "whatsapp", temperature: "quente",
    value: 42000, assignee: "Ana Silva", tags: ["Construção", "Enterprise"], notes: "Budget aprovado, precisa de proposta",
    activities: [
      { id: "a4", type: "meeting", description: "Reunião de discovery - 45 min", createdAt: "2026-03-10T10:00:00", createdBy: "Ana Silva" },
    ],
    createdAt: "2026-03-08T08:00:00", updatedAt: "2026-03-10T10:00:00",
  },
  {
    id: "lead-4", name: "Juliana Pires", email: "juliana@logistica.com", phone: "(41) 96666-3456",
    company: "LogísticaPro", position: "COO", stage: "agendado", source: "linkedin", temperature: "quente",
    value: 65000, assignee: "Pedro Rocha", tags: ["Logística", "Enterprise"], notes: "Proposta enviada, aguardando retorno",
    activities: [
      { id: "a5", type: "email", description: "Proposta comercial enviada - R$ 65.000", createdAt: "2026-03-09T16:00:00", createdBy: "Pedro Rocha" },
    ],
    createdAt: "2026-03-05T11:00:00", updatedAt: "2026-03-09T16:00:00",
  },
  {
    id: "lead-5", name: "Marcos Silva", email: "marcos@fintech.io", phone: "(11) 95555-7890",
    company: "FinTech Solutions", position: "CTO", stage: "negociacao", source: "website", temperature: "quente",
    value: 95000, assignee: "Ana Silva", tags: ["Fintech", "API"], notes: "Negociando desconto anual",
    activities: [
      { id: "a6", type: "meeting", description: "Reunião de negociação - desconto 15%", createdAt: "2026-03-11T14:00:00", createdBy: "Ana Silva" },
    ],
    createdAt: "2026-03-01T09:00:00", updatedAt: "2026-03-11T14:00:00",
  },
  {
    id: "lead-6", name: "Patrícia Lopes", email: "patricia@varejo.com", phone: "(51) 94444-1234",
    company: "Varejo Express", position: "Diretora Comercial", stage: "ganho", source: "indicacao", temperature: "quente",
    value: 38000, assignee: "Pedro Rocha", tags: ["Varejo", "PME"], notes: "Contrato assinado!",
    activities: [
      { id: "a7", type: "stage_change", description: "Deal fechado! 🎉", createdAt: "2026-03-07T10:00:00", createdBy: "Pedro Rocha" },
    ],
    createdAt: "2026-02-20T08:00:00", updatedAt: "2026-03-07T10:00:00",
  },
  {
    id: "lead-7", name: "André Souza", email: "andre@startup.com", phone: "(11) 93333-5678",
    company: "StartupX", position: "Founder", stage: "perdido", source: "linkedin", temperature: "frio",
    value: 12000, assignee: "Ana Silva", tags: ["Startup", "Early-stage"], notes: "Sem budget no momento",
    lostReason: "Sem orçamento",
    activities: [
      { id: "a8", type: "stage_change", description: "Lead perdido - sem orçamento", createdAt: "2026-03-06T11:00:00", createdBy: "Ana Silva" },
    ],
    createdAt: "2026-02-25T09:00:00", updatedAt: "2026-03-06T11:00:00",
  },
  {
    id: "lead-8", name: "Luciana Martins", email: "luciana@educacao.com", phone: "(19) 92222-9012",
    company: "EduTech Brasil", position: "Head de Produto", stage: "lead", source: "google_maps", temperature: "frio",
    value: 20000, assignee: "Pedro Rocha", tags: ["EdTech", "B2B"], notes: "Capturado via Google Maps",
    activities: [
      { id: "a9", type: "note", description: "Lead capturado automaticamente via Google Maps", createdAt: "2026-03-14T08:00:00", createdBy: "Agente BDR" },
    ],
    createdAt: "2026-03-14T08:00:00", updatedAt: "2026-03-14T08:00:00",
  },
];
