import { Lock, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/home")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.open("mailto:suporte@aikortex.com")}>
            <MessageCircle className="h-4 w-4" />
            Falar com suporte
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
