# Análise: Zaia Vibe Agent → Implicações pro Aikortex Modo Vibe

**Data:** 2026-06-02
**Fonte:** 2 screenshots do staging `endless.stg.zaia.app` (Vibe Agent + Modo Avançado)
**Contexto:** Decisão pendente sobre antecipar o Modo Vibe no roadmap do Aikortex

---

## 1. O que o Zaia Vibe Agent é, na prática

O Zaia tem **duas faces da mesma interface** controladas por um toggle no topo:

- **`Vibe Agent`** — modo conversacional (criar agente conversando)
- **`</> Avançado`** — builder tradicional (formulários e abas)

**Ponto crítico:** ambos escrevem na **mesma estrutura de dados** (versão `Rascunho`, publicada via ícone de foguete). Não é "Vibe pra leigo, Avançado pro power user" — é a **mesma config**, com duas interfaces. Isso é arquitetura, não UI.

---

## 2. Como o Vibe Agent se comporta (Screenshot 1)

### Fluxo observado
1. Usuário: *"Quero um agente para criar e publicar conteúdo no linkedin"*
2. Agente **não tenta gerar nada ainda**. Responde:
   > "Boa escolha. (...) Mas antes de estruturar qualquer coisa, preciso confirmar um ponto crítico: publicar diretamente no LinkedIn exige acesso técnico à plataforma. Você tem alguma dessas opções disponíveis?
   > - Um MCP do LinkedIn já configurado no workspace
   > - Ou acesso à LinkedIn API com token OAuth (credenciais de desenvolvedor)?
   >
   > Essa é a peça central do agente. Sem ela, a publicação automática não é possível — e o escopo muda completamente."
3. Usuário: *"nao. configure o mcp para mim"*
4. UI mostra estados de raciocínio:
   - `✓ Modo identificado` (classificou intent)
   - `Pensando...` (raciocínio em curso)

### Sinais de design importantes
- **O agente é Solutions Architect, não yes-man.** Ele identifica **dependências técnicas** (MCP, OAuth) antes de prometer entregar.
- **Transparência de raciocínio** — `Modo identificado` + `Pensando` mostra ao usuário o que o agente está fazendo.
- **Cada agente em construção = uma conversa** no histórico lateral (rastreável, reabrir conversa pra evoluir o agente depois).
- **Painel direito "Selecionar Agente/Squad"** sugere que o Vibe roda **junto com** os agentes existentes pra testar/comparar.

---

## 3. Arquitetura completa revelada no Modo Avançado (Screenshot 2)

Breadcrumb: `Builder > Agentes > Content Creator > Instruções`

### Sidebar — Agentic (núcleo do agente)
- **Instruções** (configuração principal)
- **Ferramentas**
- **Vozes**
- **MCPs**
- **Componentes** (reutilizáveis, referenciáveis via `@` no prompt)

### Sidebar — Recursos (dados)
- **Tabelas**
- **Conhecimento** (RAG)
- **Workflows** (marcado como **beta**)

### Configurações Principais — campos
| Campo | Valor no print | Limite/observação |
|---|---|---|
| **Papel** | `LinkedIn content creator` | 250 chars (24 usados) |
| **Prompt** | `You are a content creator agent specialized in creating and publishing content on LinkedIn.` | 5000 chars; suporta `@` pra referenciar componentes |
| **Provedor** | `Zaia` | cascata própria (provavelmente roteia entre Anthropic/OpenAI/etc) |
| **Modelo** | `Claude Haiku 4.5` | escolha do modelo é dropdown |
| **Temperatura** | slider perto de `Criativo` | Metódico ↔ Criativo |
| **Esforço** | slider em `Pouco (10 passos)` | Pouco ↔ Extremo — **controla budget de reasoning** |
| **Vozes** | `Default` | TTS/voz do agente |

### Detalhes de UX que valem nota
- **Botão `IA` roxo no topo do Avançado** — sugere "preencher com IA" / autopilot dentro do builder também.
- **Preview à direita** — chat de teste inline na mesma tela do config (Content Creator aparece pronto pra testar).
- **Versão `Rascunho` com botão de foguete** — versionamento explícito, deploy controlado.

---

## 4. Implicações pro Aikortex Modo Vibe

### 4.1 O diferencial do Vibe Zaia não é "criar conversando"
É o **agente questionar você de volta**. A barra alta pra Aikortex Vibe não é gerar config a partir de texto — é **detectar dependências técnicas faltantes** (integração ausente, credencial não configurada, conhecimento necessário) e oferecer **resolver inline**.

### 4.2 Arquitetura deve ser unificada desde o dia 1
Se Vibe e Avançado forem dois sistemas paralelos, vira dívida técnica imediata. **Mesma estrutura de dados, duas UIs** é a única arquitetura saudável.

### 4.3 Features Zaia que valem copiar / diferenciar

| Feature Zaia | Comentário pro Aikortex |
|---|---|
| **Slider de Esforço** com `N passos` visível | Excelente forma de expor `extended thinking` budget sem jargão técnico. Vale copiar com naming próprio. |
| **`✓ Modo identificado` + `Pensando`** | Transparência de raciocínio. Pode ser diferencial se Aikortex mostrar **o que foi identificado** (chip/badge clicável). |
| **`@` pra referenciar Componentes** no prompt | Padrão sólido. Aikortex já usa esse padrão em algum lugar? Vale unificar. |
| **Versão `Rascunho` + foguete pra publicar** | Versionamento explícito reduz medo de quebrar produção. Sprint 1 do Aikortex já contempla isso? |
| **Workflows como beta separado** | Sinaliza que mesmo o Zaia trata workflow como **camada além do agente**. Não misturar no MVP do Vibe. |

### 4.4 O que NÃO copiar (potenciais armadilhas)
- **5000 chars de Prompt + 250 de Papel** — Zaia separou em dois campos, mas a fronteira é confusa. Aikortex pode unificar ou fazer a separação mais clara (ex.: "Identidade" vs "Comportamento").
- **Provedor `Zaia` opaco** — agências querem saber qual modelo está rodando e quanto custa. A cascata de chaves do Aikortex (Master v7.4) já é pública por design — manter essa transparência é diferencial.

---

## 5. Decisão sugerida pro roadmap

Não dá pra dizer "antecipar Modo Vibe sim/não" sem custo estimado, mas três observações ajudam a calibrar:

1. **Zaia já está no staging com Vibe maduro.** Se Aikortex sair só com Modo Avançado, a percepção será "mais um builder". Modo Vibe é tablestakes pra posicionar como concorrente direto.
2. **O esforço real do Vibe não é a UI conversacional** — é o **agente arquiteto** que detecta bloqueios. Sem isso, é só um wrapper de prompt → JSON e não diferencia.
3. **Workflows beta no Zaia** mostra que o Vibe **não precisa cobrir tudo** no v1. Foco em: criar agente + escolher modelo + apontar ferramentas/MCP + testar. Conhecimento e Workflows podem ficar fora do MVP do Vibe.

---

## 6. Próximas perguntas em aberto

- Aikortex Sprint 1 (Galeria por Nichos) tem alguma sobreposição com o que o Vibe entregaria? Ou são camadas ortogonais (Galeria = templates prontos / Vibe = criação from scratch)?
- A cascata de chaves do Master v7.4 está exposta hoje no builder atual? Como o Vibe expõe escolha de modelo sem virar "Provedor: Aikortex" opaco?
- Há acesso ao Zaia produção (não-staging) pra ver se Vibe está GA ou ainda restrito?
