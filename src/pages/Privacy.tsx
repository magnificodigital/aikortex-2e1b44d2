/**
 * Política de Privacidade — página pública exigida pela análise de apps
 * da Meta (e boa prática LGPD). URL: /privacy
 */
const Privacy = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Aikortex — atualizada em 13 de julho de 2026</p>
      </header>

      <Section title="1. Quem somos">
        O Aikortex é uma plataforma que permite a agências criar, operar e vender
        agentes de inteligência artificial e ferramentas de gestão de atendimento,
        operada por Magnifico Digital ("nós"). Esta política descreve como tratamos
        dados pessoais no uso da plataforma, em conformidade com a Lei Geral de
        Proteção de Dados (LGPD, Lei nº 13.709/2018).
      </Section>

      <Section title="2. Dados que coletamos">
        (a) Dados de conta: nome, e-mail, telefone e dados de faturamento dos
        usuários que criam conta na plataforma. (b) Dados operacionais: agentes,
        configurações, contatos e leads cadastrados pelas agências. (c) Mensagens:
        conteúdo de conversas recebidas e enviadas pelos canais conectados
        (WhatsApp Business, Instagram e outros), processadas exclusivamente para
        prestar o serviço de atendimento contratado pela agência.
      </Section>

      <Section title="3. Dados das plataformas Meta">
        Quando uma agência conecta o WhatsApp Business ou o Instagram via login
        oficial da Meta, recebemos tokens de acesso e identificadores da conta
        comercial autorizada, além das mensagens trocadas com os contatos dessa
        conta. Usamos esses dados apenas para: exibir as conversas na caixa de
        entrada da agência, permitir respostas (humanas ou por agente de IA) e
        registrar leads no CRM da própria agência. Não vendemos, alugamos ou
        compartilhamos dados da plataforma Meta com terceiros, e não os usamos
        para publicidade.
      </Section>

      <Section title="4. Inteligência artificial">
        Mensagens podem ser processadas por modelos de linguagem (LLMs) de
        provedores contratados para gerar respostas automáticas configuradas pela
        agência. O conteúdo é enviado aos provedores estritamente para gerar a
        resposta, sem uso para treinamento por nossa parte.
      </Section>

      <Section title="5. Compartilhamento">
        Compartilhamos dados apenas com: (a) provedores de infraestrutura e
        processamento necessários ao serviço (hospedagem, banco de dados,
        provedores de IA, processadores de pagamento); (b) autoridades, quando
        exigido por lei. Cada agência é controladora dos dados dos seus próprios
        clientes e contatos; o Aikortex atua como operador.
      </Section>

      <Section title="6. Retenção e exclusão">
        Mantemos os dados enquanto a conta estiver ativa. Você pode solicitar a
        exclusão da sua conta e de todos os dados associados — incluindo dados
        obtidos das plataformas Meta — a qualquer momento pelo e-mail
        willy@magnificodigital.com. A exclusão é concluída em até 30 dias.
      </Section>

      <Section title="7. Seus direitos (LGPD)">
        Você pode solicitar confirmação de tratamento, acesso, correção,
        anonimização, portabilidade e eliminação dos seus dados, além de revogar
        consentimentos. Canal de atendimento: willy@magnificodigital.com.
      </Section>

      <Section title="8. Segurança">
        Adotamos criptografia em trânsito, controle de acesso por perfil,
        isolamento de dados por cliente (row-level security) e armazenamento de
        credenciais em cofres segregados.
      </Section>

      <Section title="9. Alterações">
        Podemos atualizar esta política; alterações relevantes serão comunicadas
        na plataforma. O uso continuado após a atualização constitui concordância.
      </Section>
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
  </section>
);

export default Privacy;
