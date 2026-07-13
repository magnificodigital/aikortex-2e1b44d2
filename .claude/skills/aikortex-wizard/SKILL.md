---
name: aikortex-wizard
description: Wizard AI prompt spec for Aikortex — defines question sequences by agent type (SAC, SDR, Custom, Marketing), conversation rules, state machine (discover/structure/build/done), persistence keys, navigation flow, and what agent-structure needs to generate a high-quality config. Use when designing, adjusting, or debugging the wizard interview flow within the Aikortex product.
compatibility: Claude Code. Reference only — no CLI tools required.
metadata:
  author: magnificodigital
  version: "2.0"
  master_version: "v7.4"
  last_updated: "2026-05-13"
---

# Aikortex Wizard — Prompt Spec

O wizard é a entrevista guiada que coleta informações do usuário para configurar um agente de IA. A IA faz perguntas sequenciais, o usuário responde em linguagem natural, e ao final o `agent-structure` transforma a transcrição em configuração estruturada do agente.

Master v7.4 §13.2 define o wizard como **Modo Vibe (padrão)** — fluxo conversacional para iniciantes. Master §13.4 define o ciclo "Descrever → Personalizar → Criar".

---

## State Machine

Estado interno em `AgentDetail.tsx`:

```ts
type WizardStep = "discover" | "structure" | "build" | "done";
type ChatMode = "setup" | "test";
```

Transições:

```
discover (Etapa 1)
  ↓ usuário responde N perguntas (N >= WIZARD_MIN_QUESTIONS[agentType])
  ↓ IA emite frase de encerramento
structure (Etapa 2 — "Estruturando com IA...")
  ↓ frontend chama edge function `agent-structure`
  ↓ recebe { structuredConfig }
build (Etapa 3 — "Construindo agente...")
  ↓ INSERT em user_agents com config completa
  ↓ navigate(`/aikortex/agents/<uuid-real>`, { replace: true })
done (Etapa final — "Agente pronto! 🎉")
  ↓ botão "Testar agente agora"
```

### Inicialização correta de wizardStep

```ts
const isFreshNew = !isTemplate && (!agentId || agentId === "new" || agentId.startsWith("new-"));

const [wizardStep, setWizardStep] = useState(() => {
  if (isTemplate || isNewCustomFromHome || isFreshNew) return "discover";
  return "done";  // agente já existe e foi publicado
});
```

**Cuidado:** versões antigas tinham bug que caía em `"done"` quando `+ Novo Agente` não passava `initialPrompt` no navState. Hotfix 1.1.7 corrigiu adicionando `isFreshNew`.

### Inicialização correta do nome

```ts
const [loadedAgent, setLoadedAgent] = useState({
  name: isFreshNew ? "Novo Agente" : "Carregando...",
  // outros campos...
});
```

`"Carregando..."` deve aparecer **apenas** enquanto `agentLoading === true` para `id` real (UUID). Para `isFreshNew`, default é `"Novo Agente"`.

---

## Persistência do Chat

O `useAgentChat` usa `persistKey` baseado no `agentId` para sobreviver navegação:

```ts
const wizardChat = useAgentChat(initialMessages, {
  useGateway: true,
  gatewayModel: setupModel,
  systemPrompt: wizardSystemPrompt,
  persistKey: `wizard-chat-${agentId}`,
  mode: "wizard-setup",                    // ⚠️ não confundir com "agent-chat"
  agentType: wizardAgentTypeKey,
  disableCrmExtraction: true,
});
```

### Migração de persistKey após criação

Quando agente passa de `new-<timestamp>` para `<uuid-real>` (Sprint 1.3 fix), migrar localStorage:

```ts
useEffect(() => {
  if (previousAgentId?.startsWith("new-") && currentAgentId && !currentAgentId.startsWith("new-")) {
    const oldKey = `wizard-chat-${previousAgentId}`;
    const newKey = `wizard-chat-${currentAgentId}`;
    const stored = localStorage.getItem(oldKey);
    if (stored) {
      localStorage.setItem(newKey, stored);
      localStorage.removeItem(oldKey);
    }
  }
}, [currentAgentId, previousAgentId]);
```

Sem essa migração, histórico do wizard "some" após criação.

---

## Regras Universais do System Prompt

```
REGRAS OBRIGATÓRIAS:
- Faça EXATAMENTE UMA pergunta por resposta (máximo 2 linhas)
- Converse naturalmente em português brasileiro; NÃO mostre listas ou numerações
- NUNCA gere blocos de configuração, JSON, YAML, markdown técnico ou resumos
- NUNCA use blocos de código (``` ou similar)
- Não resuma o que o usuário disse; apenas confirme brevemente e passe para a próxima pergunta
- Após coletar TODAS as informações necessárias, diga EXATAMENTE esta frase e mais nada:
  "Perfeito! Vou configurar seu agente agora."
