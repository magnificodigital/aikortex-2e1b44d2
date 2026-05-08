// Platform free models — routed via OpenRouter platform key in app-chat
export const GATEWAY_MODELS = [
  { value: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (Free)" },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Free)" },
  { value: "openai/gpt-oss-20b:free", label: "GPT OSS 20B (Free)" },
  { value: "openai/gpt-oss-120b:free", label: "GPT OSS 120B (Free)" },
] as const;

export const DEFAULT_FREE_SETUP_MODEL = GATEWAY_MODELS[0].value;

const gatewayModelValues = new Set<string>(GATEWAY_MODELS.map((model) => model.value));

export const normalizeFreeSetupModel = (model?: string | null) => {
  if (!model) return DEFAULT_FREE_SETUP_MODEL;
  return gatewayModelValues.has(model) ? model : DEFAULT_FREE_SETUP_MODEL;
};
