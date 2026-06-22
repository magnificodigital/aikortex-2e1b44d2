// Assets padrão por nicho — usado pelo Modo Vibe pra criar agente COMPLETO,
// não só identidade. Cobre tabelas, cadências, KB e guardrails contextuais.
//
// Fluxo:
//   1. Vibe DESCOBERTA detecta nicho
//   2. Na fase CRIAÇÃO, Vibe chama tools que CRIAM esses assets de verdade
//   3. Result: agente nasce com estrutura mínima pra rodar
//
// Catálogo inicial: Contabilidade, Saúde, Advocacia, Imobiliária.
// Outros nichos caem no genérico (sem tabelas/cadências auto, só guardrails).

export interface TableColumn {
  name: string;
  type: "text" | "number" | "date" | "boolean" | "json";
  required?: boolean;
}

export interface NicheTable {
  slug: string;
  label: string;
  description: string;
  columns: TableColumn[];
}

export interface NicheCadenceStep {
  /** Dia relativo ao início (negativo = antes do evento, 0 = no dia, positivo = depois) */
  day: number;
  label: string;
  messageTemplate: string;
}

export interface NicheCadence {
  slug: string;
  name: string;
  description: string;
  trigger: "manual" | "novo_lead" | "agendamento" | "vencimento_prazo";
  steps: NicheCadenceStep[];
}

export interface NicheKbTopic {
  slug: string;
  title: string;
  description: string;
  /** Conteúdo starter opcional. Quando preenchido, o seed_kb_topic insere
   * um kb_documents com esse texto pra agência personalizar/sobrescrever.
   * Texto em markdown com headings ## P: ... \n R: ... */
  seedContent?: string;
}

export interface NicheAssetSpec {
  niche: string;
  tables: NicheTable[];
  cadences: NicheCadence[];
  kbTopics: NicheKbTopic[];
  /** Guardrails específicos do nicho (somam aos universais). Cada item é
   * frase que vira regra NEGATIVA no prompt do agente. */
  contextualGuardrails: string[];
}

