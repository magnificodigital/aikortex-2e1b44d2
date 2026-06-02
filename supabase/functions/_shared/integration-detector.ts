// Detector pré-criação de integrações externas mencionadas pelo user.
// Inspirado no padrão Zaia Solutions Architect (§4.1 ANALISE_ZAIA_VIBE_AGENT):
// o agente DETECTA dependências técnicas faltantes ANTES de prometer entregar.

export interface IntegrationMention {
  key: string;        // chave canônica (ex: "google_calendar")
  label: string;      // nome user-visible (ex: "Google Calendar")
  provider: string;   // provider pra checar em user_api_keys
  configPath: string; // onde o user vai pra conectar
}

const INTEGRATION_PATTERNS: Array<{ regex: RegExp; integration: IntegrationMention }> = [
  {
    regex: /\b(google\s*(agenda|calendar|calend[áa]rio)|gcalendar)\b/i,
    integration: {
      key: "google_calendar",
      label: "Google Calendar",
      provider: "google_calendar",
      configPath: "Configurações → Integrações → Google Calendar",
    },
  },
  {
    regex: /\b(google\s*sheets?|planilhas?\s*do?\s*google)\b/i,
    integration: {
      key: "google_sheets",
      label: "Google Sheets",
      provider: "google_sheets",
      configPath: "Configurações → Integrações → Google Sheets",
    },
  },
  {
    regex: /\bgmail\b/i,
    integration: {
      key: "gmail",
      label: "Gmail",
      provider: "gmail",
      configPath: "Configurações → Integrações → Gmail",
    },
  },
  {
    regex: /\bgoogle\s*drive\b/i,
    integration: {
      key: "google_drive",
      label: "Google Drive",
      provider: "google_drive",
      configPath: "Configurações → Integrações → Google Drive",
    },
  },
  {
    regex: /\boutlook\s*(calendar|calend[áa]rio)?\b/i,
    integration: {
      key: "outlook_calendar",
      label: "Outlook Calendar",
      provider: "outlook_calendar",
      configPath: "Configurações → Integrações → Outlook",
    },
  },
  {
    regex: /\bcalendly\b/i,
    integration: {
      key: "calendly",
      label: "Calendly",
      provider: "calendly",
      configPath: "Configurações → Integrações → Calendly",
    },
  },
  {
    regex: /\bhubspot\b/i,
    integration: {
      key: "hubspot",
      label: "HubSpot",
      provider: "hubspot",
      configPath: "Configurações → Integrações → HubSpot",
    },
  },
  {
    regex: /\bpiperun\b/i,
    integration: {
      key: "piperun",
      label: "PipeRun",
      provider: "piperun",
      configPath: "Configurações → Integrações → PipeRun",
    },
  },
  {
    regex: /\brd\s*station\b/i,
    integration: {
      key: "rd_station",
      label: "RD Station",
      provider: "rd_station",
      configPath: "Configurações → Integrações → RD Station",
    },
  },
  {
    regex: /\bnotion\b/i,
    integration: {
      key: "notion",
      label: "Notion",
      provider: "notion",
      configPath: "Configurações → Integrações → Notion",
    },
  },
  {
    regex: /\bslack\b/i,
    integration: {
      key: "slack",
      label: "Slack",
      provider: "slack",
      configPath: "Configurações → Integrações → Slack",
    },
  },
];

export function detectIntegrationsInText(text: string): IntegrationMention[] {
  if (!text) return [];
  const found = new Map<string, IntegrationMention>();
  for (const { regex, integration } of INTEGRATION_PATTERNS) {
    if (regex.test(text)) {
      found.set(integration.key, integration);
    }
  }
  return Array.from(found.values());
}

export interface IntegrationStatus extends IntegrationMention {
  connected: boolean;
}

/** Consulta user_api_keys pra cada integração mencionada — retorna estado real. */
export async function getIntegrationStatuses(
  supabaseAdmin: any,
  userId: string,
  integrations: IntegrationMention[],
): Promise<IntegrationStatus[]> {
  if (integrations.length === 0) return [];
  const providers = integrations.map((i) => i.provider);
  const { data: keys } = await supabaseAdmin
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", userId)
    .in("provider", providers);
  const connectedSet = new Set<string>(
    (keys ?? []).filter((k: any) => !!k.api_key).map((k: any) => k.provider),
  );
  return integrations.map((i) => ({ ...i, connected: connectedSet.has(i.provider) }));
}

/** Bloco textual pra injetar no system prompt do wizard com o status real. */
export function buildIntegrationStatusBlock(statuses: IntegrationStatus[]): string {
  if (statuses.length === 0) return "";
  const lines = statuses.map((s) => {
    const dot = s.connected ? "🟢" : "🔴";
    const label = s.connected ? "JÁ CONECTADO" : "NÃO CONECTADO (requer OAuth)";
    return `- ${dot} **${s.label}**: ${label}${!s.connected ? ` — conectar em: ${s.configPath}` : ""}`;
  });
  const hasBlockers = statuses.some((s) => !s.connected);
  return `
# 🚦 STATUS DE INTEGRAÇÕES DETECTADAS NA DESCRIÇÃO

O user mencionou as seguintes integrações externas:

${lines.join("\n")}

${hasBlockers ? `## ⚠️ HÁ BLOQUEADORES (integrações NÃO CONECTADAS)

VOCÊ NÃO PODE CHAMAR commit_draft AGORA. O agente depende dessas integrações pra funcionar de verdade. SUA RESPOSTA DEVE:

1. NÃO chamar nenhuma tool de configuração (set_*, request_external_integration, commit_draft).
2. APONTAR o(s) bloqueador(es) ao user — seja específico sobre QUAL integração e POR QUE é crítica.
3. PERGUNTAR claramente: "Você consegue conectar agora? Quando estiver conectado, me responda 'pronto' que eu continuo. Se preferir continuar mesmo sem a integração (o agente vai funcionar parcialmente), responda 'continua'."

Exemplo de resposta correta (com botão OAuth INLINE):
> "Antes de criar o agente, preciso confirmar: você quer que ele agende no **Google Calendar**, mas a conexão com o Google ainda não foi feita.
>
> Sem isso, o agente vai conseguir COLETAR a preferência de horário do paciente mas NÃO consegue criar o evento no calendário real.
>
> Clique abaixo pra conectar agora — vai abrir uma janela do Google. Quando autorizar, eu continuo a criação automaticamente.
>
> <!--oauth:google_calendar-->
>
> Ou, se preferir continuar mesmo sem conectar, me responda 'continua' e eu crio o agente marcando que a integração precisa ser conectada depois."

⚠️ MUITO IMPORTANTE — para CADA integração NÃO conectada que tem botão inline (google_calendar, google_sheets, google_drive, gmail, hubspot, calendly, notion, slack), INCLUA o marker:
\`<!--oauth:google_calendar-->\` (ou o key correspondente)

O frontend renderiza esse marker como BOTÃO clicável "Conectar Google Calendar" (ou equivalente). Sem o marker, o user não tem como conectar inline. Todas as conexões agora passam por Composio (OAuth gerenciado).

Pra integrações ainda sem botão inline (PipeRun, RD Station, outlook_calendar), apenas mencione o caminho de Configurações → Integrações.

NÃO crie o agente. NÃO chame tools de mutação. SÓ responda com o questionamento + marker(s) OAuth quando aplicável.` : `## ✅ Todas as integrações mencionadas estão CONECTADAS

Pode prosseguir com a criação do agente normalmente. As tools de request_external_integration vão retornar info positivo (conectado).`}
`;
}
