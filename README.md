# Aikortex

Plataforma SaaS whitelabel para agências de IA — produção, aceleração e operação em um só lugar.

## Stack

- React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- Supabase (Auth, Edge Functions, Postgres, RLS)
- OpenRouter (gateway LLM)
- DeerFlow (motor de agentes — LangGraph + FastAPI)
- Railway (deploy)

## Estrutura

```
src/
├── components/    # Componentes React (aikortex, admin, flows, app-builder, etc.)
├── pages/         # 37 páginas (agentes, apps, clientes, mensagens, etc.)
├── hooks/         # 23 hooks customizados (use-agent-chat, use-module-access, etc.)
├── lib/           # Utilitários (auth-token, agent-diff, niches, etc.)
├── contexts/      # AuthContext, WorkspaceContext, AgentBuilderContext, AppBuilderContext
├── types/         # Tipos TypeScript
└── test/          # Testes (Vitest)

supabase/
├── functions/     # 35 Edge Functions (app-chat, asaas-*, whatsapp-*, etc.)
└── migrations/    # 62 migrations
```

## Setup

```bash
npm install
cp .env.example .env.local
# Preencher variáveis no .env.local
npm run dev
```
