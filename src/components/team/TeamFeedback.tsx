import { useState } from "react";
import { TeamMember, FeedbackEntry } from "@/types/team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, ThumbsUp, MessageSquare, Award, Send } from "lucide-react";
import { toast } from "sonner";

interface TeamFeedbackProps {
  members: TeamMember[];
}

const typeConfig = {
  praise: { label: "Elogio", icon: ThumbsUp, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/.1)]" },
  suggestion: { label: "Sugestão", icon: MessageSquare, color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning)/.1)]" },
  review: { label: "Avaliação", icon: Award, color: "text-primary", bg: "bg-primary/10" },
};

const TeamFeedback = ({ members }: TeamFeedbackProps) => {
  const [selectedMember, setSelectedMember] = useState("");
  const [feedbackType, setFeedbackType] = useState<"praise" | "suggestion" | "review">("praise");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);

  const allFeedback = members
    .flatMap((m) => m.feedback.map((f) => ({ ...f, toName: m.fullName, toId: m.id })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSend = () => {
    if (!selectedMember || !message.trim()) {
      toast.error("Selecione um membro e escreva o feedback");
      return;
    }
    toast.success("Feedback enviado com sucesso!");
    setMessage("");
    setRating(0);
  };

  return (
    <div className="space-y-4">
      {/* New feedback form */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Enviar Feedback</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Para quem?" /></SelectTrigger>
            <SelectContent>
              {members.filter((m) => m.status === "active").map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={feedbackType} onValueChange={(v) => setFeedbackType(v as typeof feedbackType)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="praise">Elogio</SelectItem>
              <SelectItem value="suggestion">Sugestão</SelectItem>
              <SelectItem value="review">Avaliação</SelectItem>
            </SelectContent>
          </Select>
          {feedbackType === "review" && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)} className="p-0.5 transition-transform hover:scale-110 active:scale-95">
                  <Star className={`w-5 h-5 ${s <= rating ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <Textarea placeholder="Escreva seu feedback..." value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[80px] text-sm mb-3" />
        <div className="flex justify-end">
          <Button size="sm" className="gap-1.5" onClick={handleSend}>
            <Send className="w-3.5 h-3.5" /> Enviar
          </Button>
        </div>
      </div>

      {/* Feedback timeline */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Histórico de Feedbacks</h3>
        <div className="space-y-3">
          {allFeedback.map((f) => {
            const tc = typeConfig[f.type];
            const Icon = tc.icon;
            return (
              <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors">
                <div className={`w-8 h-8 rounded-lg ${tc.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${tc.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium text-foreground">{f.fromName}</span>
                    <span className="text-[10px] text-muted-foreground">→</span>
                    <span className="text-xs font-medium text-foreground">{f.toName}</span>
                    <Badge variant="outline" className={`text-[9px] ${tc.color} ${tc.bg} border-0`}>{tc.label}</Badge>
                    {f.rating && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= f.rating! ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{f.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(f.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamFeedback;
