import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { AgentType } from "@/types/agent-builder";

export type AgentBuilderStep = "describe" | "customize" | "calibrate" | "create" | "done";

export type AgentProvider = "auto" | "anthropic" | "openai" | "gemini" | "openrouter";

export interface AgentStructuredConfig {
  name: string;
  agentType: AgentType;
  description: string;
  objective: string;
  toneOfVoice: string;
  language: string;
  greetingMessage: string;
  quickReplies: string[];
  instructions: string;
  provider: AgentProvider;
  model: string;
  stages: Array<{
    id: string;
    name: string;
    description: string;
    example: string;
  }>;
}

export interface CalibrationResult {
  round: number;
  userMessage: string;
  agentResponse: string;
  passed: boolean;
}

export interface AgentBuilderState {
  step: AgentBuilderStep;
  agentType: AgentType;
  prompt: string;
  structuredConfig: AgentStructuredConfig | null;
  calibrationResults: CalibrationResult[];
  isGenerating: boolean;
  createdAgentId: string | null;
}

const INITIAL_STATE: AgentBuilderState = {
  step: "describe",
  agentType: "Custom",
  prompt: "",
  structuredConfig: null,
  calibrationResults: [],
  isGenerating: false,
  createdAgentId: null,
};

interface AgentBuilderContextValue extends AgentBuilderState {
  setStep: (s: AgentBuilderStep) => void;
  setAgentType: (t: AgentType) => void;
  setPrompt: (p: string) => void;
  setStructuredConfig: (c: AgentStructuredConfig | null) => void;
  updateConfigField: <K extends keyof AgentStructuredConfig>(key: K, value: AgentStructuredConfig[K]) => void;
  setCalibrationResults: (r: CalibrationResult[]) => void;
  setIsGenerating: (g: boolean) => void;
  setCreatedAgentId: (id: string | null) => void;
  reset: () => void;
}

const AgentBuilderCtx = createContext<AgentBuilderContextValue | null>(null);

export function AgentBuilderProvider({ children, initialType = "Custom" }: { children: ReactNode; initialType?: AgentType }) {
  const [state, setState] = useState<AgentBuilderState>({ ...INITIAL_STATE, agentType: initialType });

  const setStep = useCallback((step: AgentBuilderStep) => setState(s => ({ ...s, step })), []);
  const setAgentType = useCallback((agentType: AgentType) => setState(s => ({ ...s, agentType })), []);
  const setPrompt = useCallback((prompt: string) => setState(s => ({ ...s, prompt })), []);
  const setStructuredConfig = useCallback((structuredConfig: AgentStructuredConfig | null) => setState(s => ({ ...s, structuredConfig })), []);
  const updateConfigField = useCallback(<K extends keyof AgentStructuredConfig>(key: K, value: AgentStructuredConfig[K]) => {
    setState(s => {
      if (!s.structuredConfig) return s;
      return { ...s, structuredConfig: { ...s.structuredConfig, [key]: value } };
    });
  }, []);
  const setCalibrationResults = useCallback((calibrationResults: CalibrationResult[]) => setState(s => ({ ...s, calibrationResults })), []);
  const setIsGenerating = useCallback((isGenerating: boolean) => setState(s => ({ ...s, isGenerating })), []);
  const setCreatedAgentId = useCallback((createdAgentId: string | null) => setState(s => ({ ...s, createdAgentId })), []);
  const reset = useCallback(() => setState({ ...INITIAL_STATE }), []);

  return (
    <AgentBuilderCtx.Provider value={{
      ...state, setStep, setAgentType, setPrompt, setStructuredConfig, updateConfigField,
      setCalibrationResults, setIsGenerating, setCreatedAgentId, reset,
    }}>
      {children}
    </AgentBuilderCtx.Provider>
  );
}

export function useAgentBuilder() {
  const ctx = useContext(AgentBuilderCtx);
  if (!ctx) throw new Error("useAgentBuilder must be used within AgentBuilderProvider");
  return ctx;
}
