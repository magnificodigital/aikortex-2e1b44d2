import { useState, useEffect } from "react";
import { type Node } from "@xyflow/react";
import type { FlowNodeData } from "@/types/flow-builder";
import { AGENT_TEMPLATES } from "@/types/agent-builder";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { UserAgent } from "@/hooks/use-user-agents";

import { LLM_MODELS as ALL_MODELS } from "@/lib/llm-models";

const LLM_MODELS = ALL_MODELS.map(m => ({ value: m.id, label: m.name }));

function AgentAIConfig({ config, updateConfig }: { config: Record<string, unknown>; updateConfig: (key: string, value: unknown) => void }) {
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingAgents(false); return; }
      const { data } = await supabase
        .from("user_agents")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setUserAgents((data as any[]) || []);
      setLoadingAgents(false);
    })();
  }, []);

  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs">Agente Configurado</Label>
        {loadingAgents ? (
          <p className="text-[10px] text-muted-foreground">Carregando agentes...</p>
        ) : userAgents.length > 0 ? (
          <Select value={(config.agentId as string) || ""} onValueChange={(v) => {
            updateConfig("agentId", v);
            const agent = userAgents.find(a => a.id === v);
            if (agent) {
              updateConfig("agentType", agent.agent_type);
              if (agent.model) updateConfig("model", agent.model);
            }
          }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um agente" /></SelectTrigger>
            <SelectContent>
              {userAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{agent.name}</span>
                    <span className="text-muted-foreground text-[10px]">({agent.agent_type})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">Nenhum agente configurado. Usando template:</p>
            <Select value={(config.agentType as string) || ""} onValueChange={(v) => {
              updateConfig("agentType", v);
              const agent = AGENT_TEMPLATES.find((a) => a.type === v);
              if (agent) updateConfig("agentId", agent.id);
            }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um template" /></SelectTrigger>
              <SelectContent>
                {AGENT_TEMPLATES.map((agent) => (
                  <SelectItem key={agent.id} value={agent.type}>
                    <span className="font-medium">{agent.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-xs">System Prompt</Label>
        <Textarea value={(config.systemPrompt as string) || ""} onChange={(e) => updateConfig("systemPrompt", e.target.value)} className="text-xs min-h-[80px]" placeholder="Instruções do agente..." />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Variável de saída</Label>
        <Input value={(config.output_variable as string) || "agent_response"} onChange={(e) => updateConfig("output_variable", e.target.value)} className="h-8 text-xs" placeholder="agent_response" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Modelo LLM</Label>
        <Select value={(config.model as string) || "gemini-2.5-flash"} onValueChange={(v) => updateConfig("model", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LLM_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Temperature</Label>
        <Input type="number" step="0.1" min="0" max="2" value={(config.temperature as number) ?? 0.7} onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))} className="h-8 text-xs" />
      </div>
    </>
  );
}

interface Props {
  node: Node;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onDelete: (nodeId: string) => void;
}

export default function FlowNodeConfig({ node, onClose, onUpdate, onDelete }: Props) {
  const data = node.data as unknown as FlowNodeData;
  const config = data.config || {};

  const updateConfig = (key: string, value: unknown) => {
    onUpdate(node.id, { config: { ...config, [key]: value } });
  };

  return (
    <div className="h-full flex flex-col bg-card/80 backdrop-blur-sm">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{data.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{data.label}</p>
            <p className="text-[10px] text-muted-foreground">{data.category}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Block name</Label>
          <Input
            value={data.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Description</Label>
          <Input
            value={data.description}
            onChange={(e) => onUpdate(node.id, { description: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        {renderConfigFields(data.nodeType || "", config, updateConfig)}
      </div>

      <div className="p-3 border-t border-border">
        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete block
        </Button>
      </div>
    </div>
  );
}

function renderConfigFields(
  nodeType: string,
  config: Record<string, unknown>,
  updateConfig: (key: string, value: unknown) => void
) {
  // ── Agent ──
  if (nodeType === "agent") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Model</Label>
          <Select value={(config.model as string) || "google/gemini-2.0-flash"} onValueChange={(v) => updateConfig("model", v)}>

            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LLM_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">System Prompt</Label>
          <Textarea value={(config.systemPrompt as string) || ""} onChange={(e) => updateConfig("systemPrompt", e.target.value)} className="text-xs min-h-[80px]" placeholder="You are a helpful assistant..." />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Temperature</Label>
          <Input type="number" step="0.1" min="0" max="2" value={(config.temperature as number) ?? 0.7} onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))} className="h-8 text-xs" />
        </div>
      </>
    );
  }

  // ── Agent IA (user's configured agents) ──
  if (nodeType === "agent_ai") {
    return <AgentAIConfig config={config} updateConfig={updateConfig} />;
  }

  // ── Function ──
  if (nodeType === "function") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Language</Label>
          <Select value={(config.language as string) || "javascript"} onValueChange={(v) => updateConfig("language", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Code</Label>
          <Textarea value={(config.code as string) || ""} onChange={(e) => updateConfig("code", e.target.value)} className="text-xs min-h-[120px] font-mono" placeholder="// Your code here..." />
        </div>
      </>
    );
  }

  // ── API ──
  if (nodeType === "api") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">URL</Label>
          <Input value={(config.url as string) || ""} onChange={(e) => updateConfig("url", e.target.value)} className="h-8 text-xs" placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Method</Label>
          <Select value={(config.method as string) || "GET"} onValueChange={(v) => updateConfig("method", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Body (JSON)</Label>
          <Textarea value={(config.body as string) || ""} onChange={(e) => updateConfig("body", e.target.value)} className="text-xs min-h-[60px] font-mono" placeholder='{"key": "value"}' />
        </div>
      </>
    );
  }

  // ── Condition ──
  if (nodeType === "condition") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Expression</Label>
        <Textarea value={(config.expression as string) || ""} onChange={(e) => updateConfig("expression", e.target.value)} className="text-xs min-h-[60px] font-mono" placeholder='{{variable}} == "value"' />
        <p className="text-[9px] text-muted-foreground">True exits left, False exits right</p>
      </div>
    );
  }

  // ── Router ──
  if (nodeType === "router") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Model</Label>
          <Select value={(config.model as string) || "gemini-2.5-flash"} onValueChange={(v) => updateConfig("model", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
              <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Routing Instructions</Label>
          <Textarea value={(config.instructions as string) || ""} onChange={(e) => updateConfig("instructions", e.target.value)} className="text-xs min-h-[80px]" placeholder="Route questions to Agent A, commands to Agent B..." />
        </div>
      </>
    );
  }

  // ── Evaluator ──
  if (nodeType === "evaluator") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Model</Label>
          <Select value={(config.model as string) || "gemini-2.5-flash"} onValueChange={(v) => updateConfig("model", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
              <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Evaluation Criteria</Label>
          <Textarea value={(config.criteria as string) || ""} onChange={(e) => updateConfig("criteria", e.target.value)} className="text-xs min-h-[60px]" placeholder="Score the response quality on a scale of 1-10..." />
        </div>
      </>
    );
  }

  // ── Variables ──
  if (nodeType === "variables") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Variable Name</Label>
          <Input value={(config.variable as string) || ""} onChange={(e) => updateConfig("variable", e.target.value)} className="h-8 text-xs" placeholder="my_variable" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Value</Label>
          <Input value={(config.value as string) || ""} onChange={(e) => updateConfig("value", e.target.value)} className="h-8 text-xs" placeholder="Value or {{other_var}}" />
        </div>
      </>
    );
  }

  // ── Wait ──
  if (nodeType === "wait") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Duration</Label>
          <Input type="number" value={(config.duration as number) || 5} onChange={(e) => updateConfig("duration", parseInt(e.target.value))} className="h-8 text-xs" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Unit</Label>
          <Select value={(config.unit as string) || "seconds"} onValueChange={(v) => updateConfig("unit", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="seconds">Seconds</SelectItem>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>
    );
  }

  // ── Human in the Loop ──
  if (nodeType === "human_in_loop") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Approval Message</Label>
        <Textarea value={(config.approvalMessage as string) || ""} onChange={(e) => updateConfig("approvalMessage", e.target.value)} className="text-xs min-h-[60px]" placeholder="Please review and approve..." />
      </div>
    );
  }

  // ── Loop ──
  if (nodeType === "loop") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Iterable Variable</Label>
          <Input value={(config.iterableVariable as string) || ""} onChange={(e) => updateConfig("iterableVariable", e.target.value)} className="h-8 text-xs" placeholder="{{items}}" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Max Iterations</Label>
          <Input type="number" value={(config.maxIterations as number) || 100} onChange={(e) => updateConfig("maxIterations", parseInt(e.target.value))} className="h-8 text-xs" />
        </div>
      </>
    );
  }

  // ── Parallel ──
  if (nodeType === "parallel") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Number of Branches</Label>
        <Input type="number" min="2" max="10" value={(config.branches as number) || 2} onChange={(e) => updateConfig("branches", parseInt(e.target.value))} className="h-8 text-xs" />
      </div>
    );
  }

  // ── Guardrails ──
  if (nodeType === "guardrails") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Validation Rules</Label>
        <Textarea value={(config.rulesText as string) || ""} onChange={(e) => updateConfig("rulesText", e.target.value)} className="text-xs min-h-[80px]" placeholder="No harmful content, must be in English..." />
      </div>
    );
  }

  // ── Response ──
  if (nodeType === "response") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Format</Label>
          <Select value={(config.format as string) || "json"} onValueChange={(v) => updateConfig("format", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Template</Label>
          <Textarea value={(config.template as string) || ""} onChange={(e) => updateConfig("template", e.target.value)} className="text-xs min-h-[60px]" placeholder="{{result}}" />
        </div>
      </>
    );
  }

  // ── Triggers ──
  if (nodeType === "trigger_chat") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Channel</Label>
        <Select value={(config.channel as string) || "any"} onValueChange={(v) => updateConfig("channel", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (nodeType === "trigger_webhook") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Method</Label>
        <Select value={(config.method as string) || "POST"} onValueChange={(v) => updateConfig("method", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (nodeType === "trigger_schedule") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Frequency</Label>
          <Select value={(config.frequency as string) || "daily"} onValueChange={(v) => updateConfig("frequency", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Time</Label>
          <Input value={(config.time as string) || "09:00"} onChange={(e) => updateConfig("time", e.target.value)} className="h-8 text-xs" placeholder="09:00" />
        </div>
      </>
    );
  }

  // ── Integration blocks ──
  if (nodeType === "integration_crm") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">CRM Provider</Label>
          <Select value={(config.provider as string) || ""} onValueChange={(v) => updateConfig("provider", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select CRM" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hubspot">HubSpot</SelectItem>
              <SelectItem value="pipedrive">Pipedrive</SelectItem>
              <SelectItem value="salesforce">Salesforce</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Action</Label>
          <Select value={(config.action as string) || "create_lead"} onValueChange={(v) => updateConfig("action", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="create_lead">Create Lead</SelectItem>
              <SelectItem value="update_lead">Update Lead</SelectItem>
              <SelectItem value="create_deal">Create Deal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>
    );
  }

  if (nodeType === "integration_email") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">To</Label>
          <Input value={(config.to as string) || ""} onChange={(e) => updateConfig("to", e.target.value)} className="h-8 text-xs" placeholder="email@example.com" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Subject</Label>
          <Input value={(config.subject as string) || ""} onChange={(e) => updateConfig("subject", e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Body</Label>
          <Textarea value={(config.body as string) || ""} onChange={(e) => updateConfig("body", e.target.value)} className="text-xs min-h-[80px]" />
        </div>
      </>
    );
  }

  if (nodeType === "workflow_block") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Workflow ID</Label>
        <Input value={(config.workflowId as string) || ""} onChange={(e) => updateConfig("workflowId", e.target.value)} className="h-8 text-xs" placeholder="Select a workflow..." />
      </div>
    );
  }

  // ── Data Capture blocks ──
  if (nodeType.startsWith("capture_")) {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Prompt / Question</Label>
          <Textarea value={(config.prompt as string) || ""} onChange={(e) => updateConfig("prompt", e.target.value)} className="text-xs min-h-[60px]" placeholder="What to ask the user..." />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Variable Name</Label>
          <Input value={(config.variable as string) || ""} onChange={(e) => updateConfig("variable", e.target.value)} className="h-8 text-xs" placeholder="name, email, phone..." />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Required</Label>
          <Select value={String(config.required ?? true)} onValueChange={(v) => updateConfig("required", v === "true")}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>
    );
  }

  // ── CRM Action blocks ──
  if (nodeType.startsWith("crm_")) {
    return (
      <>
        {config.provider !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Provider</Label>
            <Select value={(config.provider as string) || "internal"} onValueChange={(v) => updateConfig("provider", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal CRM</SelectItem>
                <SelectItem value="hubspot">HubSpot</SelectItem>
                <SelectItem value="pipedrive">Pipedrive</SelectItem>
                <SelectItem value="salesforce">Salesforce</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {config.title !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Title</Label>
            <Input value={(config.title as string) || ""} onChange={(e) => updateConfig("title", e.target.value)} className="h-8 text-xs" />
          </div>
        )}
        {config.tag !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Tag</Label>
            <Input value={(config.tag as string) || ""} onChange={(e) => updateConfig("tag", e.target.value)} className="h-8 text-xs" placeholder="hot-lead, vip..." />
          </div>
        )}
        {config.scoreChange !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Score Change</Label>
            <Input type="number" value={(config.scoreChange as number) || 0} onChange={(e) => updateConfig("scoreChange", parseInt(e.target.value))} className="h-8 text-xs" />
          </div>
        )}
        {config.notes !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={(config.notes as string) || ""} onChange={(e) => updateConfig("notes", e.target.value)} className="text-xs min-h-[60px]" />
          </div>
        )}
        {config.delay !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Delay</Label>
            <Input value={(config.delay as string) || "24h"} onChange={(e) => updateConfig("delay", e.target.value)} className="h-8 text-xs" placeholder="24h, 3d..." />
          </div>
        )}
        {config.message !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Message</Label>
            <Textarea value={(config.message as string) || ""} onChange={(e) => updateConfig("message", e.target.value)} className="text-xs min-h-[60px]" />
          </div>
        )}
      </>
    );
  }

  // ── Knowledge / IA blocks ──
  if (["knowledge_search", "rag_search", "context_injection", "memory_lookup", "similarity_search", "agent_memory", "doc_search"].includes(nodeType)) {
    return (
      <>
        {config.query !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Query</Label>
            <Textarea value={(config.query as string) || ""} onChange={(e) => updateConfig("query", e.target.value)} className="text-xs min-h-[60px]" placeholder="Search query or {{variable}}" />
          </div>
        )}
        {config.collection !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Collection</Label>
            <Input value={(config.collection as string) || ""} onChange={(e) => updateConfig("collection", e.target.value)} className="h-8 text-xs" placeholder="faq, docs..." />
          </div>
        )}
        {config.topK !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Top K Results</Label>
            <Input type="number" value={(config.topK as number) || 5} onChange={(e) => updateConfig("topK", parseInt(e.target.value))} className="h-8 text-xs" />
          </div>
        )}
        {config.maxResults !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Max Results</Label>
            <Input type="number" value={(config.maxResults as number) || 5} onChange={(e) => updateConfig("maxResults", parseInt(e.target.value))} className="h-8 text-xs" />
          </div>
        )}
        {config.context !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Context</Label>
            <Textarea value={(config.context as string) || ""} onChange={(e) => updateConfig("context", e.target.value)} className="text-xs min-h-[60px]" placeholder="Context to inject..." />
          </div>
        )}
        {config.action !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Action</Label>
            <Select value={(config.action as string) || "store"} onValueChange={(v) => updateConfig("action", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="store">Store</SelectItem>
                <SelectItem value="retrieve">Retrieve</SelectItem>
                <SelectItem value="clear">Clear</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {config.key !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Key</Label>
            <Input value={(config.key as string) || ""} onChange={(e) => updateConfig("key", e.target.value)} className="h-8 text-xs" />
          </div>
        )}
        {config.threshold !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Threshold</Label>
            <Input type="number" step="0.1" value={(config.threshold as number) || 0.8} onChange={(e) => updateConfig("threshold", parseFloat(e.target.value))} className="h-8 text-xs" />
          </div>
        )}
      </>
    );
  }

  // ── Database / Storage blocks ──
  if (nodeType.startsWith("db_")) {
    return (
      <>
        {config.table !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Table</Label>
            <Input value={(config.table as string) || ""} onChange={(e) => updateConfig("table", e.target.value)} className="h-8 text-xs" placeholder="leads, contacts..." />
          </div>
        )}
        {config.recordId !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Record ID</Label>
            <Input value={(config.recordId as string) || ""} onChange={(e) => updateConfig("recordId", e.target.value)} className="h-8 text-xs" placeholder="{{id}}" />
          </div>
        )}
        {config.data !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Data (JSON)</Label>
            <Textarea value={(config.data as string) || ""} onChange={(e) => updateConfig("data", e.target.value)} className="text-xs min-h-[60px] font-mono" placeholder='{"name": "{{name}}"}' />
          </div>
        )}
        {config.filter !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Filter</Label>
            <Input value={(config.filter as string) || ""} onChange={(e) => updateConfig("filter", e.target.value)} className="h-8 text-xs" placeholder="status = 'active'" />
          </div>
        )}
        {config.key !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Variable Key</Label>
            <Input value={(config.key as string) || ""} onChange={(e) => updateConfig("key", e.target.value)} className="h-8 text-xs" />
          </div>
        )}
        {config.value !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Value</Label>
            <Input value={(config.value as string) || ""} onChange={(e) => updateConfig("value", e.target.value)} className="h-8 text-xs" />
          </div>
        )}
        {config.query !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Query</Label>
            <Textarea value={(config.query as string) || ""} onChange={(e) => updateConfig("query", e.target.value)} className="text-xs min-h-[60px] font-mono" placeholder="SELECT * FROM..." />
          </div>
        )}
      </>
    );
  }

  // ── Dev / Advanced blocks ──
  if (["run_code", "custom_function", "json_editor", "http_request", "webhook_response", "transform_payload", "data_mapping", "script_executor"].includes(nodeType)) {
    return (
      <>
        {config.language !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Language</Label>
            <Select value={(config.language as string) || "javascript"} onValueChange={(v) => updateConfig("language", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {config.code !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Code</Label>
            <Textarea value={(config.code as string) || ""} onChange={(e) => updateConfig("code", e.target.value)} className="text-xs min-h-[100px] font-mono" placeholder="// Your code here..." />
          </div>
        )}
        {config.functionName !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Function Name</Label>
            <Input value={(config.functionName as string) || ""} onChange={(e) => updateConfig("functionName", e.target.value)} className="h-8 text-xs" />
          </div>
        )}
        {config.url !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">URL</Label>
            <Input value={(config.url as string) || ""} onChange={(e) => updateConfig("url", e.target.value)} className="h-8 text-xs" placeholder="https://..." />
          </div>
        )}
        {config.method !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Method</Label>
            <Select value={(config.method as string) || "GET"} onValueChange={(v) => updateConfig("method", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {config.body !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Body</Label>
            <Textarea value={(config.body as string) || ""} onChange={(e) => updateConfig("body", e.target.value)} className="text-xs min-h-[60px] font-mono" />
          </div>
        )}
        {config.statusCode !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Status Code</Label>
            <Input type="number" value={(config.statusCode as number) || 200} onChange={(e) => updateConfig("statusCode", parseInt(e.target.value))} className="h-8 text-xs" />
          </div>
        )}
        {config.mapping !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Mapping</Label>
            <Textarea value={(config.mapping as string) || ""} onChange={(e) => updateConfig("mapping", e.target.value)} className="text-xs min-h-[60px] font-mono" placeholder="source.field -> target.field" />
          </div>
        )}
        {config.transform !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Transform</Label>
            <Textarea value={(config.transform as string) || ""} onChange={(e) => updateConfig("transform", e.target.value)} className="text-xs min-h-[60px] font-mono" />
          </div>
        )}
      </>
    );
  }

  // ── Output blocks (new) ──
  if (["send_message", "send_whatsapp", "create_notification", "generate_response", "confirmation_message"].includes(nodeType)) {
    return (
      <>
        {config.message !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Message</Label>
            <Textarea value={(config.message as string) || ""} onChange={(e) => updateConfig("message", e.target.value)} className="text-xs min-h-[60px]" placeholder="Your message..." />
          </div>
        )}
        {config.phone !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Phone</Label>
            <Input value={(config.phone as string) || ""} onChange={(e) => updateConfig("phone", e.target.value)} className="h-8 text-xs" placeholder="+55..." />
          </div>
        )}
        {config.template !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Template</Label>
            <Input value={(config.template as string) || ""} onChange={(e) => updateConfig("template", e.target.value)} className="h-8 text-xs" />
          </div>
        )}
        {config.title !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Title</Label>
            <Input value={(config.title as string) || ""} onChange={(e) => updateConfig("title", e.target.value)} className="h-8 text-xs" />
          </div>
        )}
        {config.model !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Model</Label>
            <Select value={(config.model as string) || "gemini-2.5-flash"} onValueChange={(v) => updateConfig("model", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {config.prompt !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Prompt</Label>
            <Textarea value={(config.prompt as string) || ""} onChange={(e) => updateConfig("prompt", e.target.value)} className="text-xs min-h-[60px]" />
          </div>
        )}
        {config.to !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">To</Label>
            <Input value={(config.to as string) || ""} onChange={(e) => updateConfig("to", e.target.value)} className="h-8 text-xs" placeholder="email@example.com" />
          </div>
        )}
        {config.subject !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Subject</Label>
            <Input value={(config.subject as string) || ""} onChange={(e) => updateConfig("subject", e.target.value)} className="h-8 text-xs" />
          </div>
        )}
        {config.body !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Body</Label>
            <Textarea value={(config.body as string) || ""} onChange={(e) => updateConfig("body", e.target.value)} className="text-xs min-h-[80px]" />
          </div>
        )}
      </>
    );
  }

  // ── Processing blocks (new) ──
  if (["prompt", "text_parser", "data_extractor", "intent_classifier", "summarizer", "enrichment", "validator", "json_formatter"].includes(nodeType)) {
    return (
      <>
        {config.model !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Model</Label>
            <Select value={(config.model as string) || "gemini-2.5-flash"} onValueChange={(v) => updateConfig("model", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {config.prompt !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Prompt</Label>
            <Textarea value={(config.prompt as string) || ""} onChange={(e) => updateConfig("prompt", e.target.value)} className="text-xs min-h-[60px]" />
          </div>
        )}
        {config.pattern !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Pattern / Regex</Label>
            <Input value={(config.pattern as string) || ""} onChange={(e) => updateConfig("pattern", e.target.value)} className="h-8 text-xs font-mono" />
          </div>
        )}
        {config.fields !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Fields</Label>
            <Input value={(config.fields as string) || ""} onChange={(e) => updateConfig("fields", e.target.value)} className="h-8 text-xs" placeholder="name, email, phone" />
          </div>
        )}
        {config.intents !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Intents</Label>
            <Textarea value={(config.intents as string) || ""} onChange={(e) => updateConfig("intents", e.target.value)} className="text-xs min-h-[60px]" placeholder="purchase, support, billing..." />
          </div>
        )}
        {config.maxLength !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Max Length</Label>
            <Input type="number" value={(config.maxLength as number) || 200} onChange={(e) => updateConfig("maxLength", parseInt(e.target.value))} className="h-8 text-xs" />
          </div>
        )}
        {config.rules !== undefined && typeof config.rules === "string" && (
          <div className="space-y-2">
            <Label className="text-xs">Validation Rules</Label>
            <Textarea value={(config.rules as string) || ""} onChange={(e) => updateConfig("rules", e.target.value)} className="text-xs min-h-[60px]" placeholder="email: required, valid_email" />
          </div>
        )}
        {config.template !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Template</Label>
            <Textarea value={(config.template as string) || ""} onChange={(e) => updateConfig("template", e.target.value)} className="text-xs min-h-[60px] font-mono" placeholder='{"result": {{value}}}' />
          </div>
        )}
        {config.temperature !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Temperature</Label>
            <Input type="number" step="0.1" min="0" max="2" value={(config.temperature as number) ?? 0.7} onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))} className="h-8 text-xs" />
          </div>
        )}
      </>
    );
  }

  // ── Logic blocks (new) ──
  if (nodeType === "switch_block") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Variable</Label>
          <Input value={(config.variable as string) || ""} onChange={(e) => updateConfig("variable", e.target.value)} className="h-8 text-xs" placeholder="{{status}}" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Cases (one per line)</Label>
          <Textarea value={(config.cases as string) || ""} onChange={(e) => updateConfig("cases", e.target.value)} className="text-xs min-h-[80px] font-mono" placeholder="active&#10;inactive&#10;pending" />
        </div>
      </>
    );
  }

  if (nodeType === "filter") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Filter Condition</Label>
        <Textarea value={(config.condition as string) || ""} onChange={(e) => updateConfig("condition", e.target.value)} className="text-xs min-h-[60px] font-mono" placeholder='{{score}} > 5' />
      </div>
    );
  }

  if (nodeType === "score_check") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Threshold</Label>
          <Input type="number" value={(config.threshold as number) || 7} onChange={(e) => updateConfig("threshold", parseInt(e.target.value))} className="h-8 text-xs" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Operator</Label>
          <Select value={(config.operator as string) || ">="} onValueChange={(v) => updateConfig("operator", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[">=", ">", "<=", "<", "==", "!="].map((op) => (
                <SelectItem key={op} value={op}>{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </>
    );
  }

  if (nodeType === "compare_values") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Value A</Label>
          <Input value={(config.valueA as string) || ""} onChange={(e) => updateConfig("valueA", e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Operator</Label>
          <Select value={(config.operator as string) || "=="} onValueChange={(v) => updateConfig("operator", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["==", "!=", ">", "<", ">=", "<=", "contains"].map((op) => (
                <SelectItem key={op} value={op}>{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Value B</Label>
          <Input value={(config.valueB as string) || ""} onChange={(e) => updateConfig("valueB", e.target.value)} className="h-8 text-xs" />
        </div>
      </>
    );
  }

  // ── Control blocks (new) ──
  if (nodeType === "retry") {
    return (
      <>
        <div className="space-y-2">
          <Label className="text-xs">Max Retries</Label>
          <Input type="number" value={(config.maxRetries as number) || 3} onChange={(e) => updateConfig("maxRetries", parseInt(e.target.value))} className="h-8 text-xs" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Delay (ms)</Label>
          <Input type="number" value={(config.delayMs as number) || 1000} onChange={(e) => updateConfig("delayMs", parseInt(e.target.value))} className="h-8 text-xs" />
        </div>
      </>
    );
  }

  if (nodeType === "stop") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Reason</Label>
        <Input value={(config.reason as string) || ""} onChange={(e) => updateConfig("reason", e.target.value)} className="h-8 text-xs" placeholder="Why stop the flow?" />
      </div>
    );
  }

  if (nodeType === "timeout") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Timeout (seconds)</Label>
        <Input type="number" value={(config.timeoutSeconds as number) || 30} onChange={(e) => updateConfig("timeoutSeconds", parseInt(e.target.value))} className="h-8 text-xs" />
      </div>
    );
  }

  if (nodeType === "queue") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Queue Name</Label>
        <Input value={(config.queueName as string) || ""} onChange={(e) => updateConfig("queueName", e.target.value)} className="h-8 text-xs" placeholder="default, priority..." />
      </div>
    );
  }

  if (nodeType === "split") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Split By</Label>
        <Input value={(config.splitBy as string) || ""} onChange={(e) => updateConfig("splitBy", e.target.value)} className="h-8 text-xs" placeholder="Field or expression" />
      </div>
    );
  }

  // ── New trigger blocks ──
  if (["trigger_new_lead", "trigger_new_message", "trigger_new_contact", "trigger_manual"].includes(nodeType)) {
    return (
      <>
        {config.source !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Source</Label>
            <Select value={(config.source as string) || "any"} onValueChange={(v) => updateConfig("source", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="import">Import</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {config.channel !== undefined && (
          <div className="space-y-2">
            <Label className="text-xs">Channel</Label>
            <Select value={(config.channel as string) || "any"} onValueChange={(v) => updateConfig("channel", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </>
    );
  }

  if (nodeType === "trigger_crm_event") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Event Type</Label>
        <Select value={(config.event as string) || "deal_updated"} onValueChange={(v) => updateConfig("event", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="deal_updated">Deal Updated</SelectItem>
            <SelectItem value="deal_created">Deal Created</SelectItem>
            <SelectItem value="contact_created">Contact Created</SelectItem>
            <SelectItem value="task_completed">Task Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (nodeType === "trigger_stage_change") {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Pipeline</Label>
        <Input value={(config.pipeline as string) || ""} onChange={(e) => updateConfig("pipeline", e.target.value)} className="h-8 text-xs" placeholder="Sales Pipeline" />
      </div>
    );
  }

  return (
    <p className="text-[10px] text-muted-foreground italic">Additional settings will be added soon.</p>
  );
}