export const NICHE_ASSETS: Record<string, NicheAssetSpec> = {
  // ── Contabilidade ──────────────────────────────────────────────────────
  "Contabilidade": {
    niche: "Contabilidade",
    tables: [
      {
        slug: "clientes_contabeis",
        label: "Clientes contábeis",
        description: "Empresas/pessoas atendidas pelo escritório",
        columns: [
          { name: "nome", type: "text", required: true },
          { name: "cnpj_cpf", type: "text" },
          { name: "regime_tributario", type: "text" },
          { name: "email", type: "text" },
          { name: "telefone", type: "text" },
          { name: "responsavel", type: "text" },
        ],
      },
      {
        slug: "prazos_impostos",
        label: "Prazos de impostos",
        description: "Calendário fiscal dos clientes (DAS, DARF, ECF, etc)",
        columns: [
          { name: "tipo_imposto", type: "text", required: true },
          { name: "data_vencimento", type: "date", required: true },
          { name: "cliente", type: "text" },
          { name: "status", type: "text" },
        ],
      },
      {
        slug: "documentos_solicitados",
        label: "Documentos solicitados",
        description: "Checklist de documentos pendentes por cliente",
        columns: [
          { name: "cliente", type: "text", required: true },
          { name: "documento", type: "text", required: true },
          { name: "solicitado_em", type: "date" },
          { name: "recebido", type: "boolean" },
        ],
      },
    ],
    cadences: [
      {
        slug: "onboarding_cliente_contabil",
        name: "Onboarding de novo cliente",
        description: "Acolhe novo cliente, pede documentos iniciais",
        trigger: "novo_lead",
        steps: [
          { day: 0, label: "Boas-vindas", messageTemplate: "Olá! Bem-vindo ao escritório. Vou te enviar a lista de documentos pra começar." },
          { day: 1, label: "Lembrete docs", messageTemplate: "Oi, tudo bem? Já conseguiu separar os documentos? Posso ajudar com alguma dúvida." },
          { day: 7, label: "Follow-up final", messageTemplate: "Ainda estamos aguardando os documentos. Tem algo que está dificultando?" },
        ],
      },
      {
        slug: "lembrete_prazo_imposto",
        name: "Lembrete de prazo de imposto",
        description: "Avisa o cliente antes do vencimento de imposto",
        trigger: "vencimento_prazo",
        steps: [
          { day: -7, label: "Aviso 7 dias", messageTemplate: "Lembrete: vencimento do {tipo_imposto} em 7 dias. Tudo certo aí?" },
          { day: -1, label: "Aviso véspera", messageTemplate: "Atenção: {tipo_imposto} vence amanhã. Já conseguiu emitir?" },
        ],
      },
    ],
    kbTopics: [
      {
        slug: "regimes_tributarios",
        title: "Regimes tributários",
        description: "Simples, Lucro Presumido, Lucro Real — quando cada um cabe",
        seedContent: `# Regimes Tributários — Resumo Prático

> ✏️ **Personalize com a análise do contador** pros casos comuns dos seus clientes.

## MEI (Microempreendedor Individual)
- **Faturamento máximo:** R$ 81 mil/ano (R$ 6.750/mês)
- **Tributo:** DAS fixo mensal (~R$ 75 + INSS)
- **Funcionários:** até 1 com salário mínimo ou piso da categoria
- **CNAEs permitidos:** lista restrita (consultar Portal do Empreendedor)
- **Vantagem:** simplicidade absoluta, 1 boleto/mês
- **Limitação:** não pode emitir nota pra outras MEIs em mesmo CNPJ familiar

## Simples Nacional
- **Faturamento máximo:** R$ 4,8 mi/ano
- **Tributo:** unificado (IRPJ, CSLL, PIS, COFINS, INSS, ISS/ICMS) — DAS conforme tabela
- **Alíquota efetiva:** 4% a 33% dependendo do Anexo (I a V)
- **Vantagem:** baixa carga + menos obrigações acessórias
- **Quando NÃO cabe:** atividades vedadas (financeira, locação imóvel próprio etc), ou margem real < margem presumida do Anexo

## Lucro Presumido
- **Faturamento máximo:** R$ 78 mi/ano
- **Tributo:** presume margem de lucro (8% comércio, 32% serviço) + tributa sobre essa base
- **Periodicidade:** trimestral (IRPJ/CSLL), mensal (PIS/COFINS)
- **Vantagem:** quando margem real é maior que a presumida → economia
- **Quando NÃO cabe:** atividades obrigadas a Lucro Real (financeiras, factoring, equiparadas)

## Lucro Real
- **Faturamento mínimo (obrigatório):** > R$ 78 mi/ano
- **Tributo:** sobre lucro real apurado contabilmente
- **Vantagem:** quando há prejuízos, pode compensar
- **Desvantagem:** alto custo de compliance (escrituração, ECD, ECF, EFD-Contribuições)
- **Atividades obrigadas:** instituições financeiras, factoring, atividades imobiliárias específicas, empresas com lucros do exterior

## Como escolher
1. **Calcule a margem real** dos últimos 12 meses
2. **Compare** o tributo Simples (pela tabela) vs Presumido (com sua margem real) vs Real (com balanço)
3. **Considere** obrigações acessórias adicionais do Lucro Real
4. **Decida em janeiro** — mudança de regime só uma vez ao ano (até último dia útil de janeiro)`,
      },
      {
        slug: "documentos_abertura",
        title: "Documentos para abertura de empresa",
        description: "Lista de documentos necessários por tipo de empresa",
        seedContent: `# Documentos para Abertura de Empresa

> ✏️ **Confirme com a Junta Comercial do estado** se a lista mudou.

## Documentos pessoais (sócios)
- RG e CPF (cópia simples ou autenticada)
- Comprovante de residência atualizado (≤ 90 dias)
- Certidão de casamento ou declaração de união estável (se aplicável)
- Comprovante de profissão (CRC, CRM, OAB etc se categoria regulamentada)

## Documentos da empresa
- **Consulta prévia de viabilidade** (prefeitura) — confirma se endereço aceita a atividade
- **Contrato Social** (LTDA/SLU) ou Requerimento de Empresário (Empresário Individual)
- **Comprovante de endereço da empresa** (IPTU, conta de luz/água)
- **CCMEI** (no caso de MEI)
- **DBE** (Documento Básico de Entrada) — gerado no portal Receita

## Etapas
1. Consulta prévia na prefeitura (1-3 dias)
2. Registro na Junta Comercial (NIRE) — 1-3 dias úteis
3. CNPJ na Receita Federal — automático após Junta (até 24h)
4. Alvará de funcionamento na prefeitura
5. Inscrição estadual (se vende mercadoria) ou municipal (se presta serviço)
6. Alvará do bombeiro (se imóvel comercial)
7. Cadastro INSS/CAGED/eSocial (após primeiro funcionário)

## Tempo médio total
- **MEI**: 1 dia (online)
- **LTDA simples**: 7-15 dias úteis
- **LTDA com atividade regulada**: 20-45 dias (depende de licenças)

## Custos típicos (referência 2026)
- Junta Comercial: R$ 130-280 dependendo do estado
- Alvará prefeitura: R$ 100-500
- Honorário contador pra abertura: R$ 500-2.500 (varia por complexidade)`,
      },
      { slug: "calendario_fiscal", title: "Calendário fiscal anual", description: "Datas de DAS, DARF, ECF, DCTF, etc" },
      {
        slug: "faq_contabil",
        title: "FAQ — perguntas frequentes",
        description: "8 perguntas que mais aparecem no WhatsApp",
        seedContent: `# FAQ Contábil — Perguntas Frequentes

> ✏️ **Personalize esse conteúdo** com a realidade do seu escritório. Esse é um starter genérico.

## P: Qual a diferença entre MEI, Simples Nacional, Lucro Presumido e Lucro Real?
R: O **MEI** é pra faturamento até R$ 81 mil/ano, paga DAS fixo mensal. **Simples Nacional** é pra empresas até R$ 4,8 mi/ano com tributação unificada (DAS conforme tabela). **Lucro Presumido** é pra empresas até R$ 78 mi/ano, presume margem fixa de lucro. **Lucro Real** é obrigatório acima de R$ 78 mi ou pra atividades específicas (financeiras, factoring) — apura tributo sobre lucro real apurado contabilmente.

## P: Quais documentos preciso enviar mensalmente pro contador?
R: Em geral: notas fiscais emitidas (saída) e recebidas (entrada), extratos bancários do mês, comprovantes de pagamentos (folha, fornecedores, despesas), guias pagas (DAS, INSS, FGTS) e qualquer contrato/aditivo novo. O ideal é enviar até o dia 5 do mês seguinte pra apuração dentro do prazo.

## P: Como faço pra abrir uma empresa?
R: Os passos básicos são: (1) definir tipo societário (MEI, LTDA, SLU), (2) consulta de viabilidade na prefeitura, (3) elaboração do contrato social, (4) registro na Junta Comercial, (5) CNPJ na Receita Federal, (6) alvará e inscrições estaduais/municipais quando aplicáveis. Conte com nosso escritório do início ao fim — pedimos a lista exata de documentos conforme o caso.

## P: O que acontece se eu atrasar o pagamento do DAS?
R: O atraso gera **multa de 0,33% ao dia** (limite 20%) + **juros pela taxa SELIC**. Em geral, o MEI inadimplente acumula débitos e pode ter o CNPJ baixado se o atraso passar de 12 meses. Pra empresa do Simples, o atraso pode causar a exclusão do regime no ano seguinte. Sempre alinhe com a gente antes de deixar passar.

## P: Posso emitir nota fiscal sendo MEI?
R: Sim, o MEI emite NFS-e (serviço) ou NFC-e/NF-e (produto) dependendo da atividade. Pra PJ, a emissão é **obrigatória**. Pra PF, é opcional mas recomendada (cliente pode pedir). O acesso é via prefeitura (NFS-e) ou portal estadual (NF-e). A gente pode te ajudar a configurar o emissor.

## P: Como funciona o pró-labore?
R: É a remuneração do sócio pelo trabalho na empresa — tipo um salário. **Não é obrigatório**, mas se o sócio trabalha, o INSS pode exigir contribuição (11% sobre o pró-labore). O valor mínimo é o salário mínimo vigente. Valor distribuído como pró-labore é dedutível do IR da empresa; já lucros distribuídos são isentos pro sócio.

## P: Qual o prazo pra entregar o Imposto de Renda da empresa?
R: Pra **Lucro Presumido**: ECD até último dia útil de maio do ano seguinte, ECF até último dia útil de julho. Pra **Lucro Real**: ECF até último dia útil de julho. Pra **MEI**: DASN-SIMEI até 31 de maio. Pra **Simples Nacional**: DEFIS junto com a DASN-SIMEI. Manda os dados financeiros até abril pra gente conseguir entregar com folga.

## P: Quando preciso virar Lucro Presumido?
R: É obrigatório quando o faturamento passa de **R$ 4,8 milhões/ano**. Antes disso, o Simples Nacional costuma ser mais vantajoso (alíquotas menores). Mas há casos onde Lucro Presumido compensa antes — quando a margem de lucro real é menor que a presumida (8% comércio, 32% serviço). A gente faz uma análise comparativa anual pra ver qual regime cabe melhor pra você.`,
      },
      { slug: "tabela_honorarios", title: "Tabela de honorários", description: "Valor por tipo de serviço (revisão, abertura, mensal, etc)" },
    ],
    contextualGuardrails: [
      "Dar parecer fiscal definitivo sem revisão do contador",
      "Fazer cálculo tributário sem contexto completo do cliente",
      "Opinar sobre planejamento sucessório ou societário",
      "Recomendar regime tributário sem análise detalhada",
    ],
  },

  // ── Saúde / Clínica médica ─────────────────────────────────────────────
  "Saúde": {
    niche: "Saúde",
    tables: [
      {
        slug: "pacientes",
        label: "Pacientes",
        description: "Cadastro de pacientes da clínica",
        columns: [
          { name: "nome", type: "text", required: true },
          { name: "cpf", type: "text" },
          { name: "telefone", type: "text" },
          { name: "email", type: "text" },
          { name: "plano_saude", type: "text" },
          { name: "data_nascimento", type: "date" },
        ],
      },
      {
        slug: "agendamentos",
        label: "Agendamentos",
        description: "Consultas marcadas e disponibilidade",
        columns: [
          { name: "paciente", type: "text", required: true },
          { name: "data_hora", type: "date", required: true },
          { name: "tipo_consulta", type: "text" },
          { name: "profissional", type: "text" },
          { name: "status", type: "text" },
        ],
      },
      {
        slug: "planos_aceitos",
        label: "Planos de saúde aceitos",
        description: "Convênios e condições",
        columns: [
          { name: "nome_plano", type: "text", required: true },
          { name: "tipos_consulta_cobertos", type: "text" },
          { name: "exige_autorizacao", type: "boolean" },
        ],
      },
    ],
    cadences: [
      {
        slug: "confirmacao_consulta",
        name: "Confirmação de consulta",
        description: "Confirma presença antes do horário",
        trigger: "agendamento",
        steps: [
          { day: -2, label: "Confirmação 48h", messageTemplate: "Olá! Lembrando da sua consulta dia {data} às {hora}. Está confirmado?" },
          { day: -1, label: "Confirmação 24h", messageTemplate: "Oi, sua consulta é amanhã às {hora}. Responde SIM pra confirmar ou REMARCAR." },
        ],
      },
      {
        slug: "pos_consulta",
        name: "Pós-consulta",
        description: "Acompanha o paciente depois do atendimento",
        trigger: "agendamento",
        steps: [
          { day: 1, label: "Como foi?", messageTemplate: "Como você está se sentindo após a consulta? Alguma dúvida sobre a orientação?" },
          { day: 7, label: "Acompanhamento semanal", messageTemplate: "Passou uma semana — como tem sido a recuperação?" },
        ],
      },
    ],
    kbTopics: [
      {
        slug: "especialidades",
        title: "Especialidades atendidas",
        description: "Lista das especialidades médicas da clínica",
        seedContent: `# Especialidades Atendidas

> ✏️ **Substitua pela lista REAL da sua clínica.** Esse é só um starter genérico.

## Clínica Médica e Atenção Primária
- **Clínica Geral** — consulta geral, avaliação inicial, triagem
- **Pediatria** — atendimento infantil (0-12 anos) e adolescentes
- **Geriatria** — pacientes 60+ com foco em prevenção e tratamento crônico

## Especialidades Cirúrgicas
- **Cirurgia Geral** — avaliação pré-operatória, hérnias, vesícula
- **Ortopedia** — fraturas, lesões esportivas, dores articulares
- **Ginecologia/Obstetrícia** — saúde da mulher e pré-natal

## Especialidades Clínicas
- **Cardiologia** — pressão alta, arritmias, check-up cardíaco
- **Endocrinologia** — diabetes, tireoide, obesidade
- **Dermatologia** — estética e patologias da pele
- **Gastroenterologia** — refluxo, gastrite, intestino
- **Neurologia** — enxaqueca, AVC, doenças neurodegenerativas
- **Psiquiatria** — depressão, ansiedade, transtornos
- **Urologia** — saúde masculina, próstata, urinária

## Diagnóstico por Imagem
- Raio-X · Ultrassom · Tomografia · Ressonância (verificar disponibilidade)

## Especialidades Multiprofissionais
- Nutrição · Psicologia · Fisioterapia · Fonoaudiologia

## Como informar ao paciente
Quando paciente perguntar "vocês atendem X?", responda APENAS as especialidades acima. Se não estiver na lista: "Não atendemos {X}, mas posso te orientar pra uma clínica parceira".`,
      },
      {
        slug: "planos_aceitos",
        title: "Planos de saúde aceitos",
        description: "Convênios cobertos + condições",
        seedContent: `# Planos de Saúde Aceitos

> ✏️ **Lista CRÍTICA — sempre confirme com a recepção antes de afirmar.** Cada operadora muda contrato de tempos em tempos.

## Como funciona
Atendemos os principais convênios da região. **Cada plano** tem regras próprias de cobertura, autorizações e procedimentos. Sempre confirmar com o paciente ANTES da consulta:
- Nome do plano (Bradesco Saúde, Amil, Unimed, etc.)
- Tipo (ambulatorial, hospitalar, empresarial, individual)
- Número da carteirinha

## Convênios típicos (exemplos — confirme com sua clínica)
- **Unimed** — cobertura ampla, autorização em alguns procedimentos
- **Bradesco Saúde** — segmentação por plano (Top, Effective, Premium)
- **Amil** — geralmente exige autorização prévia em exames de imagem
- **SulAmérica** — boa cobertura ambulatorial
- **Hapvida/NotreDame Intermédica** — rede própria, atendimento específico
- **Porto Saúde** — em crescimento, depende da região
- **Particular** — atendimento sem convênio, valor diferenciado

## Condições comuns
- **Carência:** plano novo pode ter 24h-180 dias de carência pra certas consultas
- **Coparticipação:** alguns planos cobram fração por consulta/exame
- **Autorização prévia:** exames de imagem, cirurgias e tratamentos especiais
- **Limites anuais:** algumas operadoras limitam # de consultas/ano

## Como responder ao paciente
- "Você sabe me dizer o nome exato do plano e tipo (ambulatorial/hospitalar)?"
- "Vou confirmar a cobertura com a recepção e te respondo em até X minutos"
- **Nunca** prometa cobertura sem confirmar
- Se não está na lista: "Atendemos como particular também, posso te passar o valor"`,
      },
      { slug: "politica_cancelamento", title: "Política de cancelamento", description: "Prazo pra cancelar/remarcar sem custo" },
      { slug: "preparos_exames", title: "Preparos para exames", description: "Jejum, suspensão de medicamentos, etc" },
      {
        slug: "faq_saude",
        title: "FAQ — perguntas frequentes",
        description: "Dúvidas mais comuns dos pacientes",
        seedContent: `# FAQ Clínica — Perguntas Frequentes

> ✏️ **Personalize com os dados reais da sua clínica** (telefones, planos aceitos, horários, etc).

## P: Como faço pra marcar uma consulta?
R: Você pode marcar pelo WhatsApp aqui mesmo, pelo nosso site ou ligando pra recepção. Pra agilizar, já me passa: especialidade desejada, plano de saúde (ou particular) e uma janela de horário que prefere. A confirmação chega aqui em até 1 dia útil.

## P: Posso remarcar ou cancelar a consulta?
R: Sim, sem problema. **Pra remarcar/cancelar sem custo**, avise com no mínimo 24h de antecedência. Cancelamentos em cima da hora podem gerar taxa (depende do plano/clínica). Me chama por aqui que eu te ajudo a achar nova data.

## P: Quais planos de saúde a clínica aceita?
R: Atendemos os principais planos da região. Pra confirmar se o seu está na lista, me passa o nome do convênio + tipo de plano (ambulatorial/hospitalar/empresarial). Se não cobrir, oferecemos valor particular com pacotes pra retorno e exames associados.

## P: Quanto tempo dura uma consulta?
R: Primeira consulta dura em média **40-50 minutos** (anamnese completa + exame). Retornos costumam ser **20-30 minutos**. Consultas de urgência/triagem podem ser mais rápidas. Recomendamos chegar 15 minutos antes pra preencher fichas e atualizar dados.

## P: Preciso fazer algum preparo antes do exame?
R: Depende do exame solicitado. **Sangue em jejum**: 8-12 horas (água liberada). **Ultrassom de abdome**: 6h jejum. **Endoscopia**: 8h jejum + suspensão de alguns medicamentos. Pra cada exame, mandamos as instruções específicas por aqui após o agendamento. Sempre confirme com a gente antes.

## P: Como recebo os resultados dos exames?
R: Os resultados ficam disponíveis no nosso portal/app em **3-7 dias úteis** (varia por exame). Você recebe um link aqui no WhatsApp assim que ficar pronto. Pra exames urgentes (alteração crítica), o médico entra em contato direto.

## P: A clínica atende crianças/pediatria?
R: Pra saber, me confirma a idade e o que está acontecendo. Temos especialistas que atendem todas as faixas etárias dependendo da área. Pediatria específica e atendimento a recém-nascidos podem exigir agendamento com profissional certo.

## P: Em caso de emergência, o que faço?
R: **Em caso de emergência grave (dor no peito, falta de ar, perda de consciência, hemorragia), ligue 192 (SAMU) ou vá direto ao pronto-socorro mais próximo — NÃO espere atendimento aqui.** Pra urgências não graves, podemos encaixar você no mesmo dia se houver disponibilidade.`,
      },
      { slug: "horarios_atendimento", title: "Horários de atendimento", description: "Dias e horários por especialidade" },
    ],
    contextualGuardrails: [
      "Diagnosticar sintomas ou sugerir diagnóstico",
      "Prescrever medicamento ou indicar dosagem",
      "Orientar caso de emergência sem direcionar pra serviço médico",
      "Falar de prognóstico ou expectativa de recuperação",
      "Opinar sobre cirurgia ou procedimento invasivo",
    ],
  },

  // ── Advocacia ──────────────────────────────────────────────────────────
  "Advocacia": {
    niche: "Advocacia",
    tables: [
      {
        slug: "clientes_juridicos",
        label: "Clientes jurídicos",
        description: "Pessoas/empresas representadas pelo escritório",
        columns: [
          { name: "nome", type: "text", required: true },
          { name: "cpf_cnpj", type: "text" },
          { name: "tipo", type: "text" },
          { name: "telefone", type: "text" },
          { name: "email", type: "text" },
        ],
      },
      {
        slug: "processos_ativos",
        label: "Processos ativos",
        description: "Casos em andamento",
        columns: [
          { name: "numero_processo", type: "text", required: true },
          { name: "cliente", type: "text", required: true },
          { name: "area", type: "text" },
          { name: "fase", type: "text" },
          { name: "proxima_audiencia", type: "date" },
        ],
      },
      {
        slug: "prazos_juridicos",
        label: "Prazos jurídicos",
        description: "Vencimentos de prazos processuais",
        columns: [
          { name: "processo", type: "text", required: true },
          { name: "tipo_prazo", type: "text", required: true },
          { name: "data_vencimento", type: "date", required: true },
          { name: "responsavel", type: "text" },
        ],
      },
    ],
    cadences: [
      {
        slug: "lembrete_prazo_juridico",
        name: "Lembrete de prazo processual",
        description: "Alerta antes do vencimento de prazo",
        trigger: "vencimento_prazo",
        steps: [
          { day: -7, label: "Aviso 7 dias", messageTemplate: "Atenção: prazo do {tipo_prazo} em 7 dias. Já está em andamento?" },
          { day: -3, label: "Aviso 3 dias", messageTemplate: "Prazo vencendo em 3 dias. Confirma se está tudo encaminhado?" },
        ],
      },
      {
        slug: "update_processo_semanal",
        name: "Update semanal de processo",
        description: "Mantém cliente informado",
        trigger: "manual",
        steps: [
          { day: 0, label: "Update", messageTemplate: "Olá! Atualização semanal do seu processo: {status_atual}." },
        ],
      },
    ],
    kbTopics: [
      {
        slug: "areas_atuacao",
        title: "Áreas de atuação",
        description: "Trabalhista, cível, tributário, etc",
        seedContent: `# Áreas de Atuação

> ✏️ **Substitua pela lista REAL do escritório.** Esse é starter genérico de um escritório full-service.

## Direito Trabalhista
- Reclamações trabalhistas (verbas rescisórias, FGTS, horas extras)
- Defesa do empregador em processos trabalhistas
- Consultoria preventiva (folha, contratos, demissões)
- Assédio moral/sexual, dano moral
- Acordos extrajudiciais

## Direito Cível
- Contratos (elaboração, revisão, rescisão)
- Indenizações por dano moral/material
- Cobranças e execuções
- Imobiliário (compra/venda, locação, despejo, usucapião)
- Responsabilidade civil

## Direito de Família e Sucessões
- Divórcio (consensual e litigioso)
- Pensão alimentícia (revisão, exoneração, execução)
- Guarda de filhos e direito de visita
- Inventário e partilha
- União estável (reconhecimento e dissolução)
- Testamento

## Direito do Consumidor
- Problemas com produtos e serviços
- Cobranças indevidas (bancos, operadoras, ecommerce)
- Negativações irregulares
- Vícios construtivos (imóveis)

## Direito Previdenciário
- Aposentadorias (idade, tempo de contribuição, especial)
- Benefícios por incapacidade
- Pensão por morte
- BPC/LOAS
- Revisões e RPV

## Direito Tributário
- Defesa em autuações fiscais
- Restituição de impostos pagos a maior
- Planejamento tributário
- Parcelamentos especiais

## Áreas que NÃO atendemos
- **Criminal** (se aplicável) — indicamos parceiros
- **Internacional** — não temos especialista
- *Atualize conforme o foco do seu escritório*

## Como triar o caso
1. Identifique a área pela natureza do problema
2. Se múltiplas áreas: trabalhista costuma ter prioridade por prazo prescricional
3. Casos urgentes (audiência marcada, prisão, prazo vencendo) → atendimento imediato`,
      },
      { slug: "tabela_honorarios", title: "Tabela de honorários", description: "Por área e tipo de causa" },
      {
        slug: "documentos_procuracao",
        title: "Documentos pra procuração",
        description: "Lista do que o cliente precisa trazer",
        seedContent: `# Documentos para Procuração e Cadastro

> ✏️ **Lista padrão — pode mudar conforme tipo de caso ou comarca.**

## Pessoa Física (PF)
- **RG e CPF** (cópia simples — original será conferido)
- **Comprovante de residência** atualizado (≤ 90 dias) — conta de luz/água/telefone fixo
- **Comprovante de profissão/renda** (3 últimos contracheques OU IR completo) — usado pra justiça gratuita
- **Certidão de casamento** ou nascimento (relacionado ao caso)
- **CTPS** (carteira de trabalho) — pra causas trabalhistas
- **Estado civil completo** (informar nome, RG, CPF do cônjuge se aplicável)

## Pessoa Jurídica (PJ)
- **Contrato Social atualizado** + última alteração
- **CNPJ** (cartão impresso pelo Portal Receita)
- **Procuração da empresa** (representante legal autorizado)
- **RG e CPF** do representante
- **Comprovante de endereço** da empresa

## Documentos específicos por tipo de caso

### Trabalhista
- CTPS (todas as páginas: identificação, contratos, alterações)
- Contracheques dos últimos 24 meses
- Termo de Rescisão (TRCT) se já demitido
- Carta de demissão / aviso prévio
- Conversas (WhatsApp, e-mails) que comprovem situação

### Família (divórcio, alimentos, guarda)
- Certidão de casamento atualizada (≤ 90 dias)
- Certidões de nascimento dos filhos
- Comprovantes de renda dos cônjuges
- Lista de bens (escrituras, documentos de veículos)

### Previdenciário
- CNIS (Cadastro Nacional de Informações Sociais)
- Carteiras de trabalho de toda a vida profissional
- Carnês de INSS (autônomo)
- Laudos médicos (auxílio-doença, aposentadoria por invalidez)
- Documentos rurais (sindicato, contrato de comodato)

### Cível (contratos, indenizações)
- Contrato relacionado ao caso
- Provas (notas fiscais, e-mails, fotos)
- Boletim de Ocorrência (se houver)
- Laudos técnicos / perícia (se houver)

## Procuração padrão
**Particular ad judicia** com poderes específicos pra:
- Receber citação
- Confessar, transigir, desistir
- Receber e dar quitação
- Substabelecer (se autorizado)

*Validade: até final do processo + recursos. Renovar se mais de 5 anos.*`,
      },
      { slug: "politica_lgpd", title: "Política LGPD", description: "Como dados de cliente são tratados" },
      {
        slug: "faq_juridico",
        title: "FAQ — perguntas frequentes",
        description: "Dúvidas comuns no atendimento",
        seedContent: `# FAQ Jurídico — Perguntas Frequentes

> ✏️ **Personalize com a realidade do seu escritório** (áreas atendidas, faixa de honorários, formas de pagamento).

## P: Como funciona a primeira consulta jurídica?
R: A primeira consulta dura cerca de **30-60 minutos** e serve pra entender o caso, analisar documentos iniciais e indicar o caminho jurídico (acordo, ação, defesa). Pode ser presencial ou online. O valor varia por área e pode ser abatido caso você contrate o escritório pra seguir o caso.

## P: Quais documentos preciso levar na primeira consulta?
R: Documentos pessoais (RG, CPF, comprovante de residência) + tudo que tiver relação com o caso (contratos, e-mails, mensagens, recibos, fotos, laudos, protocolos). Quanto mais material, melhor a análise. Se não tem certeza do que é relevante, traz tudo — a gente filtra.

## P: Como são cobrados os honorários?
R: Trabalhamos em 3 formatos: (1) **honorário fixo** por serviço (contrato, parecer, defesa específica), (2) **honorário mensal** pra consultoria contínua, (3) **honorário de êxito** (percentual sobre o ganho da causa, conforme tabela da OAB). Pra cada caso, fechamos contrato escrito antes de qualquer ação.

## P: Em quanto tempo o processo é resolvido?
R: Depende muito da área. **Trabalhista** costuma fechar em 1-3 anos. **Cível** varia (despejo 6 meses; indenização 2-5 anos). **Família** (divórcio consensual: 2-6 meses; litigioso: 1-3 anos). **Tributário/previdenciário** pode passar de 5 anos com recursos. A gente atualiza você a cada andamento relevante.

## P: Posso entrar com processo sem advogado?
R: Em causas até **20 salários mínimos** (Juizado Especial), você pode entrar sozinho — mas ainda assim recomendamos consultoria pra organizar o pedido. **Acima desse valor** ou em qualquer ação contra a União, o advogado é obrigatório. Em causas trabalhistas, o jus postulandi existe mas o índice de êxito sem advogado é muito menor.

## P: Vocês atendem em qual área do Direito?
R: Pra saber se atendemos seu caso, me descreve em poucas linhas o que aconteceu — eu encaminho pro advogado da área certa. Normalmente cobrimos as áreas mais demandadas: trabalhista, cível (contratos, indenizações), família, consumidor, previdenciário e empresarial.

## P: Como funciona a assistência judiciária gratuita?
R: Se você não tem condições de pagar honorários sem prejuízo do sustento, pode pedir o **benefício da justiça gratuita** dentro do processo (suspende custas e despesas). Pra defensoria pública, o atendimento é por região — me passa sua cidade que indico o caminho. O escritório também faz casos pro bono em situações específicas (avalie com a gente).

## P: Qual o prazo pra entrar com ação contra empresa?
R: Os prazos variam: **trabalhista** 2 anos depois da demissão (limite total: 5 anos retroativos). **Consumidor** 5 anos pra problemas de produto/serviço. **Cobrança de dívida** 5 anos (dívida prescrita). **Indenização por dano moral/material** 3 anos. Se está perto do limite, prioriza marcar consulta logo — perder o prazo é irreversível.`,
      },
    ],
    contextualGuardrails: [
      "Dar parecer jurídico definitivo sobre caso específico",
      "Opinar sobre chance de ganho ou perda de processo",
      "Falar valor exato de indenização ou condenação",
      "Sugerir estratégia processual sem revisão do advogado",
      "Confirmar prazo prescricional sem análise do caso",
    ],
  },

  // ── Imobiliária ────────────────────────────────────────────────────────
  "Imobiliária": {
    niche: "Imobiliária",
    tables: [
      {
        slug: "imoveis_disponiveis",
        label: "Imóveis disponíveis",
        description: "Portfólio em venda ou aluguel",
        columns: [
          { name: "codigo", type: "text", required: true },
          { name: "tipo", type: "text" },
          { name: "endereco", type: "text" },
          { name: "valor", type: "number" },
          { name: "quartos", type: "number" },
          { name: "area_m2", type: "number" },
          { name: "operacao", type: "text" },
        ],
      },
      {
        slug: "leads",
        label: "Leads imobiliários",
        description: "Interessados em imóveis",
        columns: [
          { name: "nome", type: "text", required: true },
          { name: "telefone", type: "text" },
          { name: "email", type: "text" },
          { name: "perfil_imovel", type: "text" },
          { name: "orcamento_max", type: "number" },
          { name: "origem", type: "text" },
        ],
      },
      {
        slug: "visitas_agendadas",
        label: "Visitas agendadas",
        description: "Agenda de visitas a imóveis",
        columns: [
          { name: "lead", type: "text", required: true },
          { name: "imovel", type: "text", required: true },
          { name: "data_hora", type: "date", required: true },
          { name: "corretor", type: "text" },
        ],
      },
    ],
    cadences: [
      {
        slug: "nutricao_lead_imobiliario",
        name: "Nutrição de lead",
        description: "Sequência pra lead frio até agendar visita",
        trigger: "novo_lead",
        steps: [
          { day: 1, label: "Primeira oferta", messageTemplate: "Olá! Achei 3 imóveis que batem com seu perfil. Quer dar uma olhada?" },
          { day: 3, label: "Reforço", messageTemplate: "Conseguiu ver os imóveis? Posso agendar uma visita pra você." },
          { day: 7, label: "Última tentativa", messageTemplate: "Ainda procurando imóvel? Tenho novidades essa semana." },
        ],
      },
      {
        slug: "pos_visita",
        name: "Pós-visita",
        description: "Follow-up depois da visita",
        trigger: "agendamento",
        steps: [
          { day: 1, label: "Feedback visita", messageTemplate: "O que achou do imóvel ontem? Quer ver outras opções similares?" },
        ],
      },
    ],
    kbTopics: [
      {
        slug: "regioes_atendidas",
        title: "Regiões atendidas",
        description: "Bairros e cidades onde temos imóveis",
        seedContent: `# Regiões Atendidas

> ✏️ **Substitua pela região REAL da imobiliária.** Esse é só um esqueleto.

## Como o agente deve responder
Quando o cliente pergunta "atendem em X?" ou "tem imóvel em Y?", confira na lista abaixo. Se a região está listada, confirme tipo de imóvel disponível. Se não está, ofereça regiões próximas ou registre interesse.

## Cidades atendidas
- *[Cidade principal]* — sede do escritório, cobertura completa
- *[Cidade 2]* — atendimento limitado a venda
- *[Cidade 3]* — apenas locação

## Bairros prioritários (com mais portfólio)
- Bairro 1 (perfil: residencial classe média/alta)
- Bairro 2 (perfil: comercial + apartamentos pequenos)
- Bairro 3 (perfil: casas familiares)

## Bairros atendidos sob demanda
- Bairro 4, 5, 6 — captação ativa, portfólio menor

## Bairros que NÃO atendemos
- Regiões fora do raio definido — informe e ofereça parceiro

## Tipos de imóvel por bairro (exemplo)
- **Centro:** kitnets, 1-2 quartos, comerciais
- **Zona Norte:** apartamentos 2-3 quartos, casas de bairro
- **Zona Sul:** imóveis classe média/alta, novos lançamentos
- **Praia/litoral:** temporada, segunda residência

## Quando cliente pede fora da região
1. Confirme polidamente que não cobrimos
2. Ofereça alternativa próxima se houver
3. Registre interesse pra futura expansão
4. Indique parceiro/concorrente se for urgente`,
      },
      { slug: "documentos_compra", title: "Documentos pra compra", description: "Lista do que comprador precisa apresentar" },
      {
        slug: "documentos_aluguel",
        title: "Documentos pra aluguel",
        description: "Lista de fiador, comprovante, etc",
        seedContent: `# Documentos para Aluguel

> ✏️ **Confira com a administradora** se mudou política de aceitação.

## Documentos do Locatário (sempre)
- **RG e CPF** (cópia simples)
- **Comprovante de residência atual** (≤ 90 dias)
- **Comprovante de renda** — 3 últimos contracheques OU DECORE/IR (autônomo)
- **Comprovante de profissão** (CTPS página inicial + última alteração, ou contrato de trabalho)
- **Estado civil** completo (certidão de casamento ou união estável se aplicável)

**Renda mínima exigida:** 3x o valor do aluguel + condomínio + IPTU

## Documentos do Cônjuge (se casado/união estável)
- RG e CPF
- Comprovante de renda
- Os dois assinam o contrato

## Modalidades de Garantia (escolha 1)

### 1. Fiador
**Quem pode ser fiador:**
- Proprietário de imóvel quitado no mesmo município
- Renda comprovada (3x o aluguel)
- Sem restrição de crédito

**Documentos do fiador:**
- RG e CPF + cônjuge (se casado)
- Comprovante de residência
- Comprovante de renda (3 contracheques OU IR)
- **Matrícula atualizada do imóvel** (≤ 30 dias) — comprova propriedade e quitação
- Certidão de casamento
- Cônjuge também assina como avalista

### 2. Seguro Fiança
- Análise feita pela seguradora (Porto, Tokio Marine, Bradesco)
- Não precisa de fiador
- **Custo:** geralmente 1 aluguel/ano (parcelado em 12x)
- Aprovação em 24-72h após enviar documentos
- Exige consulta SPC/Serasa limpa

### 3. Caução
- Depósito em conta vinculada (poupança)
- **Valor:** 3 aluguéis (devolvido no fim do contrato + correção)
- Sem necessidade de fiador ou seguradora
- Imediato

### 4. Título de Capitalização
- Aceito por algumas imobiliárias
- Cliente compra título com valor equivalente a 3 aluguéis
- Resgate ao fim do contrato

## Tempo de análise
- **Com seguro fiança:** 24-72h
- **Com fiador:** 5-10 dias (análise + vistoria do imóvel do fiador)
- **Com caução:** imediato após pagamento

## Custos iniciais (no ato da assinatura)
- Primeiro aluguel proporcional
- Caução OU primeiro mês de seguro fiança
- Honorários de intermediação (geralmente equivalente a 1 aluguel)
- Vistoria + laudo`,
      },
      { slug: "financiamento", title: "Linhas de financiamento", description: "Caixa, Itaú, BB — condições típicas" },
      {
        slug: "faq_imobiliario",
        title: "FAQ — perguntas frequentes",
        description: "Dúvidas mais comuns de compradores e locatários",
        seedContent: `# FAQ Imobiliário — Perguntas Frequentes

> ✏️ **Personalize com as regras da sua imobiliária** (regiões, garantias aceitas, comissão).

## P: Quais documentos preciso pra alugar um imóvel?
R: Em geral: RG, CPF, comprovante de residência atual, **3 últimos contracheques** (ou DECORE/IR pra autônomos), extratos bancários, comprovante de renda do cônjuge se aplicável. Renda mínima costuma ser **3x o valor do aluguel + condomínio**. Com garantia (fiador/seguro/caução), os critérios mudam um pouco — me passa qual modalidade pretende.

## P: Quanto custa a entrada num financiamento imobiliário?
R: Os bancos exigem entrada de **20% a 30% do valor do imóvel** em média (financiam 70-80%). Programas como Minha Casa Minha Vida têm regras diferentes (entrada menor, subsídio). Além da entrada, conta: ITBI (~3% do valor), registro em cartório (~1,5%), avaliação do banco (~R$ 3-5 mil). Posso fazer uma simulação pra você.

## P: Aceita fiador, seguro fiança ou caução?
R: Sim, trabalhamos com os 3 formatos. **Fiador**: precisa ser proprietário no município, renda 3x o aluguel, sem restrição. **Seguro fiança**: empresa aprova após análise (mais ágil, custa ~1 aluguel/ano). **Caução**: depósito equivalente a 3 aluguéis em conta vinculada. **Título de capitalização** também é aceito em alguns contratos.

## P: Como funciona a vistoria?
R: A vistoria é feita **antes da entrada** com o locatário presente. Registra estado de paredes, pisos, louças, instalações, eletrodomésticos (se mobiliado), com fotos. O documento assinado é a referência pra entrega — você devolve o imóvel no mesmo estado (descontado o desgaste natural). Vistoria de saída é feita também no final do contrato.

## P: Posso visitar o imóvel sem agendar?
R: **Não** — visitas são sempre agendadas pra garantir que o corretor esteja disponível e o imóvel preparado. Me passa: código do imóvel ou bairro de interesse + 2-3 janelas de horário, eu confirmo com o corretor responsável e te mando a confirmação.

## P: Tem imóvel pra alugar sem garantia?
R: Casos sem garantia são exceção e dependem do proprietário. Em geral, são aluguéis curtos (1-6 meses), imóveis menos disputados ou com depósito de 1-3 aluguéis adiantados. Me passa sua faixa de orçamento e perfil que eu verifico opções.

## P: Quanto tempo demora a aprovação do financiamento?
R: Da análise inicial à liberação, varia de **30 a 60 dias** em média. Depende de: agilidade na entrega de documentos, avaliação do imóvel (10-15 dias), aprovação do crédito (variável), assinatura do contrato e registro em cartório. Conte com 60-90 dias até as chaves na sua mão.

## P: A comissão é por minha conta ou da imobiliária?
R: **Compra/venda**: a comissão (~6%) é por conta do vendedor, salvo acordo diferente em contrato. **Locação**: a primeira mensalidade é geralmente do locatário (intermediação), mas administração mensal é descontada do locador. Cada caso confirma em contrato — sem surpresa.`,
      },
    ],
    contextualGuardrails: [
      "Prometer aprovação de financiamento ou crédito",
      "Negociar valor sem aval do corretor responsável",
      "Falar de comissão da agência pro cliente",
      "Confirmar disponibilidade sem checar sistema",
      "Indicar imóvel fora do perfil/orçamento do lead",
    ],
  },
};

