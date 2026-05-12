import { diff } from "deep-object-diff";

/** Groups config keys into UI sections (matches sidenav from AgentRightPanel). */
export const SECTION_MAP: Record<string, string> = {
  name: "Identidade",
  description: "Identidade",
  objective: "Identidade",
  instructions: "Identidade",
  toneOfVoice: "Identidade",
  greetingMessage: "Identidade",
  avatarUrl: "Identidade",
  voiceConfig: "Voz",
  channels: "Canais",
  integrations: "Integrações",
  integrationConfigs: "Integrações",
  knowledgeFiles: "Conhecimento",
  urls: "Conhecimento",
  apiConfig: "Avançado",
};

export interface FieldChange {
  path: string;
  section: string;
  kind: "added" | "removed" | "changed";
  before: any;
  after: any;
}

function classify(beforeVal: any, afterVal: any): "added" | "removed" | "changed" {
  if (beforeVal === undefined) return "added";
  if (afterVal === undefined) return "removed";
  return "changed";
}

function topKey(path: string) {
  return path.split(".")[0];
}

/** Walks a diff object recursively and flattens it to leaf changes. */
function walk(node: any, before: any, after: any, base: string, out: FieldChange[]) {
  if (node === undefined) return;
  // Primitive or array: terminal change
  if (typeof node !== "object" || node === null || Array.isArray(node)) {
    const path = base || "root";
    const section = SECTION_MAP[topKey(path)] || "Outros";
    out.push({
      path,
      section,
      kind: classify(before, after),
      before,
      after,
    });
    return;
  }
  for (const k of Object.keys(node)) {
    const child = node[k];
    const childBefore = before && typeof before === "object" ? before[k] : undefined;
    const childAfter = after && typeof after === "object" ? after[k] : undefined;
    const nextPath = base ? `${base}.${k}` : k;
    if (child !== null && typeof child === "object" && !Array.isArray(child)) {
      walk(child, childBefore, childAfter, nextPath, out);
    } else {
      const section = SECTION_MAP[topKey(nextPath)] || "Outros";
      out.push({
        path: nextPath,
        section,
        kind: classify(childBefore, childAfter),
        before: childBefore,
        after: childAfter,
      });
    }
  }
}

export function computeAgentDiff(before: Record<string, any> | null, after: Record<string, any> | null): FieldChange[] {
  const b = before ?? {};
  const a = after ?? {};
  const d = diff(b, a) as any;
  const out: FieldChange[] = [];
  walk(d, b, a, "", out);
  return out;
}

export function summarizeBySection(changes: FieldChange[]) {
  const map = new Map<string, FieldChange[]>();
  for (const c of changes) {
    if (!map.has(c.section)) map.set(c.section, []);
    map.get(c.section)!.push(c);
  }
  return Array.from(map.entries());
}

export function countChanges(changes: FieldChange[]) {
  let added = 0, removed = 0, changed = 0;
  for (const c of changes) {
    if (c.kind === "added") added++;
    else if (c.kind === "removed") removed++;
    else changed++;
  }
  return { added, removed, changed, total: changes.length };
}
