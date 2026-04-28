import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const NODE_TIMEOUT = 25_000;

interface FlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    category: string;
    nodeType: string;
    config: Record<string, unknown>;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

function interpolate(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const parts = path.split(".");
    let val: unknown = ctx;
    for (const p of parts) {
      if (val && typeof val === "object") val = (val as Record<string, unknown>)[p];
      else return "";
    }
    return String(val ?? "");
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { flow_id, trigger_type, trigger_data, contact_identifier, channel, test_message } = await req.json();

    if (!flow_id) {
      return new Response(JSON.stringify({ error: "flow_id é obrigatório." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: flow, error: flowError } = await userClient
      .from("user_flows")
      .select("*")
      .eq("id", flow_id)
      .single();

    if (flowError || !flow) {
      return new Response(JSON.stringify({ error: "Fluxo não encontrado." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nodes = (flow.nodes || []) as FlowNode[];
    const edges = (flow.edges || []) as FlowEdge[];

    if (nodes.length < 2) {
      return new Response(JSON.stringify({ error: "Fluxo precisa de pelo menos 2 blocos." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const initialContext: Record<string, unknown> = {
      contact: { identifier: contact_identifier || user.id },
      message: test_message || "",
      channel: channel || "chat",
      ...((trigger_data && typeof trigger_data === "object") ? trigger_data : {}),
    };

    const { data: execution, error: execError } = await adminClient
      .from("flow_executions")
      .insert({
        user_id: user.id,
        flow_id,
        flow_name: flow.name,
        trigger_type: trigger_type || "manual",
        trigger_data: trigger_data || {},
        context: initialContext,
        status: "running",
      })
      .select()
      .single();

    if (execError || !execution) {
      console.error("Failed to create execution:", execError);
      return new Response(JSON.stringify({ error: "Erro ao criar execução." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggerNode = nodes.find(n => n.data?.nodeType?.startsWith("trigger_") || n.data?.category === "trigger");
    if (!triggerNode) {
      await adminClient.from("flow_executions").update({ status: "failed", error_message: "Sem nó trigger" }).eq("id", execution.id);
      return new Response(JSON.stringify({ error: "Fluxo não tem nó de trigger." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adjacency = new Map<string, string[]>();
    const conditionalEdges = new Map<string, Map<string, string>>();
    for (const edge of edges) {
      if (edge.sourceHandle) {
        if (!conditionalEdges.has(edge.source)) conditionalEdges.set(edge.source, new Map());
        conditionalEdges.get(edge.source)!.set(edge.sourceHandle, edge.target);
      } else {
        if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
        adjacency.get(edge.source)!.push(edge.target);
      }
    }

    let currentNodeId: string | null = triggerNode.id;
    const context = { ...initialContext };
    const visited = new Set<string>();

    while (currentNodeId && !visited.has(currentNodeId)) {
      visited.add(currentNodeId);
      const node = nodes.find(n => n.id === currentNodeId);
      if (!node) break;

      const nodeType = node.data?.nodeType || "";
      const config = node.data?.config || {};

      await adminClient.from("flow_executions").update({ current_node_id: currentNodeId }).eq("id", execution.id);

      const { data: logEntry } = await adminClient.from("flow_node_logs").insert({
        execution_id: execution.id,
        node_id: node.id,
        node_type: nodeType,
        node_label: node.data?.label || "",
        status: "running",
        input: { context: Object.keys(context), config },
      }).select().single();

      let nextNodeId: string | null = null;
      let nodeOutput: Record<string, unknown> = {};
      let nodeError: string | null = null;

      try {
        if (nodeType.startsWith("trigger_")) {
          nodeOutput = { triggered: true, type: nodeType };
        }
        else if (nodeType === "agent_ai" || nodeType === "agent") {
          const agentId = config.agentId as string;
          const promptTemplate = (config.systemPrompt as string) || (config.prompt_template as string) || "";
          const message = interpolate(promptTemplate || "{{message}}", context) || String(context.message || "Olá");
          const outputVar = (config.output_variable as string) || "agent_response";

          if (agentId) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), NODE_TIMEOUT);
            try {
              const resp = await fetch(`${SUPABASE_URL}/functions/v1/managed-session-chat`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: authHeader,
                },
                body: JSON.stringify({
                  agent_db_id: agentId,
                  message,
                  channel: "chat",
                }),
                signal: controller.signal,
              });
              clearTimeout(timeout);

              if (resp.ok && resp.body) {
                const reader = resp.body.getReader();
                const decoder = new TextDecoder();
                let fullText = "";
                let buffer = "";

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() || "";
                  for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") continue;
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.choices?.[0]?.delta?.content) {
                        fullText += parsed.choices[0].delta.content;
                      }
                    } catch {}
                  }
                }
                context[outputVar] = fullText;
                nodeOutput = { [outputVar]: fullText.slice(0, 200) + (fullText.length > 200 ? "..." : "") };
              } else {
                const errText = await resp.text();
                throw new Error(`Agent error: ${resp.status} - ${errText.slice(0, 200)}`);
              }
            } catch (e) {
              clearTimeout(timeout);
              if (e instanceof Error && e.name === "AbortError") {
                throw new Error("Timeout: agente não respondeu em 25s");
              }
              throw e;
            }
          } else {
            nodeOutput = { skipped: true, reason: "Nenhum agente configurado" };
          }
        }
        else if (nodeType === "condition") {
          const expression = interpolate((config.expression as string) || "", context);
          const result = !!expression && expression !== "false" && expression !== "0" && expression !== "";
          nodeOutput = { result, expression };

          const condEdges = conditionalEdges.get(currentNodeId);
          if (condEdges) {
            nextNodeId = condEdges.get(result ? "yes" : "no") || condEdges.get(result ? "true" : "false") || null;
          }
        }
        else if (nodeType === "wait") {
          const duration = (config.duration as number) || 5;
          const unit = (config.unit as string) || "seconds";
          const ms = unit === "minutes" ? duration * 60000 : unit === "hours" ? duration * 3600000 : duration * 1000;
          await new Promise(r => setTimeout(r, Math.min(ms, 10000)));
          nodeOutput = { waited: true, duration, unit };
        }
        else if (nodeType === "send_message" || nodeType === "send_whatsapp") {
          const messageTemplate = (config.message as string) || (config.template as string) || "";
          const finalMessage = interpolate(messageTemplate, context);
          nodeOutput = { message_sent: finalMessage.slice(0, 200) };
        }
        else if (nodeType === "response") {
          const template = (config.template as string) || "";
          const finalResponse = interpolate(template, context);
          context["response"] = finalResponse;
          nodeOutput = { response: finalResponse.slice(0, 200) };
        }
        else if (nodeType.startsWith("capture_")) {
          const variable = (config.variable as string) || "captured";
          context[variable] = context.message || "";
          nodeOutput = { [variable]: context[variable] };
        }
        else if (nodeType.startsWith("crm_")) {
          nodeOutput = { action: nodeType, status: "simulated" };
        }
        else if (nodeType === "variables") {
          const varName = (config.variable as string) || "";
          const varValue = interpolate((config.value as string) || "", context);
          if (varName) context[varName] = varValue;
          nodeOutput = { [varName]: varValue };
        }
        else if (nodeType === "stop") {
          nodeOutput = { stopped: true, reason: config.reason || "" };
          if (logEntry) {
            await adminClient.from("flow_node_logs").update({
              status: "completed", output: nodeOutput, completed_at: new Date().toISOString(),
            }).eq("id", logEntry.id);
          }
          break;
        }
        else {
          nodeOutput = { passed: true, type: nodeType };
        }

        if (logEntry) {
          await adminClient.from("flow_node_logs").update({
            status: "completed",
            output: nodeOutput,
            completed_at: new Date().toISOString(),
          }).eq("id", logEntry.id);
        }
      } catch (e) {
        nodeError = e instanceof Error ? e.message : "Erro desconhecido";
        console.error(`Node ${currentNodeId} (${nodeType}) failed:`, nodeError);
        if (logEntry) {
          await adminClient.from("flow_node_logs").update({
            status: "failed",
            error_message: nodeError,
            completed_at: new Date().toISOString(),
          }).eq("id", logEntry.id);
        }
      }

      if (!nextNodeId) {
        const nextNodes = adjacency.get(currentNodeId);
        nextNodeId = nextNodes?.[0] || null;
      }

      currentNodeId = nextNodeId;
    }

    await adminClient.from("flow_executions").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      context,
    }).eq("id", execution.id);

    return new Response(JSON.stringify({
      execution_id: execution.id,
      status: "completed",
      context,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("execute-flow error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
