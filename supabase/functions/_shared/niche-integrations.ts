// Integrações típicas por nicho — usado pelo Modo Vibe (DESCOBERTA) pra
// perguntar sobre sistemas específicos do setor do agente.
//
// Aqui é apenas o CATÁLOGO. A implementação real (OAuth/API) será construída
// em Conectores → Catálogo conforme prioridade. Por ora servem como
// vocabulário do LLM pra fazer perguntas inteligentes.
//
// Quando o user mencionar um sistema dessa lista, o agente já pode "reconhecer"
// e prometer integração — mesmo que ainda esteja em roadmap. Tem-se assim
// expectativa correta sobre o produto.

export interface NicheIntegration {
  /** Nome humano apresentado ao user */
  name: string;
  /** slug snake_case pra referência interna */
  slug: string;
  /** Categoria — usado pro Vibe explicar pra que serve */
  category: "crm" | "ads" | "marketplace" | "agendamento" | "prontuario" | "erp" | "ensino" | "delivery" | "operacional";
  /** 1 linha curta do que faz nesse nicho */
  description: string;
  /** Roadmap atual da integração */
  status: "planned" | "in_progress" | "available";
}

export const NICHE_INTEGRATIONS: Record<string, NicheIntegration[]> = {
  // ── Imobiliária ──
  "Imobiliária": [
    { name: "Zap Imóveis", slug: "zap_imoveis", category: "marketplace", description: "Marketplace de imóveis #1 do Brasil — anúncios e leads", status: "planned" },
    { name: "Viva Real", slug: "viva_real", category: "marketplace", description: "Marketplace de imóveis — anúncios e contatos", status: "planned" },
    { name: "ImovelWeb", slug: "imovel_web", category: "marketplace", description: "Marketplace de imóveis", status: "planned" },
    { name: "QuintoAndar", slug: "quinto_andar", category: "marketplace", description: "Aluguel sem fiador — gestão de imóveis", status: "planned" },
    { name: "Loft", slug: "loft", category: "marketplace", description: "Plataforma de compra/venda de imóveis", status: "planned" },
    { name: "Vista Imóveis (CRM)", slug: "vista_imoveis", category: "crm", description: "CRM imobiliário mais usado no Brasil", status: "planned" },
    { name: "Tecimob (CRM)", slug: "tecimob", category: "crm", description: "Site + CRM pra imobiliárias", status: "planned" },
    { name: "Imobzi (CRM)", slug: "imobzi", category: "crm", description: "Gestão completa de imobiliária (CRM + financeiro)", status: "planned" },
    { name: "Inteligência360 / iGREEN", slug: "igreen", category: "crm", description: "CRM enterprise de imobiliárias", status: "planned" },
  ],

  // ── Advocacia ──
  "Advocacia": [
    { name: "Astrea", slug: "astrea", category: "operacional", description: "Software jurídico — gestão de processos e prazos", status: "planned" },
    { name: "Projuris", slug: "projuris", category: "operacional", description: "Plataforma jurídica enterprise", status: "planned" },
    { name: "CPJ-3C", slug: "cpj_3c", category: "operacional", description: "Controle de processos jurídicos", status: "planned" },
    { name: "ADVBox", slug: "advbox", category: "operacional", description: "Gestão escritório de advocacia", status: "planned" },
    { name: "1Doc", slug: "doc1", category: "operacional", description: "Petições e documentos jurídicos", status: "planned" },
    { name: "Voxlex", slug: "voxlex", category: "operacional", description: "Banco de dados jurisprudencial", status: "planned" },
  ],

  // ── Contabilidade ──
  "Contabilidade": [
    { name: "Domínio Sistemas", slug: "dominio_sistemas", category: "erp", description: "Sistema contábil/fiscal mais usado", status: "planned" },
    { name: "Sage", slug: "sage", category: "erp", description: "ERP contábil e fiscal", status: "planned" },
    { name: "Alterdata", slug: "alterdata", category: "erp", description: "Software contábil/fiscal e de pessoal", status: "planned" },
    { name: "Conta Azul", slug: "conta_azul", category: "erp", description: "Gestão financeira pra pequenas empresas", status: "available" },
    { name: "Omie", slug: "omie", category: "erp", description: "ERP em nuvem com contabilidade integrada", status: "planned" },
    { name: "QuickBooks", slug: "quickbooks", category: "erp", description: "Contabilidade internacional", status: "planned" },
  ],

  // ── Saúde / Clínica médica ──
  "Saúde": [
    { name: "iClinic", slug: "iclinic", category: "prontuario", description: "Prontuário eletrônico e agendamento", status: "planned" },
    { name: "Feegow", slug: "feegow", category: "prontuario", description: "Gestão de clínica + prontuário", status: "planned" },
    { name: "Amplimed", slug: "amplimed", category: "prontuario", description: "Prontuário eletrônico", status: "planned" },
    { name: "ClinicWeb", slug: "clinicweb", category: "prontuario", description: "Gestão de clínica", status: "planned" },
    { name: "Doctoralia", slug: "doctoralia", category: "agendamento", description: "Marketplace + agendamento de consultas", status: "planned" },
    { name: "Conexa Saúde", slug: "conexa_saude", category: "agendamento", description: "Telemedicina + agendamento", status: "planned" },
  ],

  // ── Odontologia ──
  "Odontologia": [
    { name: "ClinicDent", slug: "clinicdent", category: "prontuario", description: "Gestão de clínica odontológica", status: "planned" },
    { name: "Dental Office", slug: "dental_office", category: "prontuario", description: "Software odontológico", status: "planned" },
    { name: "Conexa Odonto", slug: "conexa_odonto", category: "agendamento", description: "Agendamento e prontuário", status: "planned" },
  ],

  // ── Estética / Salão ──
  "Estética": [
    { name: "Belezix", slug: "belezix", category: "agendamento", description: "Agendamento pra estética", status: "planned" },
    { name: "Tappi", slug: "tappi", category: "agendamento", description: "Gestão de salão/barbearia", status: "planned" },
    { name: "Tiny ERP", slug: "tiny_erp", category: "erp", description: "ERP com estoque pra estética", status: "planned" },
  ],

  // ── E-commerce / Retail ──
  "Retail": [
    { name: "Shopify", slug: "shopify", category: "marketplace", description: "Plataforma de e-commerce global", status: "planned" },
    { name: "VTEX", slug: "vtex", category: "marketplace", description: "Plataforma enterprise BR", status: "planned" },
    { name: "Nuvemshop", slug: "nuvemshop", category: "marketplace", description: "E-commerce pra pequenas lojas", status: "planned" },
    { name: "Tray", slug: "tray", category: "marketplace", description: "Plataforma de e-commerce BR", status: "planned" },
    { name: "WooCommerce", slug: "woocommerce", category: "marketplace", description: "E-commerce em WordPress", status: "planned" },
    { name: "Bling", slug: "bling", category: "erp", description: "ERP integrado com marketplaces", status: "planned" },
    { name: "Mercado Livre", slug: "mercado_livre", category: "marketplace", description: "Marketplace #1 da América Latina", status: "planned" },
    { name: "Shopee", slug: "shopee", category: "marketplace", description: "Marketplace de varejo", status: "planned" },
  ],

  // ── Food / Restaurante ──
  "Food": [
    { name: "iFood", slug: "ifood", category: "delivery", description: "Marketplace #1 de delivery", status: "planned" },
    { name: "Rappi", slug: "rappi", category: "delivery", description: "Delivery + serviços", status: "planned" },
    { name: "Anota AI", slug: "anota_ai", category: "operacional", description: "Pedidos via WhatsApp pra restaurantes", status: "planned" },
    { name: "ConsuMer", slug: "consumer", category: "operacional", description: "Gestão de restaurantes", status: "planned" },
  ],

  // ── Pet / Veterinária ──
  "Pet": [
    { name: "SimplesVet", slug: "simplesvet", category: "prontuario", description: "Gestão de clínica veterinária", status: "planned" },
    { name: "Vet Smart", slug: "vet_smart", category: "prontuario", description: "Software veterinário", status: "planned" },
    { name: "Provet", slug: "provet", category: "prontuario", description: "Gestão de clínica vet", status: "planned" },
    { name: "Anota AI (Pet)", slug: "anota_ai_pet", category: "operacional", description: "Atendimento via WhatsApp", status: "planned" },
  ],

  // ── Educação ──
  "Educação": [
    { name: "Moodle", slug: "moodle", category: "ensino", description: "Plataforma LMS open-source", status: "planned" },
    { name: "Canvas LMS", slug: "canvas", category: "ensino", description: "LMS internacional", status: "planned" },
    { name: "Sponte", slug: "sponte", category: "ensino", description: "Gestão de cursos e escolas BR", status: "planned" },
    { name: "ClassPro", slug: "classpro", category: "ensino", description: "Gestão escolar BR", status: "planned" },
    { name: "Eduzz", slug: "eduzz", category: "ensino", description: "Plataforma de cursos online", status: "planned" },
    { name: "Hotmart", slug: "hotmart", category: "ensino", description: "Marketplace de cursos digitais", status: "planned" },
  ],

  // ── SaaS ──
  "SaaS": [
    { name: "HubSpot", slug: "hubspot", category: "crm", description: "CRM completo + marketing", status: "available" },
    { name: "Pipedrive", slug: "pipedrive", category: "crm", description: "CRM focado em vendas B2B", status: "planned" },
    { name: "Intercom", slug: "intercom", category: "operacional", description: "Mensageria de produto", status: "planned" },
    { name: "Zendesk", slug: "zendesk", category: "operacional", description: "Suporte e tickets", status: "planned" },
    { name: "Stripe", slug: "stripe", category: "operacional", description: "Pagamentos recorrentes", status: "planned" },
  ],

  // ── Seguros ──
  "Seguros": [
    { name: "Sigecorr", slug: "sigecorr", category: "operacional", description: "Sistema de corretora de seguros", status: "planned" },
    { name: "Multcorr", slug: "multcorr", category: "operacional", description: "Gestão de corretora", status: "planned" },
    { name: "BPMS", slug: "bpms", category: "operacional", description: "Gestão de corretora", status: "planned" },
  ],
};

/** Lista CRMs/Marketing BR que servem múltiplos nichos */
export const GENERIC_CRMS_BR = [
  "HubSpot", "Pipedrive", "RD Station CRM", "RD Station Marketing",
  "PipeRun", "amoCRM", "Bitrix24", "Salesforce", "Ploomes",
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
    .slice(0, 8)
    .map((i) => `- **${i.name}** — ${i.description}`)
    .join("\n");

  return `

# 🧠 INTEGRAÇÕES TÍPICAS DO NICHO "${niche}"

Esses são os sistemas mais comuns nesse setor. Se for relevante pro propósito do agente, **pergunte ao user na fase DESCOBERTA** quais ele já usa. Não pergunte uma por uma — agrupe em multi-select.

${lines}

⚠️ Importante: várias dessas integrações estão em **roadmap** (status "planned"). Se o user mencionar uma que não está disponível ainda, reconheça que ela existe e diga: "boa — vou registrar pra você no momento que disponibilizar. Por ora a gente conecta o que dá (HubSpot, Google Calendar, etc) e essa entra como prioridade no próximo sprint." NUNCA prometa que já está integrado se status ≠ "available".

⚠️ CRMs genéricos também são opção comum: ${GENERIC_CRMS_BR.join(", ")}.`;
}
