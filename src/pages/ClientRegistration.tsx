import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, User, Mail, Phone, CheckCircle2 } from "lucide-react";

const ClientRegistration = () => {
  const { token } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would POST to a backend using the token
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-[hsl(var(--success))]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro realizado!</h1>
          <p className="text-muted-foreground text-sm">
            Seus dados foram enviados com sucesso. Em breve nossa equipe entrará em contato.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro de Cliente</h1>
          <p className="text-sm text-muted-foreground">
            Preencha seus dados para iniciarmos o onboarding
          </p>
        </div>

        {/* Form */}
        <div className="glass-card rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Seu nome"
                  className="pl-9"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company">Empresa</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="company"
                  placeholder="Nome da empresa"
                  className="pl-9"
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-9"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="(11) 99999-0000"
                  className="pl-9"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" className="w-full glow-primary">
              Enviar cadastro
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Link de convite: <span className="font-mono text-primary/70">{token?.slice(0, 8)}…</span>
        </p>
      </div>
    </div>
  );
};

export default ClientRegistration;
