import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Certification } from "@/types/partner";
import { Award, Lock, CheckCircle, ExternalLink } from "lucide-react";

const MOCK_CERTS: Certification[] = [
  { id: "1", name: "AI Automation Specialist", description: "Especialista em automação com inteligência artificial", courseId: "1", earnedAt: "2024-08-15", status: "earned", icon: "🤖" },
  { id: "2", name: "AI Agent Builder", description: "Construtor de agentes de IA autônomos", courseId: "2", status: "available", icon: "🧠" },
  { id: "3", name: "CRM Implementation Expert", description: "Expert em implementação de CRM inteligente", courseId: "3", earnedAt: "2024-06-20", status: "earned", icon: "📊" },
  { id: "4", name: "SaaS Builder", description: "Construtor de produtos SaaS com WebEdit", courseId: "5", status: "locked", icon: "🚀" },
  { id: "5", name: "AI Business Consultant", description: "Consultor de negócios em inteligência artificial", courseId: "6", status: "locked", icon: "💼" },
  { id: "6", name: "Voice Agent Specialist", description: "Especialista em agentes de voz com IA", courseId: "", status: "locked", icon: "🎙️" },
];

const CertificationsTab = () => {
  const earned = MOCK_CERTS.filter((c) => c.status === "earned").length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-foreground">{earned}</p><p className="text-xs text-muted-foreground">Certificações conquistadas</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-foreground">{MOCK_CERTS.filter((c) => c.status === "available").length}</p><p className="text-xs text-muted-foreground">Disponíveis</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-foreground">{MOCK_CERTS.filter((c) => c.status === "locked").length}</p><p className="text-xs text-muted-foreground">Bloqueadas</p></CardContent></Card>
      </div>

      {/* Certs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_CERTS.map((cert) => (
          <Card key={cert.id} className={`transition-all ${cert.status === "locked" ? "opacity-60" : "hover:shadow-md"}`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-3xl">{cert.icon}</span>
                {cert.status === "earned" && <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Conquistada</Badge>}
                {cert.status === "available" && <Badge variant="secondary">Disponível</Badge>}
                {cert.status === "locked" && <Badge variant="outline"><Lock className="w-3 h-3 mr-1" />Bloqueada</Badge>}
              </div>
              <h3 className="font-semibold text-foreground text-sm">{cert.name}</h3>
              <p className="text-xs text-muted-foreground">{cert.description}</p>
              {cert.earnedAt && (
                <p className="text-xs text-muted-foreground">Conquistada em {new Date(cert.earnedAt).toLocaleDateString("pt-BR")}</p>
              )}
              {cert.status === "earned" && (
                <Button size="sm" variant="outline" className="w-full"><ExternalLink className="w-3 h-3 mr-1" />Ver certificado</Button>
              )}
              {cert.status === "available" && (
                <Button size="sm" className="w-full"><Award className="w-3 h-3 mr-1" />Fazer avaliação</Button>
              )}
              {cert.status === "locked" && (
                <Button size="sm" variant="outline" className="w-full" disabled>Complete o curso primeiro</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CertificationsTab;
