
## Objetivo

Transformar o criador de agentes num wizard consultivo que cobre **4 áreas obrigatórias** (Objetivo+KPIs, Canais+Horários, Dados+Tabelas, Escalation+Handoff), apresenta **review completo** antes de criar, e na fase de criação monta o agente **inteiro** — identidade, instruções, tools, canais, **tabelas no Supabase**, **knowledge bases**, e marca integrações OAuth pendentes.

Hoje o fluxo é rígido: 1ª msg → DESCOBERTA (3 perguntas), 2ª msg → PLANO, 3ª msg → CRIACAO. E a criação só mexe em identidade/tools/canais — não cria tabelas nem KBs.

## Mudanças

### 1. Novo modelo de fases (dinâmico, baseado em cobertura)

Trocar o gating por contagem de mensagens por um gating por **cobertura das 4 áreas**:

| Área | Sinais coletados |
|---|---|
| Objetivo + KPIs | propósito, métrica de sucesso, volume esperado |
| Canais + Horários | canais ativos, SLA, horário de operação |
| Dados + Tabelas | que dados o agente lê/escreve, estrutura |
| Escalation + Handoff | quando passa pra humano, pra quem, como |

- `DESCOBERTA` enquanto faltar área não coberta — até 15 perguntas no total, em rodadas de 2-3 por turno, adaptando ao que o user já disse.
- `PLANO` quando as 4 áreas tiverem sinais mínimos OU o user pedir pra avançar ("pode montar", "manda o plano").
- `CRIACAO` só após confirmação explícita no plano.

Implementação: adicionar `coverage` ao prompt (lista de áreas pendentes), e relaxar o gating em `index.ts` pra considerar tamanho/qualidade da conversa em vez de só contagem.

### 2. Plano enriquecido (review completo)

Expandir o template do plano pra mostrar tudo que será criado:

```
📋 Plano do agente

Identidade: {nome}, {empresa}, {nicho}, tom {x}
O que faz: {1-2 linhas}
KPI principal: {métrica}

Canais: {lista} · Horário: {janela} · SLA: {tempo}
Escalation: {quando} → {pra quem}

📊 Tabelas que vou criar:
- {nome} — colunas: {col1, col2…}
- {nome} — colunas: {…}

📚 Knowledge bases:
- {nome} — pra {propósito}

🔌 Integrações:
✓ {x} já conectada
⚠ {y} precisa OAuth depois

🛠 Tools: {lista}

Confirma? Posso criar?
```

### 3. Novas tools do wizard

Adicionar em `wizard-tools.ts` + `agent-vibe-mutate/index.ts`:

- `create_client_table({ name, description, columns: [{name, type, required}] })` — cria linha em `client_tables` usando `client_id` derivado do `user_agents.client_id`.
- `create_knowledge_base({ name, description })` — cria linha em `agent_knowledge_bases` ligada ao `agent_id`.

Validações: nomes únicos por agente/cliente, tipos de coluna restritos a `text|number|date|boolean|email|phone|url|json`, máx 8 tabelas e 5 KBs por criação pra evitar explosão.

### 4. Fase CRIACAO ampliada

No prompt da CRIACAO, adicionar passo:

```
DADOS — Estrutura de dados:
16. create_client_table — pra cada tabela do plano (nome + colunas do nicho)
17. create_knowledge_base — pra cada KB do plano (vazia, user adiciona docs depois)
```

E na resposta final, citar as tabelas/KBs criadas com links pros painéis (Dados → Tabelas / Conhecimento).

### 5. Front-end

Nenhuma mudança visual obrigatória — o `AgentRightPanel` já reage a Realtime nos `client_tables`/`agent_knowledge_bases`. Os cards de Tabelas e Conhecimento vão aparecer sozinhos conforme o wizard cria.

## Detalhes técnicos

**Arquivos tocados:**
- `supabase/functions/app-chat/index.ts` — gating dinâmico de fase, prompts (DESCOBERTA com 4 áreas, PLANO enriquecido, CRIACAO com passos 16-17)
- `supabase/functions/_shared/wizard-tools.ts` — 2 tool defs novas
- `supabase/functions/agent-vibe-mutate/index.ts` — 2 cases novos com validação e insert via service role
- Sem migration: as tabelas já existem com as colunas necessárias.

**Risco:** o passo 1 (gating dinâmico) altera o cálculo de `wizardPhase` e pode regredir conversas em curso. Vou manter um fallback: se `userMessageCount >= 8` e ainda em DESCOBERTA, avança forçado pra PLANO.

**Não-objetivos:**
- Não vou popular as tabelas com dados (só schema).
- Não vou ingerir documentos nas KBs (só criar a base vazia).
- Não vou conectar OAuth no lugar do user — só marcar pendência.