```

---

## Sequências de Perguntas por Tipo

Estas são **referências orientativas** — wizard pode adaptar conforme contexto. Threshold de perguntas mínimas em `WIZARD_MIN_QUESTIONS`.

### SAC — Suporte ao Cliente (mínimo 4 perguntas)

**Threshold:** `WIZARD_MIN_QUESTIONS.sac = 4`

| # | O que coletar | Exemplo de pergunta |
|---|--------------|---------------------|
| 1 | Empresa + produto/serviço | "Qual é o nome da sua empresa e o que ela oferece?" |
| 2 | Principais dúvidas e problemas dos clientes | "Quais são as dúvidas e problemas mais comuns que seus clientes trazem?" |
| 3 | Tom de voz desejado | "Como você quer que o agente se comunique — mais formal, descontraído, empático?" |
| 4 | Escalação e encaminhamentos | "Quando o agente não souber responder, para onde ele deve encaminhar o cliente?" |

### SDR — Prospecção e Qualificação (mínimo 6 perguntas)

**Threshold:** `WIZARD_MIN_QUESTIONS.sdr = 6`

| # | O que coletar | Exemplo de pergunta |
|---|--------------|---------------------|
| 1 | Empresa + produto/serviço + mercado | "Me fale sobre sua empresa: o que você vende e para quem?" |
| 2 | Perfil do cliente ideal (ICP) | "Como é o cliente ideal — segmento, cargo, tamanho de empresa?" |
| 3 | Tom de voz e abordagem | "O agente deve ser mais consultivo e formal, ou direto e descontraído?" |
| 4 | Critério de qualificação | "O que faz um lead valer a pena? Quais perguntas definem se ele é qualificado?" |
| 5 | Critério de desqualificação | "Quais sinais indicam que o lead não é o perfil certo?" |
| 6 | Próximo passo após qualificação | "Quando o lead é qualificado, qual é a ação seguinte — agendar reunião, enviar proposta?" |

### Marketing — Conteúdo e Engajamento (mínimo 4 perguntas)

**Threshold:** `WIZARD_MIN_QUESTIONS.marketing = 4`

| # | O que coletar |
|---|--------------|
| 1 | Marca + produto + público |
| 2 | Objetivo da interação |
| 3 | Tom e personalidade da marca |
| 4 | Conversão desejada |

### Custom — Agente Personalizado (mínimo 4 perguntas)

**Threshold:** `WIZARD_MIN_QUESTIONS.custom = 4`

| # | O que coletar |
|---|--------------|
| 1 | Contexto e propósito |
| 2 | Público que vai interagir |
| 3 | Tom de voz |
| 4 | Restrições e limites |

---

## System Prompt Template

```ts
const wizardSystemPrompt = (agentType: string, minQ: number) => `
Você é um assistente de configuração da plataforma Aikortex.
Seu objetivo é entrevistar o usuário para configurar um agente de IA do tipo "${agentType}".

REGRAS OBRIGATÓRIAS:
- Faça EXATAMENTE UMA pergunta por resposta (máximo 2 linhas)
- Converse naturalmente em português brasileiro
- NÃO mostre listas, numerações, blocos de código ou markdown técnico
- NUNCA gere blocos de configuração, JSON, YAML ou resumos técnicos
- Após coletar todas as informações necessárias (mínimo ${minQ} respostas do usuário), diga EXATAMENTE:
  "Perfeito! Vou configurar seu agente agora."

Comece cumprimentando brevemente e fazendo a primeira pergunta.
`.trim();
```

---

## Triggers de Auto-Build

O sistema detecta o encerramento por qualquer um destes (ordem de prioridade):

```ts
// Trigger 1 — frase exata (mais confiável)
lastAgentMsg.text.includes("Vou configurar seu agente agora")

// Trigger 2 — bloco markdown (fallback)
lastAgentMsg.text.includes("```agent-config")

// Trigger 3 — config plain-text (fallback secundário)
lastAgentMsg.text.includes("agent_name:") &&
  (lastAgentMsg.text.includes("tone:") || lastAgentMsg.text.includes("objective:"))

// Guard: só dispara após contagem mínima
const userMsgCount = wizardMessages.filter(m => m.role === "user").length;
if (userMsgCount >= WIZARD_MIN_QUESTIONS[agentType]) { /* auto-build */ }
```

---

## Fluxo Auto-Build → Estruturar → Criar

```ts
// 1. wizardStep transita: discover → structure
setWizardStep("structure");

// 2. Concatena transcrição
const transcript = wizardMessages.map(m => `${m.role}: ${m.text}`).join("\n");

