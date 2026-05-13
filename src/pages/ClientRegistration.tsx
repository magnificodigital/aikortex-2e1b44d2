import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, User, Mail, Phone, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ClientRegistration = () => {
  const { token } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        setInviteError("Link inválido — token não encontrado.");
        return;
      }

      try {
        const { data: client, error } = await supabase
          .from("agency_clients")
          .select("id, client_name, client_email, status, agency_id")
          .eq("id", token)
          .maybeSingle();

        if (error || !client) {
          setInviteError("Convite não encontrado ou expirado.");
          setLoading(false);
          return;
        }

        if (client.status === "active") {
          setInviteError("Este cliente já está ativo.");
          setLoading(false);
          return;
        }

        const { data: agency } = await supabase
          .from("agency_profiles")
          .select("agency_name")
          .eq("id", client.agency_id)
          .maybeSingle();

        if (agency) {
          setAgencyName(agency.agency_name || "nossa plataforma");
        }

        if (client.client_name) setForm(prev => ({ ...prev, name: client.client_name }));
        if (client.client_email) setForm(prev => ({ ...prev, email: client.client_email }));

        setInviteValid(true);
      } catch {
        setInviteError("Erro ao validar convite. Tente novamente.");
      }
      setLoading(false);
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Nome e e-mail são obrigatórios.");
      return;
    }

    setValidating(true);
    try {
      const { error } = await supabase
        .from("agency_clients")
        .update({
          client_name: form.name,
          client_email: form.email,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", token);

      if (error) {
        toast.error("Erro ao salvar cadastro.");
        return;
      }

      setSubmitted(true);
    } catch {
      toast.error("Sem conexão com o servidor.");
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Link inválido</h1>
          <p className="text-muted-foreground text-sm">{inviteError}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-[hsl(var(--success))]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro realizado!</h1>
          <p className="text-muted-foreground text-sm">
            Seus dados foram enviados para {agencyName}. Em breve entrarão em contato.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro de Cliente</h1>
          <p className="text-sm text-muted-foreground">
            Complete seu cadastro para {agencyName}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" placeholder="Seu nome" className="pl-9" required
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company">Empresa</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="company" placeholder="Nome da empresa" className="pl-9" required
                  value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" className="pl-9" required
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="phone" placeholder="(11) 99999-0000" className="pl-9"
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <Button type="submit" className="w-full glow-primary" disabled={validating}>
              {validating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {validating ? "Salvando..." : "Enviar cadastro"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Convite: <span className="font-mono text-primary/70">{token?.slice(0, 8)}…</span>
        </p>
      </div>
    </div>
  );
};

export default ClientRegistration;
