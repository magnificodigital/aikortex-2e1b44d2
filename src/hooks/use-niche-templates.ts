import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NicheRow, TemplateCategory, TemplateRow } from "@/types/templates";

export function useNichesWithCounts(category?: TemplateCategory) {
  return useQuery({
    queryKey: ["niches", "with-counts", category ?? "all"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let countsQuery = supabase
        .from("platform_templates")
        .select("niche_id, category")
        .eq("is_active", true)
        .not("niche_id", "is", null);

      if (category) {
        countsQuery = countsQuery.eq("category", category);
      }

      const [nichesRes, countsRes] = await Promise.all([
        supabase
          .from("niche_categories")
          .select("id, slug, name_pt, icon, description, display_order")
          .eq("active", true)
          .order("display_order", { ascending: true }),
        countsQuery,
      ]);
      if (nichesRes.error) throw nichesRes.error;
      if (countsRes.error) throw countsRes.error;

      const niches = (nichesRes.data ?? []) as NicheRow[];
      const counts = new Map<string, number>();
      let total = 0;
      (countsRes.data ?? []).forEach((row: { niche_id: string | null }) => {
        if (!row.niche_id) return;
        counts.set(row.niche_id, (counts.get(row.niche_id) ?? 0) + 1);
        total++;
      });
      return { niches, counts, total };
    },
  });
}

export function useGalleryTemplates(filters: {
  nicheSlug: string | null;
  category: TemplateCategory | null;
  search: string;
}) {
  const { nicheSlug, category, search } = filters;
  return useQuery({
    queryKey: ["gallery-templates", { nicheSlug, category, search }],
    queryFn: async () => {
      let query = supabase
        .from("platform_templates")
        .select(
          "id, name, description, category, niche_id, niche_categories!inner(slug, name_pt, icon)"
        )
        .eq("is_active", true)
        .not("niche_id", "is", null);

      if (nicheSlug) {
        query = query.eq("niche_categories.slug", nicheSlug);
      }
      if (category) {
        query = query.eq("category", category);
      }
      const s = search.trim();
      if (s) {
        query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TemplateRow[];
    },
  });
}
