/**
 * AikortexMessages — inbox omnichannel da agencia (Bloco 1, camada canonica).
 *
 * Le conversations/messages (NAO whatsapp_messages — aquela e' so' log de
 * entrega). Realtime via postgres_changes. Human takeover: switch "IA
 * responde" por conversa (ai_enabled) — desligou, o webhook para de chamar
 * o agente e o humano assume.
 */
import { fnUrl } from "@/lib/supabase-url";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import ConversationList, { Conversation } from "@/components/messages/ConversationList";
import ChatArea, { ChatMessage } from "@/components/messages/ChatArea";
import ContactPanel, { ContactInfo } from "@/components/messages/ContactPanel";
import MessagesSidebar, { InboxFilter } from "@/components/messages/MessagesSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WHATSAPP_SEND_URL = fnUrl("whatsapp-send");

interface ConvRow {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  channel: string;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  ai_enabled: boolean;
  crm_contact_id: string | null;
  tags: string[] | null;
  created_at: string | null;
  last_message_direction: string | null;
  metadata: Record<string, any> | null;
}

/** role da tabela messages → shape do ChatMessage. */
function mapMessage(m: any): ChatMessage {
  return {
    id: m.id,
    sender: m.role === "system" ? "system" : m.role === "consumer" ? "contact" : "bot",
    senderName: m.role === "consumer" ? "" : "Agente",
    text: m.content,
    time: new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    isPrivate: m.role === "note",
  };
}

/** "31/05/2026" → tempo relativo curto estilo Chatwoot ("2h", "3d"). */
function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function toConversation(r: ConvRow): Conversation {
  const name = r.contact_name || r.contact_phone || "Contato";
  return {
    id: r.id,
    contactName: name,
    initials: name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    lastMessage: r.last_message_preview?.slice(0, 50) || "—",
    time: relativeTime(r.last_message_at),
    unread: r.unread_count,
    online: false,
    channel: (r.channel as Conversation["channel"]) || "whatsapp",
    inbox: r.channel === "whatsapp" ? "WhatsApp Business" : r.channel,
    status: r.status,
    labels: (r.tags ?? []).map((t) => ({ name: t, color: "bg-primary" })),
    lastOutgoing: r.last_message_direction === "outbound",
    createdAgo: relativeTime(r.created_at),
  };
}

/** Registra atividade na timeline (pill central, estilo Chatwoot). */
async function logActivity(convId: string, text: string) {
  await (supabase.from("messages" as any) as any)
    .insert({ conversation_id: convId, role: "system", content: text, content_type: "text" });
}

