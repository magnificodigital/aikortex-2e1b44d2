// Integrações típicas por nicho — usado pelo Modo Vibe (DESCOBERTA) pra
// perguntar sobre sistemas específicos do setor do agente.
//
// Lista CURADA: só #1 e #2 do mercado brasileiro por nicho. Critério:
// - API pública documentada (sem web automation hack)
// - Volume real de demanda em agências SMB
// - Cobre 80% do mercado com 20% do esforço de manutenção
//
// Status:
//   "available"   → já conecta via Composio
//   "in_progress" → em desenvolvimento
//   "planned"     → no roadmap, mencionar mas não prometer

export interface NicheIntegration {
  name: string;
  slug: string;
  category: "crm" | "ads" | "marketplace" | "agendamento" | "prontuario" | "erp" | "ensino" | "delivery" | "operacional";
  description: string;
  status: "planned" | "in_progress" | "available";
}

export const NICHE_INTEGRATIONS: Record<string, NicheIntegration[]> = {
  // ── Imobiliária ──
  "Imobiliária": [
    { name: "Vista CRM", slug: "vista_crm", category: "crm", description: "CRM imobiliário mais usado no Brasil", status: "planned" },
    { name: "Zap Imóveis", slug: "zap_imoveis", category: "marketplace", description: "Marketplace de imóveis #1 do Brasil — anúncios e leads", status: "planned" },
  ],

  // ── Advocacia ──
  "Advocacia": [
    { name: "Astrea", slug: "astrea", category: "operacional", description: "Software jurídico líder em escritórios SMB", status: "planned" },
    { name: "Projuris", slug: "projuris", category: "operacional", description: "Plataforma jurídica enterprise", status: "planned" },
  ],

  // ── Contabilidade ──
  "Contabilidade": [
    { name: "Conta Azul", slug: "conta_azul", category: "erp", description: "Gestão financeira pra pequenas empresas", status: "planned" },
    { name: "Domínio Sistemas", slug: "dominio_sistemas", category: "erp", description: "Sistema contábil/fiscal mais usado no Brasil", status: "planned" },
  ],

  // ── Saúde / Clínica médica ──
  "Saúde": [
    { name: "iClinic", slug: "iclinic", category: "prontuario", description: "Prontuário eletrônico e agendamento líder BR", status: "planned" },
    { name: "Doctoralia", slug: "doctoralia", category: "agendamento", description: "Marketplace + agendamento de consultas", status: "planned" },
  ],

  // ── Odontologia ──
  "Odontologia": [
    { name: "ClinicDent", slug: "clinicdent", category: "prontuario", description: "Gestão de clínica odontológica", status: "planned" },
  ],

  // ── Estética / Salão ──
  "Estética": [
    { name: "Belezix", slug: "belezix", category: "agendamento", description: "Agendamento líder pra estética e salão", status: "planned" },
  ],

  // ── E-commerce / Retail ──
  "Retail": [
    { name: "Shopify", slug: "shopify", category: "marketplace", description: "Plataforma de e-commerce global", status: "planned" },
    { name: "Nuvemshop", slug: "nuvemshop", category: "marketplace", description: "E-commerce pra pequenas lojas (líder SMB BR)", status: "planned" },
  ],

  // ── Food / Restaurante ──
  "Food": [
    { name: "iFood", slug: "ifood", category: "delivery", description: "Marketplace #1 de delivery", status: "planned" },
    { name: "Anota AI", slug: "anota_ai", category: "operacional", description: "Pedidos via WhatsApp pra restaurantes", status: "planned" },
  ],

  // ── Pet / Veterinária ──
  "Pet": [
    { name: "SimplesVet", slug: "simplesvet", category: "prontuario", description: "Gestão de clínica veterinária líder BR", status: "planned" },
  ],

  // ── Educação ──
  "Educação": [
    { name: "Hotmart", slug: "hotmart", category: "ensino", description: "Marketplace de cursos digitais #1 BR", status: "planned" },
    { name: "Sponte", slug: "sponte", category: "ensino", description: "Gestão de cursos e escolas BR", status: "planned" },
  ],

  // ── Seguros ──
  "Seguros": [
    { name: "Sigecorr", slug: "sigecorr", category: "operacional", description: "Sistema de corretora de seguros líder BR", status: "planned" },
  ],
};

/** CRMs/Marketing genéricos BR que servem múltiplos nichos.
 * São TOP 3 do mercado SMB brasileiro — cobrem maioria absoluta dos casos. */
export const GENERIC_CRMS_BR = [
  "HubSpot", "RD Station CRM", "Pipedrive",
];

/**
 * Formata bloco textual de integrações pra injetar no prompt do Vibe.
 * Quando o LLM detectar o nicho na DESCOBERTA, esse bloco já vem pronto.
 */
export function buildNicheIntegrationsBlock(niche: string | undefined): string {
  if (!niche) return "";
  const list = NICHE_INTEGRATIONS[niche];
  if (!list || list.length === 0) return "";

  const lines = list
    .map((i) => `- **${i.name}** — ${i.description}`)
    .join("\n");

  return `

# 🧠 INTEGRAÇÕES TÍPICAS DO NICHO "${niche}"

Esses são os 1-2 sistemas mais importantes desse setor no Brasil. Se for relevante pro propósito do agente, **pergunte ao user na fase DESCOBERTA** quais ele já usa. Multi-select:

${lines}

⚠️ Várias dessas integrações estão em **roadmap** (status "planned"). Se o user mencionar uma que não está disponível ainda, reconheça: "boa — vou registrar pra você no momento que disponibilizar. Por ora a gente conecta o que dá (HubSpot, Google Calendar, etc) e essa entra como prioridade no próximo sprint." NUNCA prometa que já está integrado se status ≠ "available".

⚠️ CRMs genéricos também são opção comum: ${GENERIC_CRMS_BR.join(", ")}.`;
}
