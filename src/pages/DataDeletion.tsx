/**
 * Instruções de Exclusão de Dados — URL dedicada exigida pelo app review
 * da Meta ("Data Deletion Instructions URL"). URL: /data-deletion
 */
const DataDeletion = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Exclusão de Dados</h1>
        <p className="text-sm text-muted-foreground">Aikortex — como solicitar a remoção dos seus dados</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Como excluir seus dados</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Para solicitar a exclusão da sua conta e de todos os dados associados —
          incluindo dados obtidos das plataformas Meta (WhatsApp Business e
          Instagram), conversas, contatos e configurações — envie um e-mail para{" "}
          <a href="mailto:willy@magnificodigital.com" className="text-primary underline">
            willy@magnificodigital.com
          </a>{" "}
          com o assunto <span className="font-medium">"Exclusão de dados"</span>,
          informando o e-mail da conta.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">O que acontece depois</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Confirmamos o recebimento em até 48 horas e concluímos a exclusão
          definitiva em até 30 dias, abrangendo: dados de conta, tokens de acesso
          de plataformas conectadas, mensagens, leads e arquivos. Dados exigidos
          por obrigação legal (ex.: registros fiscais) são mantidos apenas pelo
          prazo legal aplicável.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Desconectar apenas as integrações Meta</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Se quiser apenas revogar o acesso do Aikortex à sua conta do WhatsApp
          Business ou Instagram (sem excluir a conta): remova a conexão em
          Configurações → Canais dentro da plataforma, e/ou remova o app
          "Aikortex" em Configurações e privacidade → Integrações comerciais na
          sua conta Meta. Os tokens são invalidados imediatamente.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Mais informações</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Consulte nossa <a href="/privacy" className="text-primary underline">Política de Privacidade</a>{" "}
          para detalhes sobre tratamento de dados conforme a LGPD.
        </p>
      </section>
    </div>
  </div>
);

export default DataDeletion;
