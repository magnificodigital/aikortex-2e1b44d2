import { Lead, PIPELINE_STAGES, TEMPERATURE_CONFIG, LEAD_SOURCES, PipelineStage } from "@/types/crm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, Building2, User, DollarSign, Calendar, MessageSquare, Clock, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange: (leadId: string, newStage: PipelineStage) => void;
  onAddActivity: (leadId: string, activity: { type: string; description: string }) => void;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: <MessageSquare className="w-3.5 h-3.5" />,
  call: <Phone className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  meeting: <Calendar className="w-3.5 h-3.5" />,
  whatsapp: <MessageSquare className="w-3.5 h-3.5" />,
  stage_change: <ArrowRightLeft className="w-3.5 h-3.5" />,
};

const LeadDetailDialog = ({ lead, open, onOpenChange, onStageChange, onAddActivity }: Props) => {
  const [newNote, setNewNote] = useState("");

  if (!lead) return null;

  const stageCfg = PIPELINE_STAGES.find((s) => s.value === lead.stage)!;
  const tempCfg = TEMPERATURE_CONFIG[lead.temperature];
  const source = LEAD_SOURCES.find((s) => s.value === lead.source);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onAddActivity(lead.id, { type: "note", description: newNote.trim() });
    setNewNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {lead.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg">{lead.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{lead.position} • {lead.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${tempCfg.color} ${tempCfg.bg} border-0`}>{tempCfg.label}</Badge>
              <Badge className={`${stageCfg.color} ${stageCfg.bg} border-0`}>{stageCfg.label}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span className="truncate">{lead.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{lead.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="font-semibold text-foreground">R$ {lead.value.toLocaleString("pt-BR")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{source?.icon}</span>
            <span>{source?.label}</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Estágio do Pipeline</label>
          <Select value={lead.stage} onValueChange={(v) => onStageChange(lead.id, v as PipelineStage)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="timeline" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="timeline" className="flex-1">Atividades</TabsTrigger>
            <TabsTrigger value="info" className="flex-1">Informações</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar nota ou observação..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <Button onClick={handleAddNote} size="sm" className="self-end">
                Salvar
              </Button>
            </div>

            <div className="space-y-3">
              {lead.activities.slice().reverse().map((activity) => (
                <div key={activity.id} className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
                    {ACTIVITY_ICONS[activity.type] || <Clock className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{activity.createdBy}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(activity.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Empresa</label>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{lead.company}</p>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Cargo</label>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{lead.position}</p>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Responsável</label>
                <p className="text-sm font-medium text-foreground">{lead.assignee}</p>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Criado em</label>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(lead.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
            {lead.tags.length > 0 && (
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tags</label>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {lead.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            {lead.notes && (
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Observações</label>
                <p className="text-sm text-foreground mt-1">{lead.notes}</p>
              </div>
            )}
            {lead.lostReason && (
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Motivo da perda</label>
                <p className="text-sm text-destructive mt-1">{lead.lostReason}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailDialog;
