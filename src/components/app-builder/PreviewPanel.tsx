import { useMemo, useState, useEffect, useRef } from "react";
import {
  Phone, Bot, Send, BarChart3, Settings, Users, Calendar,
  MessageSquare, Search, Globe, Zap, Monitor, Smartphone,
  FileCode, Database, Layout, Code2, ArrowRight, Loader2,
} from "lucide-react";
import { useAppBuilder, type AppState } from "@/contexts/AppBuilderContext";
import { Badge } from "@/components/ui/badge";

/* ── Helpers ── */

function formatConversationLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase())
    .replace(/\bDe\b/g, "de")
    .replace(/\bDa\b/g, "da")
    .replace(/\bDo\b/g, "do")
    .replace(/\bDas\b/g, "das")
    .replace(/\bDos\b/g, "dos")
    .replace(/\bE\b/g, "e");
}

const toneEmoji: Record<string, string> = {
  professional_friendly: "🤝",
  formal: "👔",
  casual: "😄",
  empathetic: "💙",
  direct: "⚡",
};

const toneLabels: Record<string, string> = {
  professional_friendly: "Profissional e Amigável",
  formal: "Formal",
  casual: "Casual e Descontraído",
  empathetic: "Empático e Acolhedor",
  direct: "Direto e Objetivo",
};

/* ── Mock conversation engine driven by appState ── */

