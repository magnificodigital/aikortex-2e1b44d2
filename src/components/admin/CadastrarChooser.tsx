import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, User, Users, ShieldCheck, ArrowLeft } from "lucide-react";

type AgencyLite = { id: string; agency_name: string | null; user_id: string };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agencies: AgencyLite[];
  onCreateAgency: () => void;
  onCreateClient: (agencyId: string) => void;
  onCreatePlatformUser: () => void;
  onCreateAgencyUser: (agency: AgencyLite) => void;
}

/**
 * Chooser único de "Cadastrar" — guia o admin: o que criar (agência/cliente/
 * usuário) e, quando precisa, de qual agência. Reaproveita os modais existentes.
 * Resolve a confusão de ter vários botões espalhados pela Gestão.
 */
export default function CadastrarChooser({
  open, onOpenChange, agencies, onCreateAgency, onCreateClient, onCreatePlatformUser, onCreateAgencyUser,
}: Props) {
  type Screen = "type" | "user-level" | "pick-agency-client" | "pick-agency-user";
  const [screen, setScreen] = useState<Screen>("type");
  const [agencyId, setAgencyId] = useState("");

  useEffect(() => {
    if (open) { setScreen("type"); setAgencyId(""); }
  }, [open]);

  const close = () => onOpenChange(false);
  const pickedAgency = agencies.find((a) => a.id === agencyId);

  const TypeCard = ({ icon: Icon, title, desc, onClick }: { icon: any; title: string; desc: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors p-4 flex items-start gap-3"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0"><Icon className="w-5 h-5" /></div>
      <div>
        <div className="font-medium text-foreground">{title}</div>
        <p className="text-[13px] text-muted-foreground leading-snug">{desc}</p>
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {screen !== "type" && (
              <button onClick={() => setScreen(screen === "user-level" ? "type" : screen === "pick-agency-client" ? "type" : "user-level")} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            Cadastrar
          </DialogTitle>
          <DialogDescription>
            {screen === "type" && "O que você quer cadastrar?"}
            {screen === "user-level" && "Esse usuário é de qual nível?"}
            {(screen === "pick-agency-client" || screen === "pick-agency-user") && "De qual agência?"}
          </DialogDescription>
        </DialogHeader>

        {screen === "type" && (
          <div className="space-y-2.5 pt-1">
            <TypeCard icon={Building2} title="Agência" desc="Uma nova agência (cliente direto seu) + o dono dela." onClick={() => { close(); onCreateAgency(); }} />
            <TypeCard icon={User} title="Cliente" desc="Um cliente que pertence a uma agência." onClick={() => setScreen("pick-agency-client")} />
            <TypeCard icon={Users} title="Usuário" desc="Uma pessoa/login (da plataforma ou de uma agência)." onClick={() => setScreen("user-level")} />
          </div>
        )}

        {screen === "user-level" && (
          <div className="space-y-2.5 pt-1">
            <TypeCard icon={ShieldCheck} title="Da plataforma" desc="Admin do SaaS (você e sua equipe)." onClick={() => { close(); onCreatePlatformUser(); }} />
            <TypeCard icon={Users} title="De uma agência" desc="Membro da equipe de uma agência." onClick={() => setScreen("pick-agency-user")} />
          </div>
        )}

        {(screen === "pick-agency-client" || screen === "pick-agency-user") && (
          <div className="space-y-4 pt-1">
            <Select value={agencyId} onValueChange={setAgencyId}>
              <SelectTrigger><SelectValue placeholder="Escolha a agência" /></SelectTrigger>
              <SelectContent>
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.agency_name || "Sem nome"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              disabled={!agencyId}
              onClick={() => {
                if (!pickedAgency) return;
                close();
                if (screen === "pick-agency-client") onCreateClient(pickedAgency.id);
                else onCreateAgencyUser(pickedAgency);
              }}
            >
              Continuar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
