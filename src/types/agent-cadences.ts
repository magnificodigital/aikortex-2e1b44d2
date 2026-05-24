export type CadenceChannel = 'whatsapp' | 'email' | 'sms';

/**
 * Step delay is expressed as pure offset from the cadence start:
 * day + hour + minute compose a single duration (NOT an absolute clock time).
 * Example: day=1, hour=2, minute=30 → fire 1d 2h 30min after started_at.
 *
 * Conteúdo editorial por step (apenas o que muda mensagem a mensagem):
 *   - subject_template : assunto do email (canal='email'). Suporta placeholders.
 *   - message_template : corpo da mensagem (qualquer canal). Suporta placeholders.
 *
 * Identidade do remetente (from_name, reply_to, api_key) vive em
 * agency_secrets — configurada uma vez por agência em Settings → Integrações.
 * O engine puxa de lá em runtime.
 */
export type CadenceStep = {
  id: string;
  day: number;
  hour: number;
  minute: number;
  channel: CadenceChannel;
  subject_template?: string;
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
  /** Quando trigger_type='auto', aponta para a tabela do cliente cujo INSERT dispara essa cadência. */
  auto_trigger_table_id: string | null;
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
    hour: 0,
    minute: 0,
    channel: 'email',
    subject_template: '',
    message_template: '',
  };
}

export function stepDelaySeconds(step: { day: number; hour: number; minute: number }): number {
  return (step.day ?? 0) * 86400 + (step.hour ?? 0) * 3600 + (step.minute ?? 0) * 60;
}

export function formatStepDelay(step: { day: number; hour: number; minute: number }): string {
  const parts: string[] = [];
  if (step.day) parts.push(`${step.day}d`);
  if (step.hour) parts.push(`${step.hour}h`);
  if (step.minute) parts.push(`${step.minute}min`);
  return parts.length === 0 ? 'imediato' : `após ${parts.join(' ')}`;
}
