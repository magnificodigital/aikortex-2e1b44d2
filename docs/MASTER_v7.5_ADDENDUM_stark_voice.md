# Master v7.5 — Addendum: Stark Voice (LiveKit Agents)

> **Status:** Proposta em implementação. Substitui §3 e §4 do Master v7.4
> apenas no que tange a Stark e tiers. Demais regras seguem v7.4.

## Contexto

Stark precisa atender o usuário (agência e cliente final) com tempo de
resposta tipo Jarvis (≤ 1s). Stack atual (edge function sequencial: STT →
LLM → TTS) entrega ~2-5s por turn, longe do alvo. Migra-se para
**LiveKit Agents** (WebRTC + streaming).

## Decisões vinculantes

### 1. Stark voz como feature core de todos os tiers

Stark texto (livre) continua usando a chave LLM da agência (regra v7.4
mantida). **Stark voz tem custo recorrente real pra Aikortex** (LiveKit
infra + Deepgram STT + ElevenLabs TTS) e é alocado por tier.

### 2. Novos tiers (atualiza v7.4 §3.2)

| Tier   | Mensalidade | Stark voz incluído | Stark voz/dia médio | Split Aikortex no agente |
|--------|-------------|--------------------|---------------------|--------------------------|
| Start  | R$ 197      | 240 min/mês        | ~8 min              | 60%                      |
| Hack   | R$ 397      | 540 min/mês        | ~18 min             | 50%                      |
| Growth | R$ 697      | 1000 min/mês       | ~33 min             | 40%                      |

- **Stark texto continua ilimitado em todos os tiers** (custo zero pra Aikortex)
- **Tier Start deixa de ser gratuito** (R$ 0 → R$ 197). Free trial via
  7-day trial Asaas substitui o tier free.

### 3. Pack de créditos avulsos

Quando esgota minutos do tier, agência tem 2 opções:
1. Comprar pack avulso (não-expirável, soma ao tier corrente)
2. Aceitar fallback automático pro modo texto até próximo ciclo

| Pack    | Min   | Preço     | Margem Aikortex |
|---------|-------|-----------|-----------------|
| Mini    | 60    | R$ 49     | ~33%            |
| Médio   | 300   | R$ 197    | ~16%            |
| Grande  | 1000  | R$ 597    | ~8%             |

Margens decrescentes incentivam upgrade de tier em vez de compra recorrente
de pack grande.

### 4. Voz pra cliente final do agente

Cada agente publicado (R$ 997/mês via Asaas split) inclui:
- **30 min/mês** de Stark voz no workspace do cliente final
- Excedente: agência decide se cobra do cliente ou absorve (vira margem dela)

Cobertura do custo: R$ 997 × split Aikortex 40-60% = R$ 398-598 → cobre
~720-1080 min worst-case ElevenLabs. Margem confortável.

### 5. Comportamento ao esgotar créditos

- 80% do tier → toast soft: "Restam X min de Stark voz esse mês"
- 100% do tier (e sem packs ativos) → Stark cai pro modo **texto** automaticamente
- Botão "Comprar pack" sempre disponível no orb

Nunca trava o produto — modo texto sempre funciona (chave LLM da agência).

## Stack técnica

```
Browser (LiveKit React SDK)
    ↕ WebRTC
LiveKit Cloud (room/SFU)
    ↕
Aikortex Stark Agent (Python, Railway)
    ↳ Deepgram Nova-3 STT (streaming)
    ↳ LLM Aikortex (Claude Haiku via OpenRouter platform key)
    ↳ ElevenLabs Turbo v2.5 TTS (streaming)
    ↳ Stark Tools (HTTP calls back to Supabase, JWT-forwarded)
```

### Por que LiveKit
- WebRTC bidirecional = latência sub-segundo
- VAD nativa (não precisa controlar manualmente)
- Interrupção (user fala por cima do Stark)
- Streaming TTS = primeira sílaba sai antes do LLM terminar

### Por que Aikortex paga (não pass-through)
Pass-through pra chave LiveKit da agência teria fricção de setup que
atrapalha onboarding. Master v7.5: voz é commodity infrastrutura paga
pela mensalidade. (Vs. LLM dos agentes em produção, que é pass-through
porque agência captura valor de volta no preço do agente.)

## Migração

1. **Compatibilidade**: stack atual (`stark-voice` + `stark-chat` edge functions)
   fica ativa em paralelo. Feature flag `stark_voice_provider`:
   `legacy` (atual) ou `livekit` (novo).
2. **Default**: `legacy` durante dev. Toggle pra `livekit` quando stark-agent
   estiver estável.
3. **Tiers existentes**: agências hoje em Start (free) migram automaticamente
   pra Start R$ 197 com período de carência de 30 dias antes da primeira
   cobrança. Notificação prévia obrigatória por email.

## Estimativa de custos operacionais (Aikortex)

Cenário: 100 Start + 50 Hack + 20 Growth, uso médio do tier.

| Item                          | Custo mensal Aikortex |
|-------------------------------|-----------------------|
| LiveKit Cloud (3000 min/dia)  | R$ 450                |
| Deepgram STT (mesma duração)  | R$ 900                |
| ElevenLabs Turbo TTS          | R$ 4.500              |
| LLM (Stark texto + voz)       | R$ 600                |
| **Total custo**               | **R$ 6.450/mês**      |
| **Receita assinaturas**       | **R$ 53.940/mês**     |
| **Margem operacional**        | **~88%**              |

Cobre também end-client voice nos agentes publicados.

## Faseamento da implementação

1. **Fase 1** (esta sessão): Migration DB + addendum doc + skeleton service
2. **Fase 2**: Stark Agent rodando no Railway, isolado, testável standalone
3. **Fase 3**: Frontend feature flag, testa lado a lado
4. **Fase 4**: Sistema de créditos (consumo, cap, soft/hard limit)
5. **Fase 5**: Atualiza Asaas products + UI Assinatura com novos preços
6. **Fase 6**: Embed Stark voz no workspace do cliente final

Cada fase é independentemente deployável e reversível.
