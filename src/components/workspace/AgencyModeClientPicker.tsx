import { FolderOpen, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useActiveClient } from "@/hooks/use-active-client";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 45%)`;
}

type Props = {
  resource: "agentes" | "apps";
};

const AgencyModeClientPicker = ({ resource }: Props) => {
  const navigate = useNavigate();
  const { clients, setActiveClientId } = useActiveClient();

  const handleEnter = (id: string, name: string) => {
    setActiveClientId(id);
    toast.success(`Você entrou no workspace de ${name}`);
  };

  if (clients.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Sua agência ainda não tem clientes</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {resource === "agentes" ? "Agentes" : "Apps"} são criados dentro do workspace de um
              cliente. Crie seu primeiro cliente para começar.
            </p>
          </div>
          <Button onClick={() => navigate("/clients")} className="gap-1.5">
            <Plus className="w-4 h-4" /> Criar primeiro cliente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...clients].sort((a, b) =>
    a.client_name.localeCompare(b.client_name, "pt-BR")
  );

  return (
    <Card>
      <CardContent className="p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-base font-semibold">Selecione um cliente</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {resource === "agentes" ? "Agentes" : "Apps"} são criados dentro do workspace de um
            cliente. Escolha qual cliente operar:
          </p>
        </div>

        <div className="rounded-lg border divide-y">
          {sorted.map((c) => (
            <button
              key={c.id}
              onClick={() => handleEnter(c.id, c.client_name)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors group"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className="text-[11px] font-semibold text-white"
                  style={{ backgroundColor: colorFor(c.id) }}
                >
                  {initials(c.client_name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium">{c.client_name}</span>
              <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Entrar <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">Ou crie um novo cliente:</span>
          <Button size="sm" variant="outline" onClick={() => navigate("/clients")} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Criar cliente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgencyModeClientPicker;
