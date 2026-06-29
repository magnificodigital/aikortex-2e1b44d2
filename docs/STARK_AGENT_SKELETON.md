# Stark Agent — Skeleton (Python + LiveKit Agents SDK)

> Serviço independente que rodará no Railway (sister de aikortex-flow).
> NÃO faz parte do repo aikortex-2e1b44d2 — vai num repo próprio
> `magnificodigital/aikortex-stark-agent`. Este doc lista o que vai
> existir lá pra alinhar antes de criar.

## Repo & Deploy

- **Repo:** `github.com/magnificodigital/aikortex-stark-agent`
- **Deploy:** Railway, mesma org do aikortex-flow
- **Domínio:** `stark-agent.aikortex.com` (Railway gera, depois Cloudflare CNAME)
- **Linguagem:** Python 3.11+
- **Framework:** LiveKit Agents SDK (mais maduro em Python)

## Estrutura de arquivos

```
aikortex-stark-agent/
├── README.md
├── pyproject.toml              # Poetry — deps + scripts
├── poetry.lock
├── Dockerfile                  # Railway build
├── railway.json                # Railway config (start cmd, env)
├── .env.example                # template das env vars
├── src/
│   ├── __init__.py
│   ├── main.py                 # entrypoint (LiveKit worker)
│   ├── agent.py                # StarkAgent class + lifecycle
│   ├── persona.py              # Resolve prompt do user (lê stark_user_prefs)
│   ├── tools/                  # Cada tool em arquivo próprio
│   │   ├── __init__.py
│   │   ├── list_agents.py
│   │   ├── describe_agent.py
│   │   ├── count_outcomes.py
│   │   ├── query_messages.py
│   │   ├── query_calls.py
│   │   ├── query_revenue.py
│   │   └── query_cadences.py
│   ├── supabase_client.py      # Cliente Supabase com JWT do user
│   ├── credits.py              # Consume + check antes da sessão
│   └── telemetry.py            # Log session em stark_voice_sessions
└── tests/
    ├── test_tools.py
    └── test_credits.py
```

## Env vars necessárias

```bash
# LiveKit
LIVEKIT_URL=wss://aikortex.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# Provedores de STT/TTS/LLM (Aikortex master keys)
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...          # Master Aikortex
OPENROUTER_API_KEY=...           # Platform key pro Stark (não da agência)

# Supabase
SUPABASE_URL=https://jcahtniqqiaefszhgpqx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...    # Pra escrever telemetria
SUPABASE_ANON_KEY=...            # Pra forward JWT do user nas tools

# Aikortex
AIKORTEX_DEFAULT_VOICE_ID=EXAVITQu4vr4xnSDxMaL  # Sarah
```

## Fluxo de conexão

```
1. Frontend (StarkBubble) requesta token do LiveKit
   → chama supabase edge function 'stark-token' (já existe)
   → edge function gera JWT pra room específico do user
2. Frontend conecta no LiveKit Cloud com o token
3. LiveKit aloca participante → notifica nosso worker (stark-agent)
4. Worker:
   - Reset cycle se necessário (consume_stark_voice_minutes function)
   - Verifica créditos antes de aceitar conexão
   - Carrega persona do user (stark_user_prefs)
   - Inicia pipeline: Deepgram STT → LLM → ElevenLabs TTS streaming
   - Tools executam HTTP calls de volta pro Supabase com JWT do user
5. A cada minuto consumido (real time), worker chama consume_stark_voice_minutes
6. Se créditos = 0 → worker manda evento 'voice_credit_exhausted' → frontend
   fecha sessão e mostra prompt de pack avulso
7. Ao disconnect → worker grava stark_voice_sessions com totais
```

## Edge function 'stark-token' (nova — fica no aikortex-2e1b44d2)

Substitui (ou complementa) a `stark-token` atual. Responsável por:

```typescript
// Input: nada (usa JWT do user via Authorization)
// Output: { token, livekit_url, room_name }

1. Auth user via Supabase JWT
2. Lê agency_id do user
3. Chama consume_stark_voice_minutes(agency_id, 0)
   → só pra ver remaining_tier + packs ativos
4. Se total disponível < 1 min → retorna 402 com sugestão de pack
5. Gera LiveKit JWT (lib livekit-server-sdk):
   - room: stark-{user_id}
   - participantName: user_id
   - metadata: { agency_id, user_id, locale: 'pt-BR' }
6. Retorna { token, livekit_url, room_name }
```

## Tools — migração

Tools atuais (em `supabase/functions/_shared/stark-tools.ts`) serão
re-implementadas em Python, mas mantendo:
- **Schema idêntico** (mesmo nome de função, mesmos parâmetros, mesmo retorno)
- **Auth via JWT do user** (RLS continua funcionando — usuário só vê dados dele)
- **Mesmas tabelas** (user_agents, conversations, call_logs, etc)

A reimplementação é mecânica — pega cada função TS e converte pra
Python usando `supabase-py` em vez de `@supabase/supabase-js`.

## Custos LiveKit Cloud (referência)

- Free: 5000 connection-minutes/mês — suficiente pra dev
- Build: $50/mês + $0.30 / 1000 participant-minutes
- Production (estimado pra 100 agências ativas): ~$80-150/mês

## Acceptance criteria (Fase 2)

Antes de marcar fase 2 como done:
- [ ] Stark Agent rodando no Railway, exposto via wss
- [ ] Frontend conecta e troca áudio em ambiente isolado de teste
- [ ] 1 tool funcional (`list_agents`) — prova o JWT forwarding
- [ ] Telemetria gravando em `stark_voice_sessions`
- [ ] Latência first-syllable < 1s em rede local
- [ ] Feature flag pra alternar `legacy` ↔ `livekit` no front
