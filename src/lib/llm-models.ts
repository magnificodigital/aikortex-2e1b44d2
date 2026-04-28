export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  byok: boolean;
}

export const LLM_MODELS: LLMModel[] = [
  // ── ANTHROPIC (BYOK) ──
  { id: 'claude-opus-4-6', name: 'Claude Opus 4', provider: 'anthropic', byok: true },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.5', provider: 'anthropic', byok: true },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic', byok: true },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', byok: true },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', byok: true },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', byok: true },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic', byok: true },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', byok: true },

  // ── OPENAI (BYOK) ──
  { id: 'o3', name: 'o3', provider: 'openai', byok: true },
  { id: 'o3-mini', name: 'o3 Mini', provider: 'openai', byok: true },
  { id: 'o1', name: 'o1', provider: 'openai', byok: true },
  { id: 'o1-mini', name: 'o1 Mini', provider: 'openai', byok: true },
  { id: 'gpt-4.5-preview', name: 'GPT-4.5 Preview', provider: 'openai', byok: true },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', byok: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', byok: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', byok: true },
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai', byok: true },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', byok: true },

  // ── GOOGLE GEMINI (via OpenRouter — plataforma paga) ──
  { id: 'google/gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', provider: 'google', byok: false },
  { id: 'google/gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash', provider: 'google', byok: false },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'google', byok: false },
  { id: 'google/gemini-2.0-flash-lite-001', name: 'Gemini 2.0 Flash Lite', provider: 'google', byok: false },
  { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', byok: false },
  { id: 'google/gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', byok: false },
  { id: 'google/gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', provider: 'google', byok: false },

  // ── META LLAMA (via OpenRouter — plataforma paga) ──
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'meta', byok: false },
  { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'meta', byok: false },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'meta', byok: false },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'meta', byok: false },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'meta', byok: false },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'meta', byok: false },
  { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B', provider: 'meta', byok: false },

  // ── DEEPSEEK (via OpenRouter — plataforma paga) ──
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'deepseek', byok: false },
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3', provider: 'deepseek', byok: false },
  { id: 'deepseek/deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', provider: 'deepseek', byok: false },

  // ── MISTRAL (via OpenRouter — plataforma paga) ──
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'mistral', byok: false },
  { id: 'mistralai/mistral-medium-3', name: 'Mistral Medium 3', provider: 'mistral', byok: false },
  { id: 'mistralai/mistral-small-3.1-24b-instruct', name: 'Mistral Small 3.1', provider: 'mistral', byok: false },
  { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', provider: 'mistral', byok: false },
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B', provider: 'mistral', byok: false },

  // ── QWEN / ALIBABA (via OpenRouter — plataforma paga) ──
  { id: 'qwen/qwen3-235b-a22b', name: 'Qwen3 235B', provider: 'qwen', byok: false },
  { id: 'qwen/qwen3-30b-a3b', name: 'Qwen3 30B', provider: 'qwen', byok: false },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'qwen', byok: false },

  // ── MICROSOFT (via OpenRouter — plataforma paga) ──
  { id: 'microsoft/phi-4', name: 'Phi-4', provider: 'microsoft', byok: false },
  { id: 'microsoft/phi-4-multimodal-instruct', name: 'Phi-4 Multimodal', provider: 'microsoft', byok: false },
];

export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google Gemini",
  meta: "Meta Llama",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  qwen: "Qwen",
  microsoft: "Microsoft",
};

/** Group models by provider for grouped selects */
export function getGroupedModels() {
  const groups: { provider: string; label: string; models: LLMModel[] }[] = [];
  const seen = new Set<string>();
  for (const m of LLM_MODELS) {
    if (!seen.has(m.provider)) {
      seen.add(m.provider);
      groups.push({ provider: m.provider, label: PROVIDER_LABELS[m.provider] || m.provider, models: [] });
    }
    groups.find(g => g.provider === m.provider)!.models.push(m);
  }
  return groups;
}

export const DEFAULT_FREE_MODEL = "google/gemini-2.5-flash-preview-04-17";

export function getProviderForModel(modelId: string): string {
  if (!modelId) return "google";
  if (modelId.includes("/")) return "openrouter";
  return LLM_MODELS.find(m => m.id === modelId)?.provider || "google";
}

/** Check if a model is an OpenRouter model (has slash in ID) */
export function isOpenRouterModel(modelId: string): boolean {
  return modelId.includes("/");
}
