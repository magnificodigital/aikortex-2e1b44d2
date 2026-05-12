export type ReasoningDepth = "low" | "medium" | "high";
export type MemoryScope = "agent" | "client" | "shared";

export type AgentCapabilities = {
  planning: { enabled: boolean; max_steps: number };
  reasoning: { enabled: boolean; depth: ReasoningDepth };
  code_runtime: { enabled: boolean };
  memory: { enabled: boolean; scope: MemoryScope };
  auto_integration: { enabled: boolean };
};

export const DEFAULT_CAPABILITIES: AgentCapabilities = {
  planning: { enabled: false, max_steps: 10 },
  reasoning: { enabled: false, depth: "medium" },
  code_runtime: { enabled: false },
  memory: { enabled: false, scope: "agent" },
  auto_integration: { enabled: false },
};

export function mergeCapabilities(raw: unknown): AgentCapabilities {
  const r = (raw ?? {}) as Partial<AgentCapabilities>;
  return {
    planning: { ...DEFAULT_CAPABILITIES.planning, ...(r.planning ?? {}) },
    reasoning: { ...DEFAULT_CAPABILITIES.reasoning, ...(r.reasoning ?? {}) },
    code_runtime: { ...DEFAULT_CAPABILITIES.code_runtime, ...(r.code_runtime ?? {}) },
    memory: { ...DEFAULT_CAPABILITIES.memory, ...(r.memory ?? {}) },
    auto_integration: { ...DEFAULT_CAPABILITIES.auto_integration, ...(r.auto_integration ?? {}) },
  };
}

export function countActiveCapabilities(c: AgentCapabilities): number {
  let n = 0;
  if (c.planning.enabled) n++;
  if (c.reasoning.enabled) n++;
  if (c.memory.enabled) n++;
  // code_runtime / auto_integration: placeholders, sempre desligados
  return n;
}