/** Normaliza aliases de nicho pro key correto do catálogo. LLM às vezes
 * setou niche="Finanças" pra escritório contábil (≠ fintech) ou variações
 * de capitalização/acentuação. Esta função mapeia tudo pra key do catálogo.
 * Retorna null se o input não bate com nenhum catálogo. */
export function resolveNicheKey(niche: string | undefined | null): string | null {
  if (!niche) return null;
  const norm = niche.toLowerCase().trim();
  // Match exato (case-insensitive) com keys do NICHE_ASSETS
  for (const key of Object.keys(NICHE_ASSETS)) {
    if (key.toLowerCase() === norm) return key;
  }
  // Aliases comuns
  const aliases: Record<string, string> = {
    "contabil": "Contabilidade",
    "contábil": "Contabilidade",
    "contador": "Contabilidade",
    "contadora": "Contabilidade",
    "escritorio contabil": "Contabilidade",
    "escritório contábil": "Contabilidade",
    "financas": "Contabilidade",  // LLM costuma errar aqui — fintech é "Finanças" no Master
    "finanças": "Contabilidade",  // (mas catalog não tem entrada própria de fintech)
    "financeiro": "Contabilidade",
    "saude": "Saúde",
    "saúde": "Saúde",
    "clinica": "Saúde",
    "clínica": "Saúde",
    "medico": "Saúde",
    "médico": "Saúde",
    "consultorio": "Saúde",
    "consultório": "Saúde",
    "advocacia": "Advocacia",
    "juridico": "Advocacia",
    "jurídico": "Advocacia",
    "advogado": "Advocacia",
    "advogada": "Advocacia",
    "escritorio juridico": "Advocacia",
    "escritório jurídico": "Advocacia",
    "imobiliaria": "Imobiliária",
    "imobiliária": "Imobiliária",
    "imoveis": "Imobiliária",
    "imóveis": "Imobiliária",
    "corretor": "Imobiliária",
    "corretora": "Imobiliária",
  };
  return aliases[norm] ?? null;
}

