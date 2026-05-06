import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ConversationList, { Conversation } from "@/components/messages/ConversationList";
import ChatArea, { ChatMessage } from "@/components/messages/ChatArea";
import ContactPanel, { ContactInfo } from "@/components/messages/ContactPanel";
import { supabase } from "@/integrations/supabase/client";

const AikortexMessages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("mine");
  const [loading, setLoading] = useState(true);

  // Carrega lista de conversas agrupadas por número
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("id, from_number, contact_name, content, direction, status, created_at, phone_number_id")
        .order("created_at", { ascending: false });

      if (error || !data) { setLoading(false); return; }

      // Agrupar por número de contato (from_number quando inbound)
      const grouped = new Map<string, any[]>();
      for (const msg of data) {
        const key = msg.direction === "inbound" ? msg.from_number : (msg.from_number || "unknown");
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(msg);
      }

      const convList: Conversation[] = Array.from(grouped.entries()).map(([number, msgs]) => {
        const latest = msgs[0];
        const inbound = msgs.find(m => m.direction === "inbound");
        const name = inbound?.contact_name || number;
        const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
        const unread = msgs.filter(m => m.direction === "inbound" && m.status !== "read").length;
        return {
          id: number,
          contactName: name,
          initials,
          lastMessage: latest.content?.slice(0, 50) || "—",
          time: new Date(latest.created_at).toLocaleDateString("pt-BR"),
          unread,
          online: false,
          channel: "whatsapp" as const,
          inbox: "WhatsApp Business",
        };
      });

      setConversations(convList);
      if (convList.length > 0 && !selectedConv) setSelectedConv(convList[0].id);
      setLoading(false);
    };
    load();
  }, []);

  // Carrega mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedConv) return;
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("id, from_number, contact_name, content, direction, status, created_at")
        .eq("from_number", selectedConv)
        .order("created_at", { ascending: true });

      if (!data) return;

      const conv = conversations.find(c => c.id === selectedConv);
      setContact(conv ? {
        id: conv.id,
        name: conv.contactName,
        initials: conv.initials,
        email: "—",
        phone: selectedConv,
        previousConversations: 0,
      } : null);

      setMessages(data.map(m => ({
        id: m.id,
        sender: m.direction === "inbound" ? "contact" : "bot",
        senderName: m.direction === "outbound" ? "Agente" : m.contact_name || m.from_number,
        text: m.content,
        time: new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        status: (m.status as ChatMessage["status"]) || undefined,
      })));
    };
    load();
  }, [selectedConv, conversations]);

  const handleSend = async (text: string) => {
    console.log("Send (não implementado ainda):", text);
  };

  const conversation = conversations.find(c => c.id === selectedConv) || null;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-0px)] flex overflow-hidden -m-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Carregando conversas...
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
            Nenhuma conversa ainda. As mensagens do WhatsApp aparecerão aqui automaticamente.
          </div>
        ) : (
          <>
            <ConversationList
              conversations={conversations}
              selectedId={selectedConv || ""}
              onSelect={setSelectedConv}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            <ChatArea conversation={conversation} messages={messages} onSend={handleSend} />
            <ContactPanel contact={contact} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AikortexMessages;