const AikortexMessages = () => {
  const [rows, setRows] = useState<ConvRow[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("open");
  const [loading, setLoading] = useState(true);
  const [crmLead, setCrmLead] = useState<{ stage_slug: string | null; temperature: string | null; company: string | null; email: string | null } | null>(null);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>({ view: "all", channel: null, tag: null });
  const [searchParams] = useSearchParams();
  const selectedRef = useRef<string | null>(null);
  useEffect(() => { selectedRef.current = selectedConv; }, [selectedConv]);

  // Deep-link: /aikortex/messages?conv=<id> abre direto a conversa
  // (link do botao compartilhar).
  useEffect(() => {
    const convParam = searchParams.get("conv");
    if (convParam) setSelectedConv(convParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConversations = useCallback(async () => {
    const { data, error } = await (supabase.from("conversations" as any) as any)
      .select("id, contact_name, contact_phone, channel, status, unread_count, last_message_at, last_message_preview, ai_enabled, crm_contact_id, tags, created_at, last_message_direction, metadata")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) {
      // NUNCA engolir: erro aqui geralmente e' migration nao aplicada
      // (coluna inexistente) ou RLS — mostrando, a causa aparece na hora.
      console.error("[inbox] load conversations:", error);
      toast.error(`Erro carregando conversas: ${error.message}`);
    } else if (data) {
      setRows(data as ConvRow[]);
    }
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await (supabase.from("messages" as any) as any)
      .select("id, role, content, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(500);
    setMessages(((data as any[]) ?? []).map(mapMessage));
  }, []);

  // ── Carga inicial + realtime ──
  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        loadConversations();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        const m = payload.new;
        if (m?.conversation_id && m.conversation_id === selectedRef.current) {
          setMessages((prev) => {
            if (prev.some((p) => p.id === m.id)) return prev;
            return [...prev, mapMessage(m)];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadConversations]);

  // ── Selecao: carrega mensagens + lead CRM + zera nao-lidas ──
  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv);
    (supabase.from("conversations" as any) as any)
      .update({ unread_count: 0 })
      .eq("id", selectedConv)
      .then(() => {
        setRows((prev) => prev.map((r) => r.id === selectedConv ? { ...r, unread_count: 0 } : r));
      });

    // Lead do CRM vinculado (pro painel de contato)
    setCrmLead(null);
    const row = rows.find((r) => r.id === selectedConv);
    if (row?.crm_contact_id) {
      (supabase.from("crm_contacts" as any) as any)
        .select("stage_slug, temperature, company, email")
        .eq("id", row.crm_contact_id)
        .maybeSingle()
        .then(({ data }: any) => { if (data) setCrmLead(data); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConv, loadMessages]);

  // Seleciona a primeira quando a lista carrega
  useEffect(() => {
    if (!selectedConv && rows.length > 0) setSelectedConv(rows[0].id);
  }, [rows, selectedConv]);

  const selectedRow = rows.find((r) => r.id === selectedConv) || null;

  // Filtros do sub-sidebar (canal / etiqueta / nao atendidas) — REAIS.
  const filteredRows = rows.filter((r) => {
    if (inboxFilter.channel && r.channel !== inboxFilter.channel) return false;
    if (inboxFilter.tag && !(r.tags ?? []).includes(inboxFilter.tag)) return false;
    if (inboxFilter.view === "unattended" && r.unread_count === 0) return false;
    return true;
  });
  const conversations = filteredRows.map(toConversation);
  const conversation = conversations.find((c) => c.id === selectedConv) || null;

  // Etiquetas agregadas (viram filtros no sub-sidebar)
  const allTags = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => r.tags ?? []))).sort(),
    [rows],
  );

  const toggleMute = async () => {
    if (!selectedRow) return;
    const next = { ...(selectedRow.metadata ?? {}), muted: !selectedRow.metadata?.muted };
    const { error } = await (supabase.from("conversations" as any) as any)
      .update({ metadata: next })
      .eq("id", selectedRow.id);
    if (error) { toast.error("Não consegui atualizar"); return; }
    setRows((prev) => prev.map((r) => r.id === selectedRow.id ? { ...r, metadata: next } : r));
    toast.success(next.muted ? "Conversa silenciada" : "Notificações reativadas");
  };

  const shareConversation = () => {
    if (!selectedConv) return;
    const url = `${window.location.origin}/aikortex/messages?conv=${selectedConv}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Link da conversa copiado"))
      .catch(() => toast.error("Não consegui copiar"));
  };

  const setStatus = async (status: "open" | "waiting_client" | "resolved") => {
    if (!selectedRow) return;
    const { error } = await (supabase.from("conversations" as any) as any)
      .update({ status })
      .eq("id", selectedRow.id);
    if (error) { toast.error("Não consegui atualizar o status"); return; }
    setRows((prev) => prev.map((r) => r.id === selectedRow.id ? { ...r, status } : r));
    const label = status === "resolved" ? "resolvida" : status === "waiting_client" ? "aguardando cliente" : "aberta";
    logActivity(selectedRow.id, `Conversa marcada como ${label}`);
    toast.success(`Status: ${label}`);
  };

  // Contexto do Copilot: ultimas 10 mensagens em texto (sem notas internas)
  const copilotContext = useMemo(() => {
    return messages
      .filter((m) => !m.isPrivate && m.sender !== "system")
      .slice(-10)
      .map((m) => `${m.sender === "contact" ? "Cliente" : "Atendente"}: ${m.text}`)
      .join("\n");
  }, [messages]);
  const contact: ContactInfo | null = selectedRow ? {
    id: selectedRow.id,
    name: selectedRow.contact_name || selectedRow.contact_phone || "Contato",
    initials: (selectedRow.contact_name || "C").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    email: crmLead?.email || "—",
    phone: selectedRow.contact_phone || "—",
    company: crmLead?.company || undefined,
    crm: selectedRow.crm_contact_id ? {
      stage: crmLead?.stage_slug ?? null,
      temperature: crmLead?.temperature ?? null,
      company: crmLead?.company ?? null,
    } : null,
  } : null;

  const handleSend = async (text: string) => {
    if (!text.trim() || !selectedRow?.contact_phone) return;
    // Humano respondeu manualmente → assume a conversa (pausa a IA), igual
    // Chatwoot. Religa no switch quando quiser devolver pro agente.
    if (selectedRow.ai_enabled) await toggleAi(false, { silent: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Sessão expirada."); return; }
      const resp = await fetch(WHATSAPP_SEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ to: selectedRow.contact_phone, type: "text", message: text.trim() }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro ao enviar" }));
        toast.error(err.error || "Erro ao enviar mensagem");
      }
      // A mensagem chega via realtime (whatsapp-send grava em messages).
    } catch {
      toast.error("Sem conexão com o servidor.");
    }
  };

  const toggleResolve = async () => {
    if (!selectedRow) return;
    const next = selectedRow.status === "resolved" ? "open" : "resolved";
    const { error } = await (supabase.from("conversations" as any) as any)
      .update({ status: next })
      .eq("id", selectedRow.id);
    if (error) { toast.error("Não consegui atualizar o status"); return; }
    setRows((prev) => prev.map((r) => r.id === selectedRow.id ? { ...r, status: next } : r));
    toast.success(next === "resolved" ? "Conversa resolvida" : "Conversa reaberta");
    logActivity(selectedRow.id, next === "resolved" ? "Conversa marcada como resolvida" : "Conversa reaberta");
  };

  const sendNote = async (text: string) => {
    if (!selectedConv || !text.trim()) return;
    const { error } = await (supabase.from("messages" as any) as any)
      .insert({ conversation_id: selectedConv, role: "note", content: text.trim(), content_type: "text" });
    if (error) toast.error(`Erro salvando nota: ${error.message}`);
    // Render chega via realtime (INSERT em messages).
  };

  const suggestReply = async (): Promise<string | null> => {
    if (!selectedConv) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Sessão expirada."); return null; }
      const resp = await fetch(fnUrl("inbox-suggest-reply"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ conversation_id: selectedConv }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) { toast.error(j?.error || "Não consegui sugerir agora"); return null; }
      return j.suggestion || null;
    } catch {
      toast.error("Sem conexão com o servidor.");
      return null;
    }
  };

  const updateTags = async (tags: string[]) => {
    if (!selectedConv) return;
    const { error } = await (supabase.from("conversations" as any) as any)
      .update({ tags })
      .eq("id", selectedConv);
    if (error) { toast.error("Não consegui salvar as etiquetas"); return; }
    setRows((prev) => prev.map((r) => r.id === selectedConv ? { ...r, tags } : r));
  };

  const toggleAi = async (enabled: boolean, opts?: { silent?: boolean }) => {
    if (!selectedConv) return;
    const { error } = await (supabase.from("conversations" as any) as any)
      .update({ ai_enabled: enabled })
      .eq("id", selectedConv);
    if (error) { toast.error("Não consegui atualizar"); return; }
    setRows((prev) => prev.map((r) => r.id === selectedConv ? { ...r, ai_enabled: enabled } : r));
    if (!opts?.silent) {
      toast.success(enabled ? "Agente de IA reativado nesta conversa" : "Você assumiu a conversa — IA pausada");
    }
    logActivity(selectedConv, enabled ? "Agente de IA reativado" : "Atendente humano assumiu a conversa");
  };

  return (
    <DashboardLayout>
      <ModuleGate moduleKey="aikortex.mensagens">
      <div className="h-[calc(100vh-0px)] flex overflow-hidden -m-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Carregando conversas...
          </div>
        ) : (
          // Estrutura completa SEMPRE — mesmo sem conversas, o user ve as
          // 4 colunas com empty states (nao um texto solto no vazio).
          <>
            <MessagesSidebar
              filter={inboxFilter}
              onFilterChange={setInboxFilter}
              tags={allTags}
              counts={{
                all: rows.length,
                unattended: rows.filter((r) => r.unread_count > 0).length,
              }}
            />
            <ConversationList
              conversations={conversations}
              selectedId={selectedConv || ""}
              onSelect={setSelectedConv}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            <ChatArea
              conversation={conversation}
              messages={messages}
              onSend={handleSend}
              aiEnabled={selectedRow?.ai_enabled ?? true}
              onToggleAi={(v) => toggleAi(v)}
              onToggleResolve={selectedRow ? toggleResolve : undefined}
              onSendNote={selectedRow ? sendNote : undefined}
              onSuggestReply={selectedRow ? suggestReply : undefined}
              tags={selectedRow?.tags ?? []}
              onTagsChange={selectedRow ? updateTags : undefined}
              muted={!!selectedRow?.metadata?.muted}
              onToggleMute={selectedRow ? toggleMute : undefined}
              onShare={selectedRow ? shareConversation : undefined}
              onSetStatus={selectedRow ? setStatus : undefined}
            />
            <ContactPanel
              contact={contact}
              copilotContext={copilotContext}
              conversationInfo={selectedRow ? {
                channel: selectedRow.channel,
                createdAt: selectedRow.created_at,
                status: selectedRow.status,
              } : undefined}
            />
          </>
        )}
      </div>
      </ModuleGate>
    </DashboardLayout>
  );
};

export default AikortexMessages;
