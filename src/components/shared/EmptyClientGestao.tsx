import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface Props {
  section: string;
  clientName: string;
}

// Mostrado quando agência está no switcher modo cliente e abre uma página de
// Gestão. Estas tabelas ainda não são multi-tenant por cliente (schema com
// client_id virá em F2/F3), então mostrar dados aqui vazaria info da agência.
// Solução honesta: vazio com mensagem explicando que o cliente vai preencher.
const EmptyClientGestao = ({ section, clientName }: Props) => (
  <div className="p-6 lg:p-8 max-w-3xl">
    <Card>
      <CardContent className="p-10 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">{section} — espaço de {clientName}</h2>
        <p className="text-sm text-muted-foreground">
          Este módulo é um ERP/CRM próprio do cliente. Ainda não há dados aqui —
          eles serão criados quando {clientName} acessar o workspace e começar
          a preencher.
        </p>
        <p className="text-[10px] text-muted-foreground/70">
          Volte pra "Agência" no seletor do topo pra ver os dados da sua operação.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default EmptyClientGestao;