/** Formata bloco textual com assets do nicho pra injetar no prompt do Vibe.
 * Vai pra fase CRIAÇÃO — indica TUDO que o Vibe deve criar de uma vez. */
export function buildNicheAssetsBlock(niche: string | undefined): string {
  if (!niche) return "";
  const resolvedKey = resolveNicheKey(niche);
  const spec = resolvedKey ? NICHE_ASSETS[resolvedKey] : null;
  if (!spec) return "";

  const tables = spec.tables.map((t) => `- \`${t.slug}\` — ${t.label} (${t.columns.length} colunas)`).join("\n");
  const cadences = spec.cadences.map((c) => `- \`${c.slug}\` — ${c.name} (${c.steps.length} mensagens)`).join("\n");
  const kbs = spec.kbTopics.map((k) => `- ${k.title}`).join("\n");
  const guardrails = spec.contextualGuardrails.map((g) => `- ${g}`).join("\n");

  return `

# 🏗️ ASSETS DETERMINÍSTICOS DO NICHO "${niche}" (Master v7.4 §13.5)

Na fase CRIAÇÃO, depois das tools básicas (set_niche, set_agent_name, etc), você DEVE criar TODOS esses assets pra entregar um agente COMPLETO:

## 📊 Tabelas (chame \`create_niche_table\` pra cada)
${tables}

## ⏱️ Cadências (chame \`create_niche_cadence\` pra cada)
${cadences}

## 📚 Tópicos de Conhecimento (chame \`seed_kb_topic\` pra cada)
${kbs}

## 🚧 Guardrails contextuais (chame \`add_guardrail\` pra cada — somam aos universais)
${guardrails}

⚠️ IMPORTANTE: Em modo personalizado/rascunho SEM cliente atribuído, tabelas NÃO podem ser criadas no banco (pertencem a cliente). Nesse caso, registre a INTENÇÃO via \`mark_pending_table\` pra criar quando o cliente for atribuído.`;
}
