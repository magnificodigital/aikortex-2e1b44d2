/**
 * Termos de Uso — página pública (par da Política de Privacidade).
 * URL: /terms
 */
const Terms = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">Aikortex — atualizados em 13 de julho de 2026</p>
      </header>

      <Section title="1. O serviço">
        O Aikortex fornece a agências uma plataforma para criar e operar agentes
        de IA, caixa de mensagens omnichannel, CRM e ferramentas de gestão. O
        serviço é fornecido "como está", em planos com limites e preços descritos
        na própria plataforma.
      </Section>

      <Section title="2. Conta e responsabilidades">
        Você é responsável pelas credenciais da sua conta, pelo conteúdo dos
        agentes que configurar e pelo uso dos canais conectados (incluindo o
        cumprimento das políticas do WhatsApp Business e do Instagram). É vedado
        usar a plataforma para spam, conteúdo ilegal ou violação de direitos de
        terceiros.
      </Section>

      <Section title="3. Canais de terceiros">
        A conexão com plataformas de terceiros (Meta, provedores de telefonia,
        e-mail) depende das regras e disponibilidade desses serviços. A suspensão
        de uma conta pelo terceiro não é responsabilidade do Aikortex.
      </Section>

      <Section title="4. Pagamentos">
        Assinaturas são cobradas de forma recorrente via processador de pagamento.
        O cancelamento interrompe cobranças futuras e não gera reembolso
        proporcional do ciclo corrente, salvo disposição legal em contrário.
      </Section>

      <Section title="5. Propriedade intelectual">
        A plataforma, marca e código são do Aikortex. Os dados e configurações
        criados pela agência pertencem à agência.
      </Section>

      <Section title="6. Limitação de responsabilidade">
        Na máxima extensão permitida por lei, nossa responsabilidade total
        limita-se ao valor pago pela agência nos 12 meses anteriores ao evento.
        Respostas geradas por IA podem conter erros; a agência é responsável por
        revisar o comportamento dos seus agentes.
      </Section>

      <Section title="7. Encerramento">
        Podemos suspender contas que violem estes termos. Você pode encerrar sua
        conta a qualquer momento; dados são excluídos conforme a Política de
        Privacidade.
      </Section>

      <Section title="8. Contato">
        Dúvidas: willy@magnificodigital.com.
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

export default Terms;
