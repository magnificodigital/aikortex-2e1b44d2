---
name: aikortex-dev
description: Development assistant for Aikortex — a SaaS whitelabel platform for AI agencies. Use this skill for any task involving Aikortex features, bugs, edge functions, database migrations, wizard flow, OpenRouter integration, Lovable deployment, or agent configuration. Activate whenever the user mentions Aikortex, sac-1, wizard, app-chat, agent-structure, agent-tools, llm-fallback, available_llms, agent_versions, or any Supabase edge function in this project.
compatibility: Claude Code. Requires supabase CLI and git installed.
metadata:
  author: magnificodigital
  version: "2.0"
  master_version: "v7.4"
  last_updated: "2026-05-13"
---

# Aikortex Dev Skill

## Projeto

**Aikortex** é um SaaS whitelabel para agências brasileiras de IA (MASTER **v7.4**). Plataforma onde agências configuram, vendem e gerem agentes de IA e apps para seus clientes finais — com gestão completa do próprio negócio integrada.

**Dois pilares comerciais (v7.4):** Agentes + Apps. Flows foi descartado como pilar — virou capacidade interna (React Flow só na tab "Avançado" do agente).

**CRÍTICO:** Aikortex e Sancet são produtos **completamente separados**. Nunca misturar código, schema, prompts, Supabase ou contexto entre os dois.

---

## Caminhos Oficiais (NUNCA usar outros)

| Item | Valor |
|------|-------|
| **Repositório** | `https://github.com/magnificodigital/aikortex-2e1b44d2` branch `main` |
| **Local** | `/Users/macbookair/aikortex-2e1b44d2` |
| **Supabase** | `https://jcahtniqqiaefszhgpqx.supabase.co` (project-ref: `jcahtniqqiaefszhgpqx`) |
| **App** | `https://agents.aikortex.com` |
| **DeerFlow GitHub** | `https://github.com/magnificodigital/aikortex-flow` |
| **DeerFlow Deploy** | Railway |
| **Lovable project** | "Aikortex" (plano Free) |

> ⚠️ `aikortex-01` e `aikortex-v3` são repositórios antigos/errados. NUNCA trabalhar neles.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite (SWC) + TailwindCSS + shadcn/ui + @xyflow/react |
| State | React Context (`WorkspaceContext`) + React Query |
| Deploy frontend | Lovable.dev → GitHub (`main`) → CDN automático |
| Backend | Supabase Edge Functions (Deno) |
| Banco | Supabase PostgreSQL (`jcahtniqqiaefszhgpqx`) |
| AI texto | OpenRouter via `_shared/llm-fallback.ts` helper (modelos dinâmicos de `available_llms`) |
| AI imagem | OpenRouter (`google/gemini-2.5-flash-image` default) |
| AI busca web | Brave Search API |
| Vector | pgvector (Sprint 2.5 em diante) |
| Flows interno | DeerFlow (Railway) via `deerflow-proxy` |
| Voz | LiveKit + ElevenLabs (Telnyx fora) |
| Pagamentos | Asaas |
| WhatsApp | Meta Cloud API oficial |
| Build/Test | Bun + Vitest |

---

## Fluxo de Deploy

### Frontend
O usuário **não executa git manualmente**. O Lovable sincroniza automaticamente com GitHub. Para deployar mudanças frontend:
1. Editar arquivos locais com Claude Code em `/Users/macbookair/aikortex-2e1b44d2`
2. `git add` + `git commit` + `git push origin main`
3. Lovable detecta o push e reconstrói automaticamente (~2-3 min)
4. Usuário faz hard refresh (Cmd+Shift+R) para carregar novo bundle

### Edge Functions
Lovable **não** deploya edge functions. Sempre usar:
```bash
supabase functions deploy <nome-da-function> --project-ref jcahtniqqiaefszhgpqx
```

Helpers em `_shared/` são bundled automaticamente nas funções que importam.

---

## Supabase — Estado atual (2026-05-13)

