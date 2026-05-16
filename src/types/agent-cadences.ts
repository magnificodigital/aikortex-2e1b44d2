export type CadenceChannel = 'whatsapp' | 'email' | 'sms';

export type CadenceStep = {
  id: string;
  day: number;
  hour: number;
  minute: number;
  channel: CadenceChannel;
  message_template: string;
  conditions?: {
    skip_if_replied?: boolean;
    skip_weekends?: boolean;
  };
};

export type AgentCadence = {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  steps: CadenceStep[];
  trigger_type: 'manual' | 'auto';
  enabled: boolean;
  executions_count?: number;
  created_at: string;
  updated_at: string;
};

export type CadenceExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export type CadenceExecution = {
  id: string;
  cadence_id: string;
  agent_id: string;
  contact_phone: string | null;
  contact_name: string | null;
  contact_metadata: Record<string, any>;
  current_step: number;
  total_steps: number;
  status: CadenceExecutionStatus;
  started_at: string;
  next_run_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export function sortStepsChronologically(steps: CadenceStep[]): CadenceStep[] {
  return [...steps].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    if (a.hour !== b.hour) return a.hour - b.hour;
    return a.minute - b.minute;
  });
}

export function makeEmptyStep(): CadenceStep {
  return {
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `step-${Math.random().toString(36).slice(2)}`,
    day: 0,
    hour: 9,
    minute: 0,
    channel: 'whatsapp',
    message_template: '',
  };
}
