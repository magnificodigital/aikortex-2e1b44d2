import { useState } from "react";
import { BookOpen, ChevronRight, ArrowLeft, Bot, Workflow, MessageSquare, Users, DollarSign, CheckSquare, Settings, ShoppingCart, Send, AppWindow, LayoutTemplate, Video, FileText } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Tutorial {
  id: string;
  title: string;
  description: string;
  icon: typeof Bot;
  category: string;
  readTime: string;
  content: string;
}

const tutorials: Tutorial[] = [
  {
    id: "agentes",
    title: "Agentes de IA",
    description: "Aprenda a criar, configurar e testar agentes inteligentes para atendimento, vendas e operações.",
    icon: Bot,
    category: "Aikortex",
    readTime: "8 min",
    content: `# Agentes de IA

## O que são Agentes?
Agentes são assistentes de inteligência artificial configuráveis que podem interagir com seus clientes, qualificar leads, responder dúvidas e executar ações automatizadas.

## Como criar um Agente
1. Acesse **Aikortex → Agentes** no menu lateral.
2. Clique em **"Novo Agente"** no canto superior direito.
3. Escolha um modelo pré-configurado ou comece do zero.

## Configuração do Agente
Na tela de configuração você encontrará as seguintes abas:

### Aba "Agente"
- **Identidade**: Nome, avatar e descrição do agente.
- **Objetivo**: Defina o propósito principal (ex: qualificar leads, atender clientes).
- **Prompt / Instruções**: Escreva as instruções detalhadas de comportamento.
- **Modelo de IA**: Selecione o LLM (GPT, Gemini, Claude, etc.).
- **Temperatura**: Controle a criatividade das respostas (0 = preciso, 1 = criativo).

### Aba "Integrações"
- Configure as chaves de API do provedor de IA escolhido.
- Conecte MCPs, APIs externas e Webhooks.

### Aba "Arquivos / Conhecimento"
- Envie documentos (PDF, TXT, DOCX) para criar a base de conhecimento.
- Insira URLs para o agente consultar.

### Aba "Canais"
- Conecte o agente ao WhatsApp, site, redes sociais e outros canais.

## Testando o Agente
- Use o chat de teste na lateral direita da tela do agente.
- Envie mensagens e veja como o agente responde em tempo real.
- Ajuste prompt e configurações até obter o comportamento desejado.

## Dicas
- Comece com um objetivo claro e específico.
- Use exemplos no prompt para guiar o comportamento.
- Teste com diferentes cenários antes de publicar.`,
  },
  {
    id: "flows",
    title: "Flows e Automações",
    description: "Domine o construtor visual de fluxos: blocos, conexões, templates e execução.",
    icon: Workflow,
    category: "Aikortex",
    readTime: "12 min",
    content: `# Flows e Automações

## O que são Flows?
Flows são fluxos visuais de automação que conectam blocos de ações, decisões e integrações para criar processos inteligentes sem código.

## Acessando o Flow Builder
1. Vá em **Aikortex → Flows** no menu lateral.
2. Clique em **"Novo Fluxo"** ou selecione um template existente.

## 3 Formas de Criar Fluxos

### 1. Modelos Prontos
- Acesse a biblioteca de templates organizados por categoria.
- Escolha um template (ex: SDR Inbound, FAQ Inteligente).
- O fluxo será criado automaticamente para você editar.

### 2. Copilot IA
- Use o painel do Copilot à esquerda do canvas.
- Descreva o que deseja em linguagem natural.
- Exemplos: "Crie um fluxo de qualificação de leads", "Adicione uma etapa de captura de e-mail".

### 3. Construção Manual
- Arraste blocos da paleta à direita para o canvas.
- Conecte os blocos arrastando de uma saída para uma entrada.
- Configure cada bloco clicando nele.

## Categorias de Blocos
- **Triggers**: Iniciam o fluxo (Chat, Webhook, Agendamento).
- **Processing**: Processam dados (Agente IA, API, Parser).
- **Logic**: Decisões (If/Else, Switch, Router).
- **Control Flow**: Controle (Delay, Loop, Retry).
- **Output**: Saídas (Mensagem, E-mail, WhatsApp).
- **Data Capture**: Captura de dados (Nome, E-mail, Telefone).
- **CRM Actions**: Ações comerciais (Criar Lead, Mover Etapa).
- **Knowledge/IA**: Consultas inteligentes (RAG, Memória).
- **Database**: Dados (Criar/Buscar Registro).
- **Dev/Advanced**: Avançado (Código, HTTP, JSON).

## Executando um Fluxo
1. Clique em **"Run"** na barra superior para testar.
2. Acompanhe a execução visual no canvas.
3. Verifique logs e resultados na aba de Logs.

## Deploy
- Clique em **"Deploy"** para publicar o fluxo em produção.
- Fluxos com triggers automáticos começarão a executar imediatamente.`,
  },
  {
    id: "mensagens",
    title: "Central de Mensagens",
    description: "Gerencie todas as conversas com clientes em um único lugar.",
    icon: MessageSquare,
    category: "Aikortex",
    readTime: "5 min",
    content: `# Central de Mensagens

## Visão Geral
A Central de Mensagens unifica todas as conversas com clientes vindas de diferentes canais (WhatsApp, chat do site, e-mail, redes sociais).

## Navegação
- **Todas as Conversas**: Visualize todas as conversas ativas.
- **Minhas**: Conversas atribuídas a você.
- **Não Atribuídas**: Conversas aguardando atribuição.
- **Sem Resposta**: Conversas que precisam de atenção.

## Funcionalidades
- Responda diretamente pelo painel de chat.
- Atribua conversas a membros da equipe.
- Use etiquetas para organizar por prioridade.
- Visualize o histórico completo de cada contato.
- Filtre por pastas, equipes e labels.

## Dicas
- Configure notificações para não perder mensagens importantes.
- Use respostas rápidas para agilizar o atendimento.`,
  },
  {
    id: "disparos",
    title: "Disparos em Massa",
    description: "Envie mensagens em larga escala para listas segmentadas de contatos.",
    icon: Send,
    category: "Aikortex",
    readTime: "5 min",
    content: `# Disparos em Massa

## O que são Disparos?
Disparos permitem enviar mensagens em larga escala para listas segmentadas de contatos via WhatsApp, e-mail ou SMS.

## Como Criar um Disparo
1. Acesse **Aikortex → Disparos**.
2. Clique em **"Novo Disparo"**.
3. Selecione o canal (WhatsApp, E-mail, SMS).
4. Escolha ou crie a lista de destinatários.
5. Redija a mensagem ou selecione um template.
6. Agende ou envie imediatamente.

## Boas Práticas
- Segmente sua base para mensagens relevantes.
- Respeite os limites de envio de cada canal.
- Use variáveis para personalizar (nome, empresa, etc.).
- Acompanhe métricas de entrega, abertura e resposta.`,
  },
  {
    id: "clientes",
    title: "Gestão de Clientes",
    description: "Cadastre, organize e acompanhe seus clientes com visão 360°.",
    icon: Users,
    category: "Gestão",
    readTime: "6 min",
    content: `# Gestão de Clientes

## Visão Geral
O módulo de Clientes permite cadastrar, organizar e acompanhar toda a base de clientes da empresa.

## Cadastrando um Cliente
1. Acesse **Gestão → Clientes**.
2. Clique em **"Novo Cliente"**.
3. Preencha os dados: nome, e-mail, telefone, empresa, segmento.
4. Salve o registro.

## Perfil do Cliente
Ao clicar em um cliente, você acessa:
- **Dados gerais**: Informações de contato e empresa.
- **Histórico**: Timeline de interações e atividades.
- **Contratos**: Contratos associados.
- **Métricas**: Health score, engajamento, satisfação.

## Filtros e Busca
- Filtre por status, segmento, responsável e tags.
- Use a busca para localizar clientes rapidamente.`,
  },
  {
    id: "vendas",
    title: "Vendas e CRM",
    description: "Gerencie seu pipeline de vendas com kanban visual e automações.",
    icon: ShoppingCart,
    category: "Gestão",
    readTime: "7 min",
    content: `# Vendas e CRM

## Pipeline Visual
O CRM oferece uma visão kanban do seu pipeline de vendas com colunas personalizáveis para cada etapa.

## Gerenciando Leads
1. Acesse **Gestão → Vendas → CRM**.
2. Adicione leads manualmente ou via integrações.
3. Arraste cards entre as colunas para mover etapas.
4. Clique em um lead para ver detalhes e histórico.

## Reuniões
- Agende reuniões diretamente pelo módulo de Vendas.
- Use a videoconferência integrada.
- Registre notas e próximos passos automaticamente.

## Métricas
- Acompanhe taxa de conversão por etapa.
- Visualize previsão de receita.
- Analise performance individual e da equipe.`,
  },
  {
    id: "financeiro",
    title: "Financeiro",
    description: "Controle receitas, despesas, faturas e fluxo de caixa.",
    icon: DollarSign,
    category: "Gestão",
    readTime: "6 min",
    content: `# Financeiro

## Módulos Disponíveis
- **Visão Geral**: Dashboard com métricas financeiras principais.
- **Faturas**: Crie e gerencie faturas para clientes.
- **Despesas**: Registre e categorize despesas.
- **Fluxo de Caixa**: Acompanhe entradas e saídas.
- **Relatórios**: Gere relatórios financeiros detalhados.

## Criando uma Fatura
1. Acesse **Financeiro → Faturas**.
2. Clique em **"Nova Fatura"**.
3. Selecione o cliente e adicione itens.
4. Defina condições de pagamento.
5. Envie ao cliente.

## Registrando Despesas
1. Acesse **Financeiro → Despesas**.
2. Clique em **"Nova Despesa"**.
3. Preencha valor, categoria e data.
4. Anexe comprovantes se necessário.`,
  },
  {
    id: "tarefas",
    title: "Tarefas",
    description: "Organize e acompanhe tarefas da equipe com múltiplas visualizações.",
    icon: CheckSquare,
    category: "Gestão",
    readTime: "5 min",
    content: `# Tarefas

## Visualizações
- **Lista**: Visão clássica em tabela.
- **Kanban**: Arraste cards entre colunas de status.
- **Calendário**: Veja tarefas por data.
- **Minhas Tarefas**: Foco nas suas tarefas.
- **Equipe**: Visão de carga de trabalho da equipe.

## Criando uma Tarefa
1. Acesse **Gestão → Tarefas**.
2. Clique em **"Nova Tarefa"**.
3. Defina título, descrição, responsável e prazo.
4. Atribua prioridade e tags.

## Acompanhamento
- Métricas de conclusão e produtividade.
- Filtros por status, prioridade, responsável e projeto.
- Notificações de prazo e atualizações.`,
  },
  {
    id: "contratos",
    title: "Contratos",
    description: "Crie, gerencie e assine contratos digitalmente.",
    icon: FileText,
    category: "Gestão",
    readTime: "5 min",
    content: `# Contratos

## Funcionalidades
- Criação de contratos com templates.
- Assinatura digital integrada.
- Acompanhamento de status (rascunho, enviado, assinado, expirado).
- Vínculo automático com clientes.

## Criando um Contrato
1. Acesse **Gestão → Clientes → Contratos**.
2. Clique em **"Novo Contrato"**.
3. Selecione o cliente e preencha os dados.
4. Adicione cláusulas e valores.
5. Envie para assinatura.

## Acompanhamento
- Veja métricas de contratos ativos, expirados e pendentes.
- Receba alertas de vencimento.`,
  },
  {
    id: "reunioes",
    title: "Reuniões e Videoconferência",
    description: "Agende e realize reuniões com videoconferência integrada.",
    icon: Video,
    category: "Gestão",
    readTime: "5 min",
    content: `# Reuniões e Videoconferência

## Funcionalidades
- Agende reuniões com clientes e equipe.
- Videoconferência integrada com sala de espera.
- Tradução em tempo real.
- Sales Mentor: assistente IA durante a reunião.
- Chat em tempo real entre participantes.

## Criando uma Reunião
1. Acesse **Vendas → Reuniões**.
2. Clique em **"Nova Reunião"**.
3. Defina título, data e participantes.
4. Compartilhe o link da sala.

## Durante a Reunião
- Use os controles de áudio e vídeo.
- Ative o Sales Mentor para dicas em tempo real.
- Utilize o chat para compartilhar links e notas.`,
  },
  {
    id: "apps",
    title: "App Builder",
    description: "Construa aplicações personalizadas com IA assistida.",
    icon: AppWindow,
    category: "Aikortex",
    readTime: "5 min",
    content: `# App Builder

## O que é?
O App Builder permite criar aplicações web personalizadas utilizando IA como assistente de desenvolvimento.

## Como Usar
1. Acesse **Aikortex → Apps**.
2. Descreva o que deseja construir no chat.
3. A IA irá gerar o código e a preview em tempo real.
4. Edite, ajuste e publique.

## Funcionalidades
- Chat com IA para construção assistida.
- Preview em tempo real.
- Editor de código integrado.
- Visualização de banco de dados.
- Terminal integrado.`,
  },
  {
    id: "templates",
    title: "Templates",
    description: "Utilize modelos prontos para acelerar a criação de agentes e fluxos.",
    icon: LayoutTemplate,
    category: "Aikortex",
    readTime: "4 min",
    content: `# Templates

## O que são?
Templates são modelos pré-configurados de agentes e fluxos que você pode usar como ponto de partida.

## Categorias Disponíveis
- **Comercial**: SDR, qualificação, follow-up.
- **Atendimento**: FAQ, triagem, suporte.
- **Customer Success**: Onboarding, reengajamento.
- **Operação**: Aprovações, coleta de documentos.
- **Marketing**: Captura e nutrição de leads.

## Como Usar um Template
1. Acesse **Aikortex → Templates**.
2. Navegue pelas categorias ou busque.
3. Clique em um template para ver detalhes.
4. Clique em **"Usar Template"** para criar uma cópia editável.`,
  },
  {
    id: "configuracoes",
    title: "Configurações",
    description: "Ajuste preferências, integrações, canais e permissões da plataforma.",
    icon: Settings,
    category: "Sistema",
    readTime: "5 min",
    content: `# Configurações

## Seções Disponíveis

### Geral
- Nome do workspace e preferências.
- Tema (claro/escuro).
- Idioma e fuso horário.

### Integrações
- Configure chaves de API dos provedores de IA.
- Conecte ferramentas externas (CRM, e-mail, etc.).
- Gerencie webhooks.

### Canais
- Configure WhatsApp Business.
- Conecte redes sociais.
- Configure widget de chat para site.

### Equipe e Permissões
- Convide membros da equipe.
- Defina papéis e permissões.
- Gerencie acessos.

### Faturamento
- Visualize seu plano atual.
- Gerencie métodos de pagamento.
- Acesse histórico de faturas.`,
  },
];

