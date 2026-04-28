import { useState, useEffect } from "react";
import {
  BookOpen, X, ChevronRight, ArrowLeft, Search,
  Bot, Workflow, MessageSquare, Users, DollarSign,
  CheckSquare, Settings, ShoppingCart, Send, AppWindow,
  LayoutTemplate, Video, FileText, HelpCircle, Shield,
  Zap, Globe, Mail, Phone, Home, LifeBuoy, Play,
  Clock, MessageCircle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  icon_name: string;
  read_time: string;
  sort_order: number;
  video_url: string;
  article_type: string;
  collection: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const iconMap: Record<string, typeof Bot> = {
  Bot, Workflow, MessageSquare, Users, DollarSign, CheckSquare,
  Settings, ShoppingCart, Send, AppWindow, LayoutTemplate, Video,
  FileText, HelpCircle, BookOpen, Shield, Zap, Globe, Mail, Phone,
  Play, LifeBuoy, Home,
};

type TabType = "home" | "articles" | "contact" | "tickets";

const HelpBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<TabType>("home");
  const [selected, setSelected] = useState<HelpArticle | null>(null);
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [sendingTicket, setSendingTicket] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen || loaded) return;
    supabase
      .from("help_articles")
      .select("id,title,description,content,category,icon_name,read_time,sort_order,video_url,article_type,collection")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setArticles(data as HelpArticle[]);
        setLoaded(true);
      });
  }, [isOpen, loaded]);

  const fetchTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("id,subject,message,status,admin_reply,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setTickets(data as SupportTicket[]);
  };

  useEffect(() => {
    if (tab === "tickets" && user) fetchTickets();
  }, [tab, user]);

  const filtered = search.trim()
    ? articles.filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase())
      )
    : articles;

  const grouped = filtered.reduce<Record<string, HelpArticle[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  const collections = [...new Set(articles.map((a) => a.collection).filter(Boolean))];

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    return url;
  };

  const renderContent = (text: string) =>
    text.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return <h1 key={i} className="text-base font-bold mt-4 mb-2 text-foreground">{line.slice(2)}</h1>;
      if (line.startsWith("## ")) return <h2 key={i} className="text-sm font-semibold mt-3 mb-1.5 text-foreground">{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-medium mt-2 mb-1 text-foreground">{line.slice(4)}</h3>;
      if (/^\d+\.\s/.test(line)) return <p key={i} className="ml-3 mb-0.5 text-xs text-foreground/90">{line}</p>;
      if (line.startsWith("- ")) return <p key={i} className="ml-3 mb-0.5 text-xs text-foreground/90">• {line.slice(2)}</p>;
      if (line.trim() === "") return <div key={i} className="h-1.5" />;
      return <p key={i} className="text-xs text-foreground/90 mb-1">{line}</p>;
    });

  const getIcon = (name: string) => iconMap[name] || BookOpen;

  const handleSendTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error("Preencha assunto e mensagem");
      return;
    }
    if (!user) { toast.error("Faça login para enviar"); return; }
    setSendingTicket(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: ticketSubject,
      message: ticketMessage,
    });
    setSendingTicket(false);
    if (error) { toast.error("Erro ao enviar mensagem"); return; }
    toast.success("Mensagem enviada! Responderemos em breve.");
    setTicketSubject("");
    setTicketMessage("");
    setTab("tickets");
    fetchTickets();
  };

  const statusLabel: Record<string, { text: string; className: string }> = {
    open: { text: "Aberto", className: "bg-amber-500/10 text-amber-600" },
    in_progress: { text: "Em análise", className: "bg-blue-500/10 text-blue-600" },
    resolved: { text: "Resolvido", className: "bg-emerald-500/10 text-emerald-600" },
    closed: { text: "Fechado", className: "bg-muted text-muted-foreground" },
  };

  const goBack = () => {
    if (selected) { setSelected(null); return; }
    setTab("home");
    setSearch("");
  };

  const showBack = selected || tab !== "home";

  // ── ARTICLE DETAIL VIEW ──
  const renderArticleDetail = () => (
    <ScrollArea className="px-5 py-4" style={{ height: "min(460px, calc(100vh - 240px))" }}>
      {selected!.video_url && (
        <div className="mb-4 rounded-lg overflow-hidden bg-muted aspect-video">
          <iframe
            src={getVideoEmbedUrl(selected!.video_url) || ""}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={selected!.title}
          />
        </div>
      )}
      {selected!.article_type === "video" && !selected!.video_url && (
        <div className="mb-4 rounded-lg bg-muted flex items-center justify-center aspect-video">
          <Play className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <div>{renderContent(selected!.content)}</div>
    </ScrollArea>
  );

  // ── HOME VIEW ──
  const renderHome = () => (
    <div className="flex flex-col" style={{ height: "min(460px, calc(100vh - 240px))" }}>
      <div className="px-5 pt-4 pb-2">
        <p className="text-sm font-semibold text-foreground mb-1">👋 Como podemos ajudar?</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar artigos, vídeos..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (e.target.value) setTab("articles"); }}
            className="pl-9 h-8 text-xs border-border"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 pb-3">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 mb-4 px-1">
          <button onClick={() => setTab("articles")} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-foreground">Tutoriais</span>
          </button>
          <button onClick={() => setTab("contact")} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-foreground">Falar com Suporte</span>
          </button>
        </div>

        {/* Video tutorials highlight */}
        {articles.filter((a) => a.article_type === "video").length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
              Vídeos em destaque
            </p>
            <div className="space-y-1.5">
              {articles.filter((a) => a.article_type === "video").slice(0, 3).map((article) => (
                <button key={article.id} onClick={() => { setSelected(article); setTab("articles"); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-accent/60 transition-colors group">
                  <div className="p-1.5 rounded-md bg-red-500/10 shrink-0">
                    <Play className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{article.title}</p>
                    <p className="text-[10px] text-muted-foreground">{article.read_time}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collections */}
        {collections.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
              Coleções
            </p>
            <div className="space-y-1">
              {collections.map((col) => (
                <button key={col} onClick={() => { setSearch(col); setTab("articles"); }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left hover:bg-accent/60 transition-colors group">
                  <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{col}</span>
                  <Badge variant="outline" className="ml-auto text-[9px]">
                    {articles.filter((a) => a.collection === col).length}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent articles */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
            Artigos populares
          </p>
          <div className="space-y-1">
            {articles.slice(0, 5).map((article) => {
              const Icon = getIcon(article.icon_name);
              return (
                <button key={article.id} onClick={() => { setSelected(article); setTab("articles"); }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left hover:bg-accent/60 transition-colors group">
                  <div className="p-1.5 rounded-md bg-primary/10 shrink-0"><Icon className="w-3.5 h-3.5 text-primary" /></div>
                  <p className="text-xs font-medium text-foreground truncate flex-1">{article.title}</p>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Tickets shortcut */}
      {user && (
        <div className="px-4 py-2 border-t border-border">
          <button onClick={() => setTab("tickets")} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left hover:bg-accent/60 transition-colors text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Meus chamados</span>
          </button>
        </div>
      )}
    </div>
  );

  // ── ARTICLES LIST VIEW ──
  const renderArticlesList = () => (
    <div className="flex flex-col" style={{ height: "min(460px, calc(100vh - 240px))" }}>
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar artigos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-xs border-border" />
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 pb-3">
        {Object.entries(grouped).length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            {loaded ? "Nenhum artigo encontrado." : "Carregando..."}
          </p>
        )}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">{category}</p>
            <div className="space-y-1">
              {items.map((article) => {
                const Icon = article.article_type === "video" ? Play : getIcon(article.icon_name);
                const iconBg = article.article_type === "video" ? "bg-red-500/10" : "bg-primary/10";
                const iconColor = article.article_type === "video" ? "text-red-500" : "text-primary";
                return (
                  <button key={article.id} onClick={() => setSelected(article)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-accent/60 transition-colors group">
                    <div className={cn("p-1.5 rounded-md shrink-0", iconBg)}><Icon className={cn("w-3.5 h-3.5", iconColor)} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-foreground truncate">{article.title}</p>
                        {article.article_type === "video" && <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">Vídeo</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{article.description}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );

  // ── CONTACT FORM ──
  const renderContact = () => (
    <div className="flex flex-col px-5 py-4" style={{ height: "min(460px, calc(100vh - 240px))" }}>
      <p className="text-sm font-semibold text-foreground mb-1">Envie uma mensagem</p>
      <p className="text-[11px] text-muted-foreground mb-4">Nossa equipe responderá o mais breve possível.</p>
      <div className="space-y-3 flex-1">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-foreground">Assunto</label>
          <Input value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} placeholder="Ex: Dúvida sobre flows" className="h-8 text-xs" />
        </div>
        <div className="space-y-1 flex-1">
          <label className="text-[11px] font-medium text-foreground">Mensagem</label>
          <Textarea value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} placeholder="Descreva sua dúvida ou problema..." className="min-h-[120px] text-xs resize-none" />
        </div>
      </div>
      <Button size="sm" className="w-full mt-4 gap-1.5" onClick={handleSendTicket} disabled={sendingTicket}>
        <Send className="w-3.5 h-3.5" />
        {sendingTicket ? "Enviando..." : "Enviar Mensagem"}
      </Button>
    </div>
  );

  // ── TICKETS LIST ──
  const renderTickets = () => (
    <div className="flex flex-col" style={{ height: "min(460px, calc(100vh - 240px))" }}>
      <div className="px-5 pt-4 pb-2">
        <p className="text-sm font-semibold text-foreground">Meus Chamados</p>
        <p className="text-[10px] text-muted-foreground">Acompanhe suas solicitações de suporte.</p>
      </div>
      <ScrollArea className="flex-1 px-4 pb-3">
        {tickets.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Nenhum chamado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => {
              const st = statusLabel[t.status] || statusLabel.open;
              return (
                <div key={t.id} className="rounded-lg border border-border p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-foreground flex-1">{t.subject}</p>
                    <Badge className={cn("text-[9px] shrink-0", st.className)}>{st.text}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{t.message}</p>
                  {t.admin_reply && (
                    <div className="mt-2 rounded-md bg-primary/5 p-2 border-l-2 border-primary">
                      <p className="text-[10px] font-medium text-primary mb-0.5">Resposta do suporte:</p>
                      <p className="text-[10px] text-foreground/90">{t.admin_reply}</p>
                    </div>
                  )}
                  <p className="text-[9px] text-muted-foreground/60">
                    {new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <div className="px-4 py-2 border-t border-border">
        <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={() => setTab("contact")}>
          <MessageCircle className="w-3.5 h-3.5" /> Novo Chamado
        </Button>
      </div>
    </div>
  );

  // ── HEADER TITLES ──
  const headerTitle = () => {
    if (selected) return selected.title;
    if (tab === "articles") return "Tutoriais & Guias";
    if (tab === "contact") return "Falar com Suporte";
    if (tab === "tickets") return "Meus Chamados";
    return "Central de Ajuda";
  };

  const headerSub = () => {
    if (selected) return `${selected.read_time} de leitura`;
    if (tab === "articles") return "Explore nossos artigos e vídeos";
    if (tab === "contact") return "Envie sua dúvida ou problema";
    if (tab === "tickets") return "Acompanhe suas solicitações";
    return "Tutoriais, vídeos e suporte";
  };

  return (
    <>
      <div
        className={cn(
          "fixed bottom-20 right-5 z-50 w-[400px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border bg-card shadow-2xl transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        )}
        style={{ maxHeight: "min(620px, calc(100vh - 140px))" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border rounded-t-2xl bg-primary/5">
          {showBack ? (
            <button onClick={goBack} className="p-1 rounded-md hover:bg-accent transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          ) : (
            <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="w-4 h-4 text-primary" /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{headerTitle()}</p>
            <p className="text-[10px] text-muted-foreground">{headerSub()}</p>
          </div>
          <button onClick={() => { setIsOpen(false); setTimeout(() => { setSelected(null); setTab("home"); }, 300); }} className="p-1 rounded-md hover:bg-accent transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        {selected ? renderArticleDetail() :
         tab === "home" ? renderHome() :
         tab === "articles" ? renderArticlesList() :
         tab === "contact" ? renderContact() :
         renderTickets()}
      </div>

      {/* Floating Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105",
          "bg-primary text-primary-foreground hover:shadow-xl"
        )}
        title="Central de Ajuda"
      >
        {isOpen ? <X className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
      </button>
    </>
  );
};

export default HelpBubble;
