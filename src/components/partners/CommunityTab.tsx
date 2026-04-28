import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type CommunityChannel } from "@/types/partner";
import { MessageCircle, Users, Hash, ExternalLink } from "lucide-react";

const MOCK_CHANNELS: CommunityChannel[] = [
  { id: "1", name: "geral", description: "Discussões gerais do ecossistema", members: 342, messages: 1280, lastActivity: "2025-03-09" },
  { id: "2", name: "automação-ia", description: "Troca de experiências sobre automação com IA", members: 189, messages: 756, lastActivity: "2025-03-09" },
  { id: "3", name: "agentes-ia", description: "Construção e deploy de agentes inteligentes", members: 145, messages: 534, lastActivity: "2025-03-08" },
  { id: "4", name: "marketplace", description: "Dúvidas e dicas sobre o marketplace", members: 98, messages: 312, lastActivity: "2025-03-08" },
  { id: "5", name: "parcerias", description: "Encontre parceiros para projetos", members: 76, messages: 198, lastActivity: "2025-03-07" },
  { id: "6", name: "cases-sucesso", description: "Compartilhe seus cases e resultados", members: 210, messages: 445, lastActivity: "2025-03-09" },
];

const CommunityTab = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-foreground">{MOCK_CHANNELS.reduce((a, c) => a + c.members, 0)}</p><p className="text-xs text-muted-foreground">Membros ativos</p></CardContent></Card>
      <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-foreground">{MOCK_CHANNELS.length}</p><p className="text-xs text-muted-foreground">Canais</p></CardContent></Card>
      <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-foreground">{MOCK_CHANNELS.reduce((a, c) => a + c.messages, 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Mensagens</p></CardContent></Card>
    </div>

    <div className="space-y-3">
      {MOCK_CHANNELS.map((ch) => (
        <Card key={ch.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                <Hash className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">{ch.name}</h4>
                <p className="text-xs text-muted-foreground">{ch.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ch.members}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{ch.messages}</span>
              </div>
              <Button size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" />Entrar</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default CommunityTab;
