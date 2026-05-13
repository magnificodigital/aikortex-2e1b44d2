import { fnUrl } from "@/lib/supabase-url";
export const AGENT_CHAT_URL = fnUrl("app-chat");
export const getAgentRuntimeUrl = () => AGENT_CHAT_URL;