function buildConversationEngine(appState: AppState | null, fallbackName: string, fallbackIntro: string) {
  const agentCfg = appState?.agent_config;
  const screenData = appState?.preview?.screen_data;

  const botName = screenData?.bot_name || agentCfg?.cta_primary || appState?.app_meta?.name || fallbackName;
  const greeting = screenData?.greeting || agentCfg?.intro_message || fallbackIntro || `Olá! 👋 Sou o ${botName}. Como posso ajudar?`;
  const quickReplies: string[] = (screenData?.quick_replies || agentCfg?.quick_replies || []).map(formatConversationLabel);
  const stages: string[] = screenData?.stages || [];
  const conversationFlow: { trigger: string; response: string; suggestions?: string[] }[] =
    screenData?.conversation_flow || [];

  const featureFollowUps: Record<string, { question: string; options: string[] }> = {
    "agendamento": { question: "Qual dia e horário funcionam melhor pra você?", options: ["Hoje", "Amanhã", "Próxima semana"] },
    "triagem": { question: "Vou te fazer algumas perguntas rápidas. Pode ser?", options: ["Sim, vamos lá", "Tenho dúvidas antes"] },
    "suporte": { question: "Me conta o que está acontecendo para eu te ajudar:", options: ["Problema técnico", "Dúvida de uso"] },
    "preços": { question: "Qual plano te interessa mais?", options: ["Básico", "Profissional", "Empresarial"] },
    "cadastro": { question: "Vou precisar de alguns dados. Pode me passar seu nome completo?", options: ["Começar cadastro"] },
    "pedido": { question: "O que você gostaria de pedir?", options: ["Ver cardápio", "Repetir último pedido"] },
    "cardápio": { question: "Temos várias opções! Alguma preferência?", options: ["Ver tudo", "Promoções", "Mais pedidos"] },
    "pagamento": { question: "Qual forma de pagamento você prefere?", options: ["Pix", "Cartão", "Boleto"] },
    "nutrição": { question: "Vou montar algo personalizado! Me conta: qual é o seu objetivo principal?", options: ["Emagrecer", "Ganhar massa", "Manter peso"] },
    "refeição": { question: "Qual refeição você quer registrar?", options: ["Café da manhã", "Almoço", "Jantar", "Lanche"] },
  };

  const getResponse = (userMsg: string): { text: string; suggestions?: string[] } => {
    const lower = userMsg.toLowerCase().trim();
    for (const flow of conversationFlow) {
      if (lower.includes(flow.trigger.toLowerCase())) {
        return { text: flow.response, suggestions: flow.suggestions };
      }
    }
    const greetings: Record<string, string> = {
      "oi": `Olá! 😊 Sou o ${botName}. Como posso te ajudar?`,
      "olá": `Oi! 👋 Que bom te ver aqui. Em que posso ajudar?`,
      "bom dia": `Bom dia! ☀️ Estou aqui para te ajudar. O que precisa?`,
      "boa tarde": `Boa tarde! 🌤️ Como posso ser útil?`,
      "boa noite": `Boa noite! 🌙 Em que posso ajudar?`,
      "obrigado": `De nada! 😊 Precisa de mais alguma coisa?`,
      "obrigada": `Por nada! 😊 Estou aqui se precisar de algo mais.`,
      "tchau": `Até logo! 👋 Foi um prazer ajudar. Volte quando precisar!`,
      "sim": `Ótimo! Vamos lá então. O que você precisa?`,
      "não": `Tudo bem! Se mudar de ideia, estou por aqui. 😊`,
    };
    for (const [key, text] of Object.entries(greetings)) {
      if (lower.includes(key)) {
        return { text, suggestions: quickReplies.length > 0 ? quickReplies.slice(0, 3) : undefined };
      }
    }
    for (const [feature, followUp] of Object.entries(featureFollowUps)) {
      if (lower.includes(feature)) {
        return {
          text: `Claro! Vou te ajudar com ${formatConversationLabel(feature)}. 📋\n\n${followUp.question}`,
          suggestions: followUp.options,
        };
      }
    }
    const defaults = [
      { text: `Entendi! Me conta um pouco mais para eu te direcionar melhor. 🔍`, suggestions: quickReplies.slice(0, 3) },
      { text: `Perfeito! Para te atender melhor, qual dessas opções faz mais sentido pra você?`, suggestions: quickReplies.slice(0, 3) },
      { text: `Claro! Esse é um dos meus pontos fortes 💪 O que você precisa resolver?`, suggestions: ["Tenho uma dúvida", "Quero começar"] },
      { text: `Sem problemas! Vamos resolver isso juntos. O que seria mais útil agora?`, suggestions: quickReplies.slice(0, 2) },
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
  };

  return { botName, greeting, quickReplies, stages, getResponse };
}

/* ── WhatsApp Preview ── */

const WhatsAppPreview = () => {
  const { files, appName, isGenerating, tables, wizardData, wizardConfig, wizardStep, structuredConfig, appState } = useAppBuilder();

  // FIX: showContent nunca colapsa — se wizard foi concluído OU há conteúdo, sempre mostrar
  const hasRenderableState = !!appState?.runtime?.render_ready;
  const hasContent = files.length > 0 || !!appState;
  const wizardDone = wizardStep === "done";
  // FIX: isConfiguring agora inclui o estado de "wizard concluído mas appState ainda não chegou"
  const isConfiguring = !hasRenderableState && !wizardDone;
  const isWaitingForState = wizardDone && !hasRenderableState && !isGenerating;
  // FIX: showContent = true sempre que wizard foi iniciado (structure ou além)
  const wizardStarted = wizardStep !== "discover" || hasContent;
  const showContent = hasRenderableState || hasContent || wizardStarted;

  const effectiveName = appState?.app_meta?.name || wizardData.appName || wizardConfig?.appName || appName;
  const effectiveIntro = appState?.agent_config?.intro_message || wizardData.introMessage || wizardConfig?.introMessage || "";
  const effectiveTone = appState?.app_meta?.tone || wizardData.tone || wizardConfig?.tone || "professional_friendly";

  const engine = useMemo(
    () => buildConversationEngine(appState, effectiveName, effectiveIntro),
    [appState, effectiveName, effectiveIntro],
  );

  const [chatMessages, setChatMessages] = useState<{ role: "user" | "bot"; text: string; time: string; suggestions?: string[] }[]>([]);
  const [testInput, setTestInput] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  // FIX: controle estável para evitar reset desnecessário do chat
  const prevBotName = useRef(engine.botName);

  useEffect(() => {
    if (prevBotName.current !== engine.botName) {
      prevBotName.current = engine.botName;
      setChatMessages([]);
    }
  }, [engine.botName]);

  const now = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const handleSendTest = (text?: string) => {
    const msg = (text || testInput).trim();
    if (!msg) return;
    setTestInput("");
    setChatMessages(prev => [...prev, { role: "user", text: msg, time: now() }]);
    setBotTyping(true);
    setTimeout(() => {
      setBotTyping(false);
      const response = engine.getResponse(msg);
      setChatMessages(prev => [...prev, { role: "bot", text: response.text, time: now(), suggestions: response.suggestions }]);
    }, 800 + Math.random() * 600);
  };

  const previewMessages = Array.isArray(appState?.preview?.screen_data?.messages)
    ? appState?.preview?.screen_data?.messages
    : [];
  const headerTitle = appState?.preview?.title || effectiveName || engine.botName;
  const headerStatus = appState?.preview?.subtitle || "online";

  // FIX: status badge dinâmico
  const statusBadge = (() => {
    if (isGenerating) return "gerando...";
    if (isWaitingForState) return "finalizando...";
    if (hasRenderableState) return `${appState!.files?.length || 0} arquivo(s)${appState!.flows?.length ? ` • ${appState!.flows.length} fluxo(s)` : ""}${appState!.database?.tables?.length ? ` • ${appState!.database.tables.length} tabela(s)` : ""}`;
    if (hasContent) return `${files.length} arquivo(s)${tables.length > 0 ? ` • ${tables.length} tabelas` : ""}`;
    return "Configurando...";
  })();

  return (
    <div className="flex-1 flex items-center justify-center bg-muted/5 p-4 gap-6">
      {/* Phone mock */}
      <div className="relative">
        <div className="w-[370px] rounded-[2.5rem] border-[3px] border-muted/30 bg-card shadow-2xl overflow-hidden">
          {/* Status bar */}
          <div className="h-7 bg-[#075e54] dark:bg-[#1f2c34] flex items-center justify-center">
            <div className="w-20 h-4 rounded-full bg-black/20" />
          </div>

          {/* WhatsApp header */}
          <div className="bg-[#075e54] dark:bg-[#1f2c34] px-4 py-2.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{headerTitle}</p>
              <p className="text-[10px] text-white/60">
                {isGenerating || botTyping ? "digitando..." : headerStatus}
              </p>
            </div>
            <Phone className="w-4 h-4 text-white/70" />
          </div>

          {/* Chat area */}
          <div className="bg-[#ece5dd] dark:bg-[#0b141a] p-4 space-y-3 min-h-[380px] max-h-[440px] overflow-y-auto">
            {showContent ? (
              <>
                {/* FIX: estado de aguardando appState — mostra loader mas mantém o preview visível */}
                {isWaitingForState && (
                  <div className="flex justify-center animate-in fade-in duration-300">
                    <span className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-[#202c33]/80 text-[9px] text-muted-foreground border border-border/30 shadow-sm flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Finalizando app...
                    </span>
                  </div>
                )}

                {previewMessages.length > 0 ? (
                  previewMessages.map((message: any, index: number) => {
                    const isUser = message.role === "user";
                    return (
                      <div key={`${message.role}-${index}`} className={`flex ${isUser ? "justify-end" : "gap-2"} animate-in fade-in duration-200`}>
                        <div className={`rounded-xl px-3 py-2 max-w-[80%] shadow-sm ${
                          isUser
                            ? "bg-[#dcf8c6] dark:bg-[#005c4b] rounded-tr-sm"
                            : "bg-white dark:bg-[#202c33] rounded-tl-sm"
                        }`}>
                          <p className="text-xs text-foreground whitespace-pre-line">{message.text || message.content || engine.greeting}</p>
                          <p className="text-[9px] text-muted-foreground text-right mt-1">{message.time || "10:30"}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="bg-white dark:bg-[#202c33] rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm">
                      <p className="text-xs text-foreground">{engine.greeting}</p>
                      <p className="text-[9px] text-muted-foreground text-right mt-1">10:30</p>
                    </div>
                  </div>
                )}

                {/* Tone badge durante config */}
                {isConfiguring && effectiveTone && (
                  <div className="flex justify-center animate-in fade-in duration-300">
                    <span className="px-2.5 py-1 rounded-full bg-white/80 dark:bg-[#202c33]/80 text-[9px] text-muted-foreground border border-border/30 shadow-sm">
                      {toneEmoji[effectiveTone] || "🤖"} Tom: {toneLabels[effectiveTone] || effectiveTone}
                    </span>
                  </div>
                )}

                {/* Quick replies */}
                {chatMessages.length === 0 && engine.quickReplies.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap animate-in fade-in duration-300 delay-300">
                    {engine.quickReplies.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSendTest(opt)}
                        className="px-3 py-1.5 rounded-full border border-green-600/30 text-[10px] font-medium text-green-700 dark:text-green-400 bg-white dark:bg-[#202c33] shadow-sm cursor-pointer hover:bg-green-50 dark:hover:bg-[#2a3942] transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chat messages */}
                {chatMessages.map((msg, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className={`flex ${msg.role === "user" ? "justify-end" : "gap-2"} animate-in fade-in duration-200`}>
                      <div className={`rounded-xl px-3 py-2 max-w-[80%] shadow-sm ${
                        msg.role === "user"
                          ? "bg-[#dcf8c6] dark:bg-[#005c4b] rounded-tr-sm"
                          : "bg-white dark:bg-[#202c33] rounded-tl-sm"
                      }`}>
                        <p className="text-xs text-foreground whitespace-pre-line">{msg.text}</p>
                        <p className="text-[9px] text-muted-foreground text-right mt-1">{msg.time}</p>
                      </div>
                    </div>
                    {msg.role === "bot" && msg.suggestions && msg.suggestions.length > 0 && i === chatMessages.length - 1 && (
                      <div className="flex gap-1.5 flex-wrap animate-in fade-in duration-300">
                        {msg.suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSendTest(s)}
                            className="px-3 py-1.5 rounded-full border border-green-600/30 text-[10px] font-medium text-green-700 dark:text-green-400 bg-white dark:bg-[#202c33] shadow-sm cursor-pointer hover:bg-green-50 dark:hover:bg-[#2a3942] transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {(isGenerating || botTyping) && (
                  <div className="flex gap-2 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#202c33] rounded-xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] text-xs text-muted-foreground">
                <div className="text-center">
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p>Descreva seu app no Studio<br />para ver o preview aqui</p>
                </div>
              </div>
            )}
          </div>

          {/* Input bar — FIX: habilitado assim que wizard foi concluído, mesmo antes do appState */}
          <div className="bg-[#f0f0f0] dark:bg-[#202c33] px-3 py-2.5 flex items-center gap-2 border-t border-border/30">
            <input
              type="text"
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendTest()}
              placeholder={appState?.preview?.screen_data?.input_placeholder || "Teste seu agente..."}
              disabled={!wizardDone}
              className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
            />
            <button
              onClick={() => handleSendTest()}
              disabled={!testInput.trim() || botTyping || !wizardDone}
              className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          <div className="h-5 bg-[#f0f0f0] dark:bg-[#202c33] flex items-center justify-center">
            <div className="w-24 h-1 rounded-full bg-muted-foreground/20" />
          </div>
        </div>

        {/* Status badge inferior — FIX: dinâmico e sem travar em "Configurando..." */}
        {wizardStarted && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-3 py-1 shadow-lg whitespace-nowrap">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isGenerating || isWaitingForState ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
              {statusBadge}
            </span>
          </div>
        )}
      </div>

      {/* Right panel: config summary */}
      {(hasContent || wizardStarted) && (
        <div className="w-[240px] space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
          {isConfiguring && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                <Zap className="w-3 h-3" /> Configuração Atual
              </div>
              <div className="space-y-1.5 text-[10px]">
                {effectiveName && effectiveName !== "Meu App" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome</span>
                    <span className="text-foreground font-medium">{effectiveName}</span>
                  </div>
                )}
                {effectiveTone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tom</span>
                    <span className="text-foreground font-medium">{toneLabels[effectiveTone] || effectiveTone}</span>
                  </div>
                )}
                {effectiveIntro && (
                  <div className="pt-0.5">
                    <span className="text-muted-foreground block mb-0.5">Intro</span>
                    <span className="text-foreground italic text-[9px]">"{effectiveIntro.slice(0, 60)}{effectiveIntro.length > 60 ? "..." : ""}"</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* App state summary quando pronto */}
          {hasRenderableState && appState && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600 uppercase tracking-wider">
                <Zap className="w-3 h-3" /> App Criado
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome</span>
                  <span className="text-foreground font-medium">{appState.app_meta.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tom</span>
                  <span className="text-foreground font-medium">{toneLabels[appState.app_meta.tone] || appState.app_meta.tone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Idioma</span>
                  <span className="text-foreground font-medium">{appState.app_meta.language}</span>
                </div>
              </div>
            </div>
          )}

          {/* Files */}
          {(appState?.files?.length || files.length > 0) && (
            <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <FileCode className="w-3 h-3" /> Arquivos
              </div>
              <div className="space-y-1 max-h-[140px] overflow-y-auto">
                {(appState?.files || files.map(f => ({ path: f.path, type: "", purpose: "", content_summary: "" }))).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-foreground/80 py-0.5">
                    <Code2 className="w-3 h-3 text-primary/60 shrink-0" />
                    <span className="truncate">{f.path.split("/").pop() || f.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tables */}
          {(appState?.database?.tables?.length || tables.length > 0) && (
            <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Database className="w-3 h-3" /> Tabelas
              </div>
              <div className="space-y-1">
                {(appState?.database?.tables || tables).map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] py-0.5">
                    <span className="text-foreground/80">{t.name}</span>
                    <Badge variant="secondary" className="text-[8px] h-4 px-1.5">{t.columns.length} cols</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flows */}
          {appState?.flows && appState.flows.length > 0 && (
            <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <MessageSquare className="w-3 h-3" /> Fluxos
              </div>
              <div className="space-y-1">
                {appState.flows.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="text-foreground/80 truncate">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stages */}
          {engine.stages.length > 0 && (
            <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <ArrowRight className="w-3 h-3" /> Jornada
              </div>
              <div className="space-y-1">
                {engine.stages.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="text-foreground/80 truncate">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(isGenerating || isWaitingForState) && (
            <div className="flex items-center gap-2 text-[10px] text-primary animate-pulse px-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {isWaitingForState ? "Finalizando app..." : "Atualizando em tempo real..."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Web Preview ── */

const WebPreview = () => {
  const { files, appName, isGenerating, dashboardMetrics, tables, wizardData, wizardConfig, wizardStep, appState } = useAppBuilder();
  const hasRenderableState = !!appState?.runtime?.render_ready;
  const hasContent = files.length > 0 || !!appState;
  const wizardDone = wizardStep === "done";
  const isConfiguring = !hasRenderableState && !wizardDone;
  const isWaitingForState = wizardDone && !hasRenderableState && !isGenerating;
  const wizardStarted = wizardStep !== "discover" || hasContent;
  const showContent = hasRenderableState || hasContent || wizardStarted;

  const effectiveName = appState?.app_meta?.name || wizardData.appName || wizardConfig?.appName || appName;
  const screenData = appState?.preview?.screen_data;

  const navItems = useMemo(() => {
    if (screenData?.nav_items && Array.isArray(screenData.nav_items) && screenData.nav_items.length > 0) {
      const iconMap: Record<string, typeof BarChart3> = {
        dashboard: BarChart3, clientes: Users, clients: Users, users: Users,
        agenda: Calendar, calendar: Calendar, mensagens: MessageSquare,
        messages: MessageSquare, config: Settings, settings: Settings, home: Layout,
        configurações: Settings, relatórios: BarChart3, reports: BarChart3,
      };
      return screenData.nav_items.map((item: any) => ({
        label: typeof item === "string" ? item : item.label || item.name || "Page",
        icon: iconMap[(typeof item === "string" ? item : item.label || "").toLowerCase()] || Layout,
      }));
    }
    return [
      { label: "Dashboard", icon: BarChart3 },
      { label: "Clientes", icon: Users },
      { label: "Agenda", icon: Calendar },
      { label: "Mensagens", icon: MessageSquare },
      { label: "Configurações", icon: Settings },
    ];
  }, [screenData]);

  const metrics = useMemo(() => {
    if (screenData?.metrics && Array.isArray(screenData.metrics) && screenData.metrics.length > 0) {
      return screenData.metrics.slice(0, 4).map((m: any) => ({
        label: m.label || m.title || "",
        value: String(m.value || "0"),
        change: m.change || "",
      }));
    }
    if (dashboardMetrics.length > 0) {
      return dashboardMetrics.slice(0, 4).map(m => ({ label: m.label, value: m.value, change: m.change }));
    }
    return [
      { label: "Usuários", value: "0" },
      { label: "Receita", value: "R$ 0" },
      { label: "Conversão", value: "0%" },
    ];
  }, [screenData, dashboardMetrics]);

  const activeNav = screenData?.active_page || navItems[0]?.label || "Dashboard";
  const pageTitle = screenData?.page_title || activeNav;
  const tableData = screenData?.table_data;

  return (
    <div className="flex-1 flex items-center justify-center bg-muted/5 p-4 gap-6">
      <div className="w-full max-w-[780px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden transition-all duration-500">
        {/* Browser chrome */}
        <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b border-border">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 mx-8">
            <div className="bg-background rounded-md px-3 py-1 text-[10px] text-muted-foreground text-center border border-border/50">
              🔒 {effectiveName.toLowerCase().replace(/\s+/g, "")}.aikortex.com
            </div>
          </div>
          {(isGenerating || isWaitingForState) && (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin mr-1" />
          )}
        </div>

        {showContent ? (
          <div className="flex h-[420px]">
            {/* Sidebar */}
            <div className="w-[160px] border-r border-border bg-card/80 p-3 space-y-1">
              <div className="px-2 py-2 mb-2">
                <p className="text-xs font-semibold text-foreground">{effectiveName}</p>
                <p className="text-[9px] text-muted-foreground">
                  {wizardData.companyName || appState?.preview?.subtitle || "Painel de Gestão"}
                </p>
              </div>
              {navItems.map((item: { label: string; icon: typeof BarChart3 }, idx: number) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] transition-colors ${
                    idx === 0 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 p-5 space-y-4 overflow-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{pageTitle}</h2>
                  <p className="text-[10px] text-muted-foreground">
                    {isWaitingForState ? "Finalizando app..." : isConfiguring ? "Configurando seu app..." : appState?.preview?.subtitle || "Visão geral do sistema"}
                  </p>
                </div>
                {(isGenerating || isWaitingForState) && (
                  <div className="flex items-center gap-1.5 text-[10px] text-primary animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {isWaitingForState ? "Finalizando..." : "Atualizando..."}
                  </div>
                )}
              </div>

              {/* Config banner */}
              {isConfiguring && wizardData.prompt && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1.5 animate-in fade-in duration-300">
                  <p className="text-[10px] font-semibold text-primary">📝 Descrição do App</p>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">
                    {wizardData.prompt.slice(0, 150)}{wizardData.prompt.length > 150 ? "..." : ""}
                  </p>
                </div>
              )}

              {/* Metrics */}
              <div className={`grid gap-3 ${metrics.length <= 3 ? "grid-cols-3" : "grid-cols-4"}`}>
                {metrics.map((m: { label: string; value: string; change?: string }) => (
                  <div key={m.label} className="rounded-xl border border-border p-3 bg-card/50 animate-in fade-in duration-300">
                    <p className="text-[9px] text-muted-foreground mb-0.5">{m.label}</p>
                    <p className="text-base font-bold text-foreground">{m.value}</p>
                    {m.change && <span className="text-[9px] text-muted-foreground">{m.change}</span>}
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-xl border border-border p-4 bg-card/50">
                <p className="text-[10px] font-medium text-foreground mb-3">
                  {screenData?.chart_data?.title || "Atividade recente"}
                </p>
                <div className="flex items-end gap-1.5 h-[80px]">
                  {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm transition-all duration-500 overflow-hidden" style={{ height: `${h}%` }}>
                      <div className="w-full h-full bg-gradient-to-t from-primary/60 to-primary/20 rounded-sm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Table */}
              {(tableData || (appState?.database?.tables?.length || tables.length > 0)) && (
                <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                    <p className="text-[10px] font-medium text-foreground">
                      {tableData?.name || (appState?.database?.tables?.[0]?.name || tables[0]?.name || "Dados")}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[8px] h-4">
                        {tableData?.columns?.length || (appState?.database?.tables?.[0]?.columns?.length || tables[0]?.columns?.length || 0)} colunas
                      </Badge>
                      <Search className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="px-4 py-1">
                    <div className="flex items-center gap-3 py-1.5 border-b border-border/50">
                      {(tableData?.columns || (appState?.database?.tables?.[0]?.columns?.map((c: any) => c.name) || tables[0]?.columns?.map(c => c.name) || [])).slice(0, 4).map((col: any) => {
                        const colName = typeof col === "string" ? col : col.name || col;
                        return (
                          <div key={colName} className="flex-1">
                            <span className="text-[8px] font-semibold text-muted-foreground uppercase">{colName}</span>
                          </div>
                        );
                      })}
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        {(tableData?.columns || (appState?.database?.tables?.[0]?.columns?.map((c: any) => c.name) || tables[0]?.columns?.map(c => c.name) || [])).slice(0, 4).map((col: any, ci: number) => {
                          const colName = typeof col === "string" ? col : col.name || col;
                          return (
                            <div key={colName} className="flex-1">
                              <div className={`h-2 bg-muted/40 rounded ${ci === 0 ? "w-16" : "w-12"}`} />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">
            <div className="text-center">
              <Monitor className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-xs">Descreva seu app no Studio<br />para ver o preview aqui</p>
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      {(hasContent || wizardStarted) && (
        <div className="w-[220px] space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
          {hasRenderableState && appState ? (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600 uppercase tracking-wider">
                <Zap className="w-3 h-3" /> App Criado
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome</span>
                  <span className="text-foreground font-medium">{appState.app_meta.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Idioma</span>
                  <span className="text-foreground font-medium">{appState.app_meta.language}</span>
                </div>
              </div>
            </div>
          ) : isConfiguring ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                <Zap className="w-3 h-3" /> Configuração
              </div>
              <div className="space-y-1.5 text-[10px]">
                {effectiveName && effectiveName !== "Meu App" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome</span>
                    <span className="text-foreground font-medium">{effectiveName}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {(appState?.files?.length || files.length > 0) && (
            <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <FileCode className="w-3 h-3" /> Arquivos ({appState?.files?.length || files.length})
              </div>
              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {(appState?.files || files.map(f => ({ path: f.path }))).map((f: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-foreground/80 py-0.5">
                    <Code2 className="w-3 h-3 text-primary/60 shrink-0" />
                    <span className="truncate">{f.path?.split("/").pop() || f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(appState?.database?.tables?.length || tables.length > 0) && (
            <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Database className="w-3 h-3" /> Tabelas ({appState?.database?.tables?.length || tables.length})
              </div>
              <div className="space-y-1">
                {(appState?.database?.tables || tables).map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[10px] py-0.5">
                    <span className="text-foreground/80">{t.name}</span>
                    <Badge variant="secondary" className="text-[8px] h-4 px-1.5">{t.columns.length} cols</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {appState?.ui_modules && appState.ui_modules.length > 0 && (
            <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Layout className="w-3 h-3" /> Módulos
              </div>
              <div className="space-y-1">
                {appState.ui_modules.map((m, i) => (
                  <div key={i} className="text-[10px] text-foreground/80 py-0.5 truncate">{m.name}</div>
                ))}
              </div>
            </div>
          )}

          {(isGenerating || isWaitingForState) && (
            <div className="flex items-center gap-2 text-[10px] text-primary animate-pulse px-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {isWaitingForState ? "Finalizando app..." : "Atualizando em tempo real..."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface PreviewPanelProps {
  channel?: "whatsapp" | "web";
}

const PreviewPanel = ({}: PreviewPanelProps) => {
  const { channel } = useAppBuilder();
  return channel === "whatsapp" ? <WhatsAppPreview /> : <WebPreview />;
};

export default PreviewPanel;
