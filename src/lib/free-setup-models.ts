// Platform free models — routed via OpenRouter platform key in app-chat
export const GATEWAY_MODELS = [
  { value: "google/gemini-2.5-flash-preview-04-17:free", label: "Gemini 2.5 Flash (Free)" },
  { value: "google/gemma-3-27b-it:free", label: "Gemma 3 27B (Free)" },
  { value: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 (Free)" },
  { value: "qwen/qwen3-30b-a3b:free", label: "Qwen3 30B (Free)" },
] as const;

export const DEFAULT_FREE_SETUP_MODEL = GATEWAY_MODELS[0].value;

const gatewayModelValues = new Set<string>(GATEWAY_MODELS.map((model) => model.value));

export const normalizeFreeSetupModel = (model?: string | null) => {
  if (!model) return DEFAULT_FREE_SETUP_MODEL;
  return gatewayModelValues.has(model) ? model : DEFAULT_FREE_SETUP_MODEL;
};
