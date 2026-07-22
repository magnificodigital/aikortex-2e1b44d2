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
import ConversationList, { Conversation, InboxFilter } from "@/components/messages/ConversationList";
import ChatArea, { ChatMessage } from "@/components/messages/ChatArea";
import ContactPanel, { ContactInfo } from "@/components/messages/ContactPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Envio roteado por canal da conversa — canais novos so' entram aqui.
const SEND_URLS: Record<string, string> = {
  whatsapp: fnUrl("whatsapp-send"),
  instagram: fnUrl("instagram-send"),
  facebook: fnUrl("facebook-send"),
};

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
  const [crmLead, setCrmLead] = useState<{ id: string; stage_slug: string | null; temperature: string | null; company: string | null; email: string | null; phone: string | null; custom_fields: Record<string, any> | null } | null>(null);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>({ view: "all", channels: [], tags: [] });
  const [panelOpen, setPanelOpen] = useState(true);
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
        .select("id, stage_slug, temperature, company, email, phone, custom_fields")
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
    if (inboxFilter.channels.length && !inboxFilter.channels.includes(r.channel)) return false;
    if (inboxFilter.tags.length && !inboxFilter.tags.some((t) => (r.tags ?? []).includes(t))) return false;
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

  // Atendente preenche/corrige dados do contato — salva no lead do CRM
  // (cria o lead se a conversa ainda nao tiver um) e espelha na conversa.
  const saveContact = async (patch: {
    name?: string; email?: string; company?: string; phone?: string;
    stage_slug?: string; custom?: Record<string, string>;
  }) => {
    if (!selectedRow) return;
    try {
      let leadId = selectedRow.crm_contact_id;

      if (!leadId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: ap } = await (supabase.from("agency_profiles" as any) as any)
          .select("id").eq("user_id", user?.id).maybeSingle();
        if (!ap) { toast.error("Sem agência configurada"); return; }
        const { data: lead, error: leadErr } = await (supabase.from("crm_contacts" as any) as any)
          .insert({
            agency_id: ap.id,
            name: patch.name || selectedRow.contact_name || selectedRow.contact_phone,
            phone: selectedRow.contact_phone,
            stage_slug: patch.stage_slug ?? "new",
            temperature: "warm",
            source: selectedRow.channel,
          })
          .select("id").single();
        if (leadErr) { toast.error("Não consegui criar o lead"); return; }
        leadId = lead.id;
        await (supabase.from("conversations" as any) as any)
          .update({ crm_contact_id: leadId }).eq("id", selectedRow.id);
      }

      const leadPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) leadPatch.name = patch.name;
      if (patch.email !== undefined) leadPatch.email = patch.email;
      if (patch.company !== undefined) leadPatch.company = patch.company;
      if (patch.phone !== undefined) leadPatch.phone = patch.phone;
      if (patch.stage_slug !== undefined) leadPatch.stage_slug = patch.stage_slug;
      if (patch.custom) {
        leadPatch.custom_fields = { ...(crmLead?.custom_fields ?? {}), ...patch.custom };
      }
      if (Object.keys(leadPatch).length > 0) {
        const { error } = await (supabase.from("crm_contacts" as any) as any)
          .update(leadPatch).eq("id", leadId);
        if (error) { toast.error(`Erro salvando: ${error.message}`); return; }
      }

      // Espelha na conversa
      const convPatch: Record<string, unknown> = { crm_contact_id: leadId };
      if (patch.name) convPatch.contact_name = patch.name;
      if (patch.email) convPatch.contact_email = patch.email;
      await (supabase.from("conversations" as any) as any)
        .update(convPatch).eq("id", selectedRow.id);

      setRows((prev) => prev.map((r) => r.id === selectedRow.id
        ? { ...r, crm_contact_id: leadId, contact_name: patch.name ?? r.contact_name }
        : r));
      setCrmLead((prev) => ({
        id: leadId!,
        stage_slug: patch.stage_slug ?? prev?.stage_slug ?? "new",
        temperature: prev?.temperature ?? "warm",
        company: patch.company ?? prev?.company ?? null,
        email: patch.email ?? prev?.email ?? null,
        phone: patch.phone ?? prev?.phone ?? null,
        custom_fields: patch.custom
          ? { ...(prev?.custom_fields ?? {}), ...patch.custom }
          : prev?.custom_fields ?? null,
      }));
      toast.success("Contato atualizado");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
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
    phone: crmLead?.phone || selectedRow.contact_phone || "—",
    company: crmLead?.company || undefined,
    customFields: (crmLead?.custom_fields ?? {}) as any,
    crm: selectedRow.crm_contact_id ? {
      id: selectedRow.crm_contact_id,
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
      const sendUrl = SEND_URLS[selectedRow.channel];
      if (!sendUrl) { toast.error(`Canal ${selectedRow.channel} ainda não suporta envio`); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Sessão expirada."); return; }
      const resp = await fetch(sendUrl, {
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
      // A mensagem chega via realtime (a edge de envio grava em messages).
    } catch {
      toast.error("Sem conexão com o servidor.");
    }
  };

  // Anexo: sobe pro bucket público e envia como mídia (imagem/documento).
  // Só WhatsApp por enquanto (send suporta media). Manual → pausa a IA.
  const [attaching, setAttaching] = useState(false);
  const handleAttach = async (file: File) => {
    if (!selectedRow?.contact_phone) return;
    if (selectedRow.channel !== "whatsapp") {
      toast.error("Anexos por enquanto só no WhatsApp — nos outros canais, em breve.");
      return;
    }
    if (file.size > 16 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 16 MB)."); return; }
    setAttaching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Sessão expirada."); return; }
      const isImage = file.type.startsWith("image/");
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${user.id}/${selectedRow.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("inbox-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) { toast.error(`Falha no upload: ${upErr.message}`); return; }
      const { data: urlData } = supabase.storage.from("inbox-attachments").getPublicUrl(path);

      if (selectedRow.ai_enabled) await toggleAi(false, { silent: true });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Sessão expirada."); return; }
      const resp = await fetch(SEND_URLS.whatsapp, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          to: selectedRow.contact_phone,
          type: isImage ? "image" : "document",
          media: { url: urlData.publicUrl, filename: file.name, caption: "" },
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || "Falha ao enviar o anexo");
      }
      // A mensagem entra via realtime (o send grava em messages).
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setAttaching(false);
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
          <div className="flex-1 flex items-center justify-center text-[14px] text-muted-foreground">
            Carregando conversas...
          </div>
        ) : (
          // Estrutura completa SEMPRE — mesmo sem conversas, o user ve as
          // 3 colunas com empty states (nao um texto solto no vazio).
          // Filtros de canal/etiqueta moram no funil do header da lista
          // (como no Chatwoot) — sem coluna extra redundante.
          <>
            <ConversationList
              conversations={conversations}
              selectedId={selectedConv || ""}
              onSelect={setSelectedConv}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              filter={inboxFilter}
              onFilterChange={setInboxFilter}
              availableTags={allTags}
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
              panelOpen={panelOpen}
              onTogglePanel={() => setPanelOpen((v) => !v)}
              onAttach={selectedRow ? handleAttach : undefined}
              attaching={attaching}
            />
            {panelOpen && (
              <ContactPanel
                contact={contact}
                copilotContext={copilotContext}
                tags={selectedRow?.tags ?? []}
                onTagsChange={selectedRow ? updateTags : undefined}
                onSaveContact={selectedRow ? saveContact : undefined}
              />
            )}
          </>
        )}
      </div>
      </ModuleGate>
    </DashboardLayout>
  );
};

export default AikortexMessages;
