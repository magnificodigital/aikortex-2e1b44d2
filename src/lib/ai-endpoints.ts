export const AGENT_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/app-chat`;
export const AGENT_WIZARD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-runtime`;

export const getAgentRuntimeUrl = (mode?: "agent-chat" | "wizard-setup") =>
  mode === "wizard-setup" ? AGENT_WIZARD_URL : AGENT_CHAT_URL;
