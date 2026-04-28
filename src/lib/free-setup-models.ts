// Lovable AI Gateway models — same models used in the App Builder
export const GATEWAY_MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
] as const;

export const DEFAULT_FREE_SETUP_MODEL = GATEWAY_MODELS[0].value;

const gatewayModelValues = new Set<string>(GATEWAY_MODELS.map((model) => model.value));

export const normalizeFreeSetupModel = (model?: string | null) => {
  if (!model) return DEFAULT_FREE_SETUP_MODEL;
  return gatewayModelValues.has(model) ? model : DEFAULT_FREE_SETUP_MODEL;
};
