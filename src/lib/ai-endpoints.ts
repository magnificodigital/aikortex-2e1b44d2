export const AGENT_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/app-chat`;
export const getAgentRuntimeUrl = () => AGENT_CHAT_URL;