- **Project ref:** `jcahtniqqiaefszhgpqx`
- **62+ migrations**, 40+ tabelas, RLS em todas
- **32 edge functions** (Bloco 1.1 estabilização concluído)

### Tabelas-core ativas
- `user_agents` (com `published_version_id`, `draft_updated_at`, `config jsonb`)
- `agent_versions` (Sprint 2.2 — snapshots imutáveis exceto label/notes)
- `agent_tools` (Sprint 2.4-a — fundação de tools por agente)
- `agent_knowledge_bases` + `kb_documents` + `kb_chunks` (Sprint 2.5-a — pgvector). **Convenção real do schema:** FK chama `knowledge_base_id` (não `kb_id`) em `kb_documents` e `kb_chunks`. Payload externo de APIs usa `kb_id` por simplicidade, edge functions mapeiam. `kb_documents` não tem `raw_size_bytes` — usar `metadata.raw_chars`. Embeddings inseridos via supabase-js como string `"[v1,v2,...]"` (formato pgvector). Auth context: `auth.user.id` (não `auth.userId`)
- `available_llms` (Bloco 1.1 — fonte única de modelos LLM)
- `agency_monthly_usage` (quota por tier; coluna `year_month text`)
- `niche_categories` (Sprint 1 — galeria por nicho)
- `platform_templates` (com `niche_id`; campo `is_active` não `active`)
- `agency_profiles`, `agency_clients`, `agency_members`
- `conversations` + `messages` (Master v7.4 §17 — coluna `direction` distingue agency_inbound vs client_to_consumer)
- `agency_template_subscriptions`, `tier_module_access`

---

## Edge Functions Críticas

### Helpers compartilhados (`_shared/`)
| Helper | Papel |
|--------|-------|
| `_shared/llm-fallback.ts` | **OBRIGATÓRIO para qualquer chamada LLM.** Função `callLLM(messages, options)` que lê de `available_llms` e tenta modelos em ordem de prioridade com fallback automático |
| `_shared/agent-runtime.ts` | `overlayPublishedConfig` (Sprint 2.2 — snapshot publicado vs config raw) + `applyCapabilityAddons` (Sprint 2.3 — Planning/Reasoning system prompts) |
| `_shared/agent-tools.ts` | `runAgentLLM` (Sprint 2.4-a — function calling com tool dispatch) |
| `_shared/auth.ts` | `getAuthContext` (JWT validation server-side) |
| `_shared/rate-limit.ts` | `checkRateLimit` (fail-open em erro) |

