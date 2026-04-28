import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TIER_CONFIG, type PartnerProfile } from "@/types/partner";
import { Upload, Globe, Mail, Award, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  profile: PartnerProfile;
  onUpdate: (p: PartnerProfile) => void;
}

const SPECIALIZATION_OPTIONS = [
  "Automação IA", "Agentes de IA", "CRM", "Marketing Digital",
  "Desenvolvimento SaaS", "Agentes de Voz", "Consultoria IA", "E-commerce",
];

const PartnerProfileTab = ({ profile, onUpdate }: Props) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const tier = TIER_CONFIG[profile.tier];
  const selectedSpecializations = Array.isArray(draft.specializations) ? draft.specializations : [];

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const handleSave = () => {
    onUpdate({ ...draft, specializations: selectedSpecializations });
    setEditing(false);
    toast.success("Perfil atualizado!");
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const toggleSpec = (s: string) => {
    const specs = selectedSpecializations.includes(s)
      ? selectedSpecializations.filter((x) => x !== s)
      : [...selectedSpecializations, s];
    setDraft({ ...draft, specializations: specs });
  };

  return (
    <div className="space-y-6">
      {/* Tier banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className={`w-8 h-8 ${tier.color}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Nível {tier.label}</h2>
              <p className="text-sm text-muted-foreground">Parceiro ativo desde {new Date(profile.joinedAt).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
          <div className="hidden md:flex gap-6 text-center">
            <div><p className="text-2xl font-bold text-foreground">{profile.clientsServed}</p><p className="text-xs text-muted-foreground">Clientes</p></div>
            <div><p className="text-2xl font-bold text-foreground">R$ {(profile.revenue / 1000).toFixed(0)}k</p><p className="text-xs text-muted-foreground">Receita</p></div>
            <div><p className="text-2xl font-bold text-foreground">{profile.solutionsPublished}</p><p className="text-xs text-muted-foreground">Soluções</p></div>
            <div><p className="text-2xl font-bold text-foreground">{profile.certifications.length}</p><p className="text-xs text-muted-foreground">Certificações</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Perfil do Parceiro</CardTitle>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
            ) : (
              <Button size="sm" onClick={handleSave}><Save className="w-4 h-4 mr-1" />Salvar</Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={draft.logo} />
                <AvatarFallback className="text-xl">{draft.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {editing && (
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="w-4 h-4" /> Alterar logo
                  </div>
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome da agência</Label>
                {editing ? (
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                ) : (
                  <p className="text-sm text-foreground mt-1">{profile.name}</p>
                )}
              </div>
              <div>
                <Label>Email</Label>
                {editing ? (
                  <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                ) : (
                  <p className="text-sm text-foreground mt-1 flex items-center gap-1"><Mail className="w-3 h-3" />{profile.email}</p>
                )}
              </div>
              <div>
                <Label>Website</Label>
                {editing ? (
                  <Input value={draft.website || ""} onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
                ) : (
                  <p className="text-sm text-foreground mt-1 flex items-center gap-1"><Globe className="w-3 h-3" />{profile.website || "—"}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              {editing ? (
                <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{profile.description}</p>
              )}
            </div>

            <div>
              <Label>Especializações</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SPECIALIZATION_OPTIONS.map((s) => (
                  <Badge
                    key={s}
                    variant={draft.specializations.includes(s) ? "default" : "outline"}
                    className={editing ? "cursor-pointer" : ""}
                    onClick={() => editing && toggleSpec(s)}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Benefícios {tier.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {tier.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">{b}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerProfileTab;