// 3. Chama agent-structure
const result = await fetch(fnUrl("agent-structure"), {
  method: "POST",
  headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    description: transcript,
    agent_type: agentType,
    language: "pt-BR",
  }),
});

// 4. wizardStep: structure → build
setWizardStep("build");

// 5. INSERT em user_agents com config completa
const { data: newAgent } = await supabase
  .from("user_agents")
  .insert({
    name: structuredConfig.agent_name,
    config: structuredConfig,
    status: "configuring",
    user_id: userId,
    client_id: activeClientId,  // pode ser null se em Meu Workspace
    provider: "openrouter",      // ⚠️ trigger DB whitelist; ver Dívidas
  })
  .select()
  .single();

// 6. CRÍTICO — navegar para UUID real com replace, migrar persistKey
if (newAgent) {
  // Migra histórico de chat
  const oldKey = `wizard-chat-${agentId}`;
  const newKey = `wizard-chat-${newAgent.id}`;
  const stored = localStorage.getItem(oldKey);
  if (stored) {
    localStorage.setItem(newKey, stored);
    localStorage.removeItem(oldKey);
  }

  // Atualiza state local
  setLoadedAgent(newAgent);
  setWizardStep("done");

  // Navega com replace para não criar entrada extra no history
  navigate(`/aikortex/agents/${newAgent.id}`, { replace: true });
}
```

---

## Modelo LLM do Wizard

**NUNCA hardcodar modelo.** Wizard usa `app-chat` que chama `callLLM` do helper, que lê de `available_llms`.

- `mode: "wizard-setup"` é tratado igual a `"agent-chat"` no backend (mesma branch em `app-chat`), mas o frontend marca diferente para tracking semântico.
- O `gatewayModel` no `useAgentChat` é hint de preferência — se modelo não estiver healthy em `available_llms`, helper escolhe outro.

---

## Mensagem Pós-Criação

Após salvar o agente e navegar:

```
✅ Seu agente foi criado com sucesso!

Você pode agora:
• Adicionar arquivos de conhecimento (PDFs, documentos)
• Conectar integrações (WhatsApp, site, CRM)
• Ajustar o tom, modelo de IA e instruções
• Testar o agente diretamente nesta tela
```

Renderizada quando `wizardStep === "done"`.

---

## O que agent-structure precisa para gerar boa config

| Campo | Derivado de |
|-------|------------|
| `agent_name` | Empresa + tipo de agente (ex: "Sofia • SDR Imobiliária") |
| `agent_type` | Passado como parâmetro (`sac`, `sdr`, `custom`, `marketing`) |
| `description` | Resumo 1 frase do papel do agente |
| `objective` | O que o agente faz e para quem |
| `tone` | Tom de voz coletado na entrevista |
| `greeting_message` | Abertura natural em PT-BR (máx 2 linhas) |
| `instructions` | Prompt operacional completo em markdown (8 seções) |
| `channels` | Inferido do contexto (`["whatsapp", "web"]`) |
| `language` | Sempre `"pt-BR"` |
| `capabilities` | Defaults: planning OFF, reasoning OFF, memory OFF (configurar depois) |
| `provider` | `"openrouter"` ou `"gemini"` (whitelist do trigger DB — ver Dívidas) |

---

## Bugs conhecidos (mantidos como referência)

### Histórico do wizard some após criação
Resolvido por Sprint 1.3 — migração de persistKey ao navegar de `new-*` para uuid real.

### Tom de voz não persiste
Auto-save pode ignorar campos não-whitelist. Tom de voz deve ser **Combobox** (opções sugeridas + texto livre), não Select fechado. Sprint 1.3 endereça.

### Provider="google" rejeitado pelo trigger DB
Trigger `validate_user_agent_provider` tem whitelist obsoleta. Hotfix 1.1.7 força `provider="gemini"` ou `"openrouter"`. Migration para atualizar whitelist é dívida do Sprint Zero.

### URL relativa quebrando edge function
**NUNCA** chamar `agent-structure` (ou qualquer edge function) com URL relativa. Sempre `fnUrl("agent-structure")` do helper `@/lib/supabase-url`.

---

## Constraints

- **NUNCA** mostrar blocos de config ao usuário durante o wizard
- **NUNCA** usar Lovable Gateway — wizard usa `app-chat` → `callLLM` → OpenRouter
- O wizard encerra com frase exata — qualquer variação quebra a detecção
- Persistência via `persistKey` em localStorage — migrar key ao mudar de `new-*` para uuid
- Modo `"wizard-setup"` no body do `app-chat` (não `"agent-chat"`)
- INSERT em `user_agents` apenas no fim (Etapa 3 — Construir), nunca no clique de "+ Novo Agente"
- `navigate(..., { replace: true })` após criação para não poluir history
- Frontend força `provider: "openrouter"` ou `"gemini"` até trigger DB ser atualizado
