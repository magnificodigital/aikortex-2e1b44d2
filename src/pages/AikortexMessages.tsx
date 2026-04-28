import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

import ConversationList, { Conversation } from "@/components/messages/ConversationList";
import ChatArea, { ChatMessage } from "@/components/messages/ChatArea";
import ContactPanel, { ContactInfo } from "@/components/messages/ContactPanel";

const CONVERSATIONS: Conversation[] = [
  { id: "1", contactName: "Klaus Crawley", initials: "KC", lastMessage: "Can we use Captain h...", time: "3m • 25m", unread: 2, online: true, channel: "web", inbox: "Aikortex Web", labels: [{ name: "device-setup", color: "bg-destructive" }] },
  { id: "2", contactName: "Candice Matherson", initials: "CM", lastMessage: "Hey 👋, How many I help you?", time: "3m • 25m", unread: 0, online: false, channel: "email", inbox: "Email Support", labels: [{ name: "lead", color: "bg-amber-500" }, { name: "software", color: "bg-primary" }] },
  { id: "3", contactName: "Lucas Falcão", initials: "LF", lastMessage: "Okok", time: "12/11/2025", unread: 0, online: true, channel: "whatsapp", inbox: "WhatsApp Business" },
  { id: "4", contactName: "Jessica Etiene", initials: "JE", lastMessage: "Obrigada! Igualmente!", time: "12/11/2025", unread: 0, online: false, channel: "whatsapp", inbox: "WhatsApp Business" },
  { id: "5", contactName: "Coreen Mewett", initials: "CM2", lastMessage: "I'm sorry to hear that. Please chang...", time: "3m • 3m", unread: 0, online: true, channel: "facebook", inbox: "Facebook" },
  { id: "6", contactName: "Jesus Vallejo", initials: "JV", lastMessage: "Un saludo", time: "10/11/2025", unread: 0, online: false, channel: "whatsapp", inbox: "WhatsApp Business" },
  { id: "7", contactName: "Bernardo Rabello", initials: "BR", lastMessage: "gostaria de saber apenas o preço", time: "09/11/2025", unread: 1, online: false, channel: "whatsapp", inbox: "WhatsApp Business" },
  { id: "8", contactName: "Carlos Bardaji", initials: "CB", lastMessage: "Bom dia!! Tudo certo", time: "07/11/2025", unread: 0, online: false, channel: "whatsapp", inbox: "WhatsApp Business" },
  { id: "9", contactName: "Quent Dalliston", initials: "QD", lastMessage: "Sure! Can you provide me wi...", time: "3m • 1m", unread: 0, online: true, channel: "whatsapp", inbox: "WhatsApp Business" },
  { id: "10", contactName: "Gustavo Filipe", initials: "GF", lastMessage: "Vamos agendar a reunião", time: "07/11/2025", unread: 0, online: true, channel: "instagram", inbox: "Instagram DM" },
];

const MESSAGES_MAP: Record<string, ChatMessage[]> = {
  "1": [
    { id: "1", sender: "contact", text: "Hi, I need some help setting up my new device.", time: "Jan 15, 12:32 PM" },
    { id: "2", sender: "user", senderName: "Mathew M", text: "No problem! Can you please tell me the make and model of your device and what specifically you need help with?", time: "Jan 15, 12:32 PM", status: "read" },
    { id: "s1", sender: "system", text: "Mathew M self-assigned this conversation", time: "" },
    { id: "s2", sender: "system", text: "Mathew M set the priority to high", time: "" },
    { id: "s3", sender: "system", text: "Mathew M added device-setup", time: "" },
    { id: "3", sender: "contact", text: "It's a Samsung Galaxy S24. I'm having trouble transferring my data from my old phone.", time: "Jan 15, 12:45 PM" },
    { id: "4", sender: "user", senderName: "Mathew M", text: "Got it! Samsung has a great tool called Smart Switch that makes data transfer easy. Have you tried using it?", time: "Jan 15, 12:47 PM", status: "read" },
  ],
  "3": [
    { id: "1", sender: "bot", senderName: "Bot Aikortex", text: "lembrete_2", time: "08:00", status: "delivered" },
    { id: "2", sender: "bot", senderName: "Bot Aikortex", text: "Profe, tá quase na hora! Nos falamos em breve, em 15 minutos.\nSó me dá um OK aqui quando estiver pronto. Te espero lá!", time: "08:01", status: "read" },
    { id: "3", sender: "contact", text: "Okok", time: "08:20" },
    { id: "4", sender: "bot", senderName: "Bot Aikortex", text: "Show, logo mais te envio o link aqui", time: "08:25", status: "read" },
    { id: "5", sender: "contact", text: "Ok", time: "08:30" },
    { id: "6", sender: "bot", senderName: "Bot Aikortex", text: "https://meet.google.com/xdv-sokr-zfo", time: "09:00", status: "read" },
    { id: "7", sender: "contact", text: "Okok", time: "09:10" },
  ],
};

const CONTACTS_MAP: Record<string, ContactInfo> = {
  "1": {
    id: "1", name: "Klaus Crawley", initials: "KC",
    email: "kcrawley6@driftburner.inc", phone: "+14155552398",
    company: "Drift Burner", location: "San Francisco, United States 🇺🇸",
    language: "English", localTime: "14:32",
    firstContact: "Jan 15, 2025",
    labels: [{ name: "device-setup", color: "bg-destructive" }],
    socialLinks: [{ platform: "facebook", url: "#" }, { platform: "twitter", url: "#" }, { platform: "linkedin", url: "#" }],
    previousConversations: 5,
    customAttributes: [
      { label: "Plano", value: "Enterprise" },
      { label: "MRR", value: "$2,400" },
    ],
  },
  "3": {
    id: "3", name: "Lucas Falcão", initials: "LF",
    email: "lucasafonsof@hotmail.com", phone: "+558499912300",
    location: "Brasil 🇧🇷", language: "Portuguese BR", localTime: "21:32",
    firstContact: "11/11/2025 08:18",
    previousConversations: 3,
    customAttributes: [
      { label: "Agendado", value: "Sim" },
      { label: "Objetivo", value: "Aprimorar processos de recrutamento" },
      { label: "Resumo", value: "Profissional de reabilitação..." },
    ],
  },
};

const AikortexMessages = () => {
  const [selectedConv, setSelectedConv] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("mine");
  const [activeSection, setActiveSection] = useState("all");

  const conversation = CONVERSATIONS.find((c) => c.id === selectedConv) || null;
  const messages = MESSAGES_MAP[selectedConv] || [];
  const contact = CONTACTS_MAP[selectedConv] || (conversation ? {
    id: conversation.id, name: conversation.contactName, initials: conversation.initials,
    email: "—", phone: "—", previousConversations: 0,
  } : null);

  const handleSend = (text: string) => {
    console.log("Send:", text);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-0px)] flex overflow-hidden -m-0">
        
        <ConversationList
          conversations={CONVERSATIONS}
          selectedId={selectedConv}
          onSelect={setSelectedConv}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <ChatArea conversation={conversation} messages={messages} onSend={handleSend} />
        <ContactPanel contact={contact} />
      </div>
    </DashboardLayout>
  );
};

export default AikortexMessages;