### Funções de runtime de agente
| Function | Papel |
|----------|-------|
| `app-chat` | Endpoint principal de chat AI (Master §27 #10). Mode `wizard-setup` ou `agent-chat`. Streaming SSE via `callLLM` |
| `agent-structure` | Converte transcrição do wizard em config estruturada do agente |
| `telnyx-webhook` | Atendimento de voz via LiveKit (3-4 pontos lendo `user_agents.config`) |
| `whatsapp-webhook` | Recebe mensagens WhatsApp via Meta Cloud API |
| `batch-broadcast` | Envio em lote para múltiplos contatos |
| `livekit-call` | Sala de chamada |
| `deerflow-proxy` | Proxy para DeerFlow no Railway (tier paid via `callLLM`) |

### Funções de tools (Sprint 2.4-a)
| Function | Papel |
|----------|-------|
| `tool-web-search` | Busca web via Brave Search; quota por tier em `agency_monthly_usage.web_searches_used` |
| `tool-image-gen` | Geração de imagem via OpenRouter `google/gemini-2.5-flash-image`; quota em `images_generated_used` |
| `healthcheck-llm-models` | Atualiza `available_llms.status` (manual ou cron) |

### Funções administrativas
- `admin-users`, `admin-get-users`, `create-user`, `update-user-*`, `delete-user`, `list-users`
- `asaas-webhook`, `asaas-create-client`, `asaas-setup`, `asaas-subscribe-template`
- `meeting-translate`, `elevenlabs-voice-session`, `browser-tts`
- `sync-memory-store` (legado Anthropic — será descartado no Sprint 2.5 com migração para pgvector)

---

## Padrões obrigatórios em edge functions

### Headers OpenRouter (no helper `callLLM`, não inline)
```ts
"HTTP-Referer": "https://agents.aikortex.com"
"X-Title": "Aikortex"
```

### Chamadas LLM — SEMPRE via helper
```ts
import { callLLM } from "../_shared/llm-fallback.ts";

const result = await callLLM(messages, {
  tier: 'free',                       // ou 'paid'
  preferredModel: undefined,          // ou modelo específico
  stream: false,                      // true para SSE
  toolsRequired: false,               // true se precisa supports_tools
  maxTokens: 2048,
  timeoutMs: 15000,
}, supabaseAdminClient);

if (!result.success) {
  // Trata erro
}
```

**NUNCA hardcodar arrays de modelos.** Bloco 1.1 corrigiu 9 edge functions e removeu 5 conjuntos hardcoded. Toda nova edge function que chamar LLM DEVE usar `callLLM`.

### Runtime do agente — overlay de versão publicada
```ts
import { overlayPublishedConfig } from "../_shared/agent-runtime.ts";

const agent = await overlayPublishedConfig(supabase, agentId);
// agent.config agora reflete snapshot publicado (com fallback para config raw se nunca publicado)
```

### Streaming SSE
```ts
const { readable, writable } = new TransformStream();
orResp.body.pipeTo(writable).catch(() => {});
return new Response(readable, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  }
});
```

---

## Padrões obrigatórios no frontend

### URLs de Edge Functions
**NUNCA usar URL relativa.** `import.meta.env.VITE_SUPABASE_URL` pode ser `undefined` no preview do Lovable, causando bug crítico (URL vira `undefined/functions/v1/...` → SPA fallback HTML, edge function nunca invocada).

Usar **sempre** o helper:
```ts
import { fnUrl } from "@/lib/supabase-url";

const url = fnUrl("app-chat");
await fetch(url, { ... });
```

### State global de cliente ativo
`WorkspaceContext` é o store oficial. Chave localStorage: `aikortex_active_workspace`. Hook canônico:

```ts
import { useActiveClient } from "@/hooks/use-active-client";

const { activeClientId, activeClient, isAgencyMode, setActiveClientId } = useActiveClient();

// isAgencyMode = true → "Meu Workspace" (visão consolidada de todos clientes da agência)
// isAgencyMode = false → workspace do cliente X (filtra por client_id)
```

### Convenção de rotas
Em inglês: `/aikortex/agents`, `/aikortex/apps`, `/aikortex/messages`. Labels do menu em pt-BR. NÃO criar rotas em português.

### Listagem filtrada por cliente ativo
```ts
const { activeClientId, isAgencyMode } = useActiveClient();
let query = supabase.from('user_agents').select('*');
if (!isAgencyMode) {
  query = query.eq('client_id', activeClientId);
}
// Em modo agência: sem filtro, RLS já garante escopo (cuidado com user_id vs agency_id — ver Dívidas)
```

---

## Modelo de Workspaces (decisão definitiva)

Modelo Vercel/Linear, **NÃO** Slack:

| Modo | Estado | UI |
|------|--------|-----|
| **Meu Workspace** | `isAgencyMode = true`, `activeClientId = null` | Agência opera própria (CRM, financeiro, tarefas, mensagens com clientes diretos) |
| **Workspace do Cliente X** | `isAgencyMode = false`, `activeClientId = X` | Agência opera dentro do cliente (agentes, apps, mensagens cliente↔consumidor) |

Switcher fica **no sidebar abaixo do logo Aikortex**, NÃO no header. Menu lateral é **sempre o mesmo**, switcher filtra dados.

**Cliente final** (login direto, role distinta): vê apenas o workspace dele, sem switcher, menu restrito conforme matriz de permissões — feature de sprint dedicado, não implementada.

---

## Modelo de Negócio — Tiers

### Master v7.4 (Start / Hack / Growth)
| Tier | Mensalidade | Split Aikortex | Split Agência | Quota IA |
|------|-------------|----------------|---------------|----------|
| Start | Gratuito | 60% | 40% | 100 msg/mês |
| Hack | R$197/mês | 50% | 50% | 1.000 msg/mês |
| Growth | R$397/mês | 40% | 60% | 5.000 msg/mês |

### ⚠️ Banco real (starter / explorer / hack) — colisão semântica
Banco usa nomes diferentes E `hack` tem semântica **invertida**:
- Banco `starter` ≈ Master `Start`
- Banco `explorer` ≈ Master `Hack` (intermediário) — uso real em 14 linhas de `tier_module_access`, 25+ arquivos
- Banco `hack` ≈ Master `Growth` (topo) — usuário real ativo

**Rename é decisão de produto** (reatribuição de privilégios), não migração técnica. Fica para sprint dedicado de Fase B.

**Todo código novo usa `starter | explorer | hack`** até o rename.

---

## Sprint Progress (2026-05-13)

### ✅ Fase A — Segurança (concluída)
SAN-1, SAN-2, SAN-3, rate limiting, `.env.example`, hotfix webhooks

### ✅ Sprint 1 — Galeria + Workspace (concluído)
- Tabela `niche_categories` + `niche_id` em `platform_templates`
- 3 nichos: Saúde, Corretoras de Seguros e Consórcios, Imobiliário
- WorkspaceSwitcher (modelo Vercel/Linear)
- Componentes em `src/components/templates/`: NicheFilterBar, TemplateCard, TemplateGrid, UseTemplateDialog
- Admin UI `/admin?tab=niches` para categorização
- Modelo de workspaces Meu/Cliente definitivo

### ✅ Sprint 2.1 — Refactor split-screen (concluído)
`AgentDetail.tsx` com chat 40% / config 60% persistente. Sidenav hierárquico com 6 grupos: Configuração / Capacidades / Recursos / Comportamento / Operação / Sistema. VoiceCallPanel como overlay sob demanda.

### ✅ Sprint 2.2 — Versões + Publish real (concluído)
- Tabela `agent_versions` com snapshot imutável (RPC `publish_agent_version`)
- Colunas em `user_agents`: `published_version_id`, `draft_updated_at`
- Helper `overlayPublishedConfig` aplicado em 5 call sites de runtime
- Lib `deep-object-diff` para diff visual

### ✅ Sprint 2.3 — Capacidades (concluído)
- `user_agents.config.capabilities` jsonb com Planning, Reasoning, Memória, Code Runtime (placeholder), Auto-integração (placeholder)
- Helper `applyCapabilityAddons` injeta system prompt em 4 call sites de chat

### ✅ Sprint 2.4-a — Tools fundação (concluído)
- Tabela `agent_tools`
- Edge functions `tool-web-search` (Brave) + `tool-image-gen` (Nano Banana)
- Function calling via `runAgentLLM` no helper
- Quota enforcement: starter 50/50, explorer 200/100, hack 1000/500

### ✅ Bloco 1.1 — Estabilização app-chat (concluído 2026-05-13)
- Tabela `available_llms` (fonte única de modelos LLM)
- Helper `_shared/llm-fallback.ts` com `callLLM` em 9 edge functions
- 9 funções refatoradas, 5 conjuntos hardcoded removidos
- UI admin `/admin?tab=llms` com healthcheck por modelo
- 15 endpoints com URLs absolutas via `fnUrl()` (eram `VITE_SUPABASE_URL` undefined no preview)

### 🟡 Próximos sprints
- **1.3:** Limpeza Flows/Disparos do menu + bugs do wizard + Modo Vibe
- **2.4-b:** Tools customizadas (HTTP genérico)
- **2.4-c:** MCPs nativos (Google Calendar + Gmail + Webhooks)
- **2.5:** Knowledge Base com pgvector + migração memória Anthropic → pgvector
- **2.6:** Tabelas do cliente
- **2.7:** Cadências
- **Fase B:** Asaas + splits + trial 7d + tier_quotas formal + budgets + aprovação agências
- **Modo Vibe full:** wizard contextualizado por nicho
- **Movimento 1:** pitch deck + cenários teste + notas visuais + Inspetor

---

## Providers de Tools nativas

### Web search
**Brave Search API** ($3-5/1k, free tier 2k/mês). Secret: `BRAVE_SEARCH_API_KEY`.

### Image generation
**Via OpenRouter** (não Replicate — princípio Master §5.3 generalizado: "toda chamada de IA generativa passa pelo OpenRouter"). Reaproveita `OPENROUTER_API_KEY`.

| Modelo | Uso |
|--------|-----|
| `google/gemini-2.5-flash-image` (Nano Banana padrão) | **Default** — ~$0.039/imagem, ~30s, qualidade alta, PT-BR bom |
| `gemini-3-pro-image-preview` (Nano Banana 2 Pro) | Fallback premium |
| `gpt-5-image` (OpenAI) | Top de gama, opt-in |

### MCPs nativos (futuro Sprint 2.4-c)
Implementação pragmática como function calling embedded com OAuth per provider — NÃO o protocolo MCP literal da Anthropic. Migração para protocolo real fica para quando ecossistema amadurecer.

Prioridades iniciais: **Google Calendar + Gmail + Webhooks**. Demais (Stripe, Asaas, Sheets, Slack) sob demanda.

---

## Dívidas Técnicas Conhecidas

| Dívida | Severidade | Bloqueia |
|---|---|---|
| Tier rename + colisão semântica do `hack` | Alta | Cada feature nova que toca tier |
| RLS de `user_agents`/`user_apps` baseada em `user_id` | Alta | Feature "Equipe da Agência" (`agency_members`) |
| Trigger `user_agents` com whitelist obsoleta de providers | Média | Adicionar DeepSeek/Qwen/Zhipu |
| Memória stub Anthropic vs Master §13.17 pgvector | Média | Sprint 2.5 (junto com KB) |
| 16 warnings de SECURITY DEFINER no linter Supabase | Média | Hardening dedicado pós-Movimento 1 |
| Versões publicadas não capturam tools | Baixa | Robustez quando volume crescer |
| Mensagens contextual por modo (`direction`) | Baixa | Sprint próprio de Caixa Omnichannel |
| Convenção `is_active` vs `active` mista | Trivial | Cosmético |

---

## Constraints Permanentes

- Nunca usar `git push --force` no `main`
- Nunca usar Lovable Gateway em nada (decisão do usuário, 2026-05-13)
- LLM de chat: sempre via OpenRouter (`callLLM` do helper compartilhado)
- Embeddings: **OpenAI direto** com `OPENAI_API_KEY` (Sprint 2.5 — OpenRouter não oferece embeddings; precedente: Brave Search é provider externo direto). Modelo padrão: `openai/text-embedding-3-small` (1536d). Migração futura para Cohere multilingual-v3 (PT-BR otimizado) fica como opção caso qualidade exija
- Nunca hardcodar arrays de modelos LLM em edge functions
- Nunca misturar com contexto do Sancet
- Nunca trabalhar em `aikortex-01` ou `aikortex-v3`
- Edge functions: sempre testar com curl ou logs antes de reportar como resolvido
- Frontend: após push, avisar o usuário para fazer hard refresh (Cmd+Shift+R)
- App Builder NÃO compete com Lovable/Bolt/Remy — é especializado em apps de agência por nicho brasileiro
- 3 nichos no lançamento: Saúde, Corretoras de Seguros e Consórcios, Imobiliário
- Frontend NUNCA chama edge function via URL relativa — sempre `fnUrl()`
- Toda chamada LLM passa por `callLLM` do helper compartilhado
- React Flow é capacidade interna do agente (tab "Avançado"), não pilar comercial
- Cliente final NUNCA vê branding Aikortex (whitelabel)