const categoryColors: Record<string, string> = {
  Aikortex: "bg-primary/10 text-primary",
  Gestão: "bg-accent text-accent-foreground",
  Sistema: "bg-muted text-muted-foreground",
};

const Tutorials = () => {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);

  const grouped = tutorials.reduce<Record<string, Tutorial[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  if (selectedTutorial) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-8 px-4">
          <Button variant="ghost" size="sm" className="mb-6 gap-2" onClick={() => setSelectedTutorial(null)}>
            <ArrowLeft className="w-4 h-4" /> Voltar aos Tutoriais
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <selectedTutorial.icon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{selectedTutorial.title}</h1>
          </div>
          <div className="flex items-center gap-2 mb-6">
            <Badge className={categoryColors[selectedTutorial.category]}>{selectedTutorial.category}</Badge>
            <span className="text-xs text-muted-foreground">Leitura: {selectedTutorial.readTime}</span>
          </div>
          <Separator className="mb-6" />
          <ScrollArea className="h-[calc(100vh-280px)]">
            <article className="prose prose-sm dark:prose-invert max-w-none">
              {selectedTutorial.content.split("\n").map((line, i) => {
                if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mt-6 mb-3 text-foreground">{line.slice(2)}</h1>;
                if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="text-base font-medium mt-4 mb-1.5 text-foreground">{line.slice(4)}</h3>;
                if (/^\d+\.\s/.test(line)) return <p key={i} className="ml-4 mb-1 text-sm text-foreground/90">{line}</p>;
                if (line.startsWith("- ")) return <p key={i} className="ml-4 mb-1 text-sm text-foreground/90">• {line.slice(2)}</p>;
                if (line.trim() === "") return <div key={i} className="h-2" />;
                return <p key={i} className="text-sm text-foreground/90 mb-1.5">{line}</p>;
              })}
            </article>
          </ScrollArea>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Tutoriais</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Aprenda a utilizar todas as funcionalidades da plataforma.</p>

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{category}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((tutorial) => (
                <Card
                  key={tutorial.id}
                  className="cursor-pointer hover:border-primary/40 transition-colors group"
                  onClick={() => setSelectedTutorial(tutorial)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <tutorial.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">{tutorial.title}</h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tutorial.description}</p>
                      <span className="text-[10px] text-muted-foreground/70 mt-1 inline-block">{tutorial.readTime} de leitura</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Tutorials;
