import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type PartnerEvent } from "@/types/partner";
import { Calendar, Mic, Radio, Users, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const MOCK_EVENTS: PartnerEvent[] = [
  { id: "1", title: "IAgora Summit 2025", date: "2025-06-15", type: "conference", status: "open", speakerSlots: true, registered: false },
  { id: "2", title: "Webinar: Agentes IA na Prática", date: "2025-04-10", type: "webinar", status: "upcoming", speakerSlots: false, registered: true },
  { id: "3", title: "Workshop: CRM Inteligente", date: "2025-05-20", type: "workshop", status: "open", speakerSlots: false, registered: false },
  { id: "4", title: "SintonIA Podcast — Ep. 42", date: "2025-04-05", type: "podcast", status: "open", speakerSlots: true, registered: false },
];

const typeIcons = { conference: Calendar, webinar: Users, workshop: Mic, podcast: Radio };
const typeLabels = { conference: "Conferência", webinar: "Webinar", workshop: "Workshop", podcast: "Podcast" };
const statusLabels = { upcoming: "Em breve", open: "Aberto", closed: "Encerrado" };

const EventsMediaTab = () => {
  const [events, setEvents] = useState(MOCK_EVENTS);

  const handleRegister = (id: string) => {
    setEvents(events.map((e) => e.id === id ? { ...e, registered: true } : e));
    toast.success("Inscrição realizada!");
  };

  const handleApplySpeaker = (id: string) => {
    toast.success("Candidatura de speaker enviada!");
  };

  return (
    <div className="space-y-6">
      {/* Events */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Eventos & Mídia</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => {
            const Icon = typeIcons[event.type];
            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <Badge variant="outline" className="text-xs">{typeLabels[event.type]}</Badge>
                    </div>
                    <Badge variant={event.status === "open" ? "default" : "secondary"} className="text-xs">
                      {statusLabels[event.status]}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">{event.title}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                  <div className="flex gap-2">
                    {event.registered ? (
                      <Button size="sm" variant="outline" disabled className="flex-1"><Check className="w-3 h-3 mr-1" />Inscrito</Button>
                    ) : event.status !== "closed" ? (
                      <Button size="sm" className="flex-1" onClick={() => handleRegister(event.id)}>Inscrever-se</Button>
                    ) : null}
                    {event.speakerSlots && event.status === "open" && (
                      <Button size="sm" variant="secondary" onClick={() => handleApplySpeaker(event.id)}>
                        <Mic className="w-3 h-3 mr-1" />Speaker
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Media */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Radio className="w-5 h-5 text-primary" />SintonIA — Participe da mídia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Aplique para participar do podcast SintonIA, envie a história da sua agência e seja destaque no ecossistema AIHUB.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Candidatura de podcast enviada!")}>
              <Mic className="w-3 h-3 mr-1" />Aplicar para podcast
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("História enviada!")}>
              <ExternalLink className="w-3 h-3 mr-1" />Enviar história
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventsMediaTab;
