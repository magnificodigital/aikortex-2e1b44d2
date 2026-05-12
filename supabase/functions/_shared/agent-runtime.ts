/**
 * Overlays the published agent_versions.config_snapshot onto an agent row's `config`
 * so runtime functions always run the production-pinned configuration.
 *
 * Falls back to the raw `config` if no version has been published yet
 * (backward-compatible with agents created before the versioning system).
 */
export async function overlayPublishedConfig<T extends { published_version_id?: string | null; config?: any }>(
  supabase: any,
  agent: T | null | undefined,
): Promise<T | null | undefined> {
  if (!agent || !agent.published_version_id) return agent;
  const { data: v } = await supabase
    .from("agent_versions")
    .select("config_snapshot")
    .eq("id", agent.published_version_id)
    .maybeSingle();
  if (v?.config_snapshot) {
    (agent as any).config = v.config_snapshot;
  }
  return agent;
}
