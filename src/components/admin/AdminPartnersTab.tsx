import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Award, Search } from "lucide-react";
import { toast } from "sonner";
import { TIER_CONFIG, type PartnerTier } from "@/types/partner";
import { useAuth } from "@/contexts/AuthContext";

const TIERS: PartnerTier[] = ["starter", "explorer", "hack"];

const tierBadge = (tier: string) => {
  const cfg = TIER_CONFIG[tier as PartnerTier];
  if (!cfg) return <Badge variant="outline">{tier}</Badge>;
  return <Badge variant="outline" className={`${cfg.color} border-current/20`}>{cfg.label}</Badge>;
};

interface PartnerRow {
  id: string;
  user_id: string;
  tier: string;
  clients_served: number;
  revenue: number;
  solutions_published: number;
  certifications_earned: number;
  updated_at: string;
  full_name: string | null;
}

const AdminPartnersTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [editPartner, setEditPartner] = useState<PartnerRow | null>(null);
  const [newTier, setNewTier] = useState<PartnerTier>("starter");
  const [note, setNote] = useState("");

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      // We need to join partner_tiers with profiles
      const { data: tiers, error: tiersErr } = await supabase
        .from("partner_tiers" as any)
        .select("*");
      if (tiersErr) throw tiersErr;

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, full_name");
      if (profErr) throw profErr;

      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p.full_name]));

      return ((tiers ?? []) as any[]).map((t): PartnerRow => ({
        ...t,
        full_name: profileMap.get(t.user_id) ?? t.user_id,
      }));
    },
  });

  const updateTier = useMutation({
    mutationFn: async () => {
      if (!editPartner) return;
      const { error } = await supabase
        .from("partner_tiers" as any)
        .update({
          tier: newTier,
          tier_upgraded_at: new Date().toISOString(),
          tier_upgraded_by: user?.id,
          notes: note || null,
        })
        .eq("id", editPartner.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      toast.success("Tier atualizado com sucesso");
      setEditPartner(null);
    },
    onError: () => toast.error("Erro ao atualizar tier"),
  });

  const filtered = partners.filter((p) => {
    if (filterTier !== "all" && p.tier !== filterTier) return false;
    if (search && !(p.full_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = TIERS.reduce((acc, t) => {
    acc[t] = partners.filter(p => p.tier === t).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TIERS.map((t) => (
          <Card key={t} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setFilterTier(filterTier === t ? "all" : t)}>
            <CardContent className="p-4 flex items-center gap-3">
              <Award className={`w-5 h-5 ${TIER_CONFIG[t].color}`} />
              <div>
                <p className="text-lg font-bold text-foreground">{counts[t] ?? 0}</p>
                <p className="text-xs text-muted-foreground">{TIER_CONFIG[t].label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar parceiro..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TIERS.map((t) => (
              <SelectItem key={t} value={t}>{TIER_CONFIG[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agência</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Soluções</TableHead>
                <TableHead className="text-right">Certificações</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum parceiro encontrado</TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.full_name}</TableCell>
                    <TableCell>{tierBadge(p.tier)}</TableCell>
                    <TableCell className="text-right text-sm">{p.clients_served}</TableCell>
                    <TableCell className="text-right text-sm">R$ {Number(p.revenue).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right text-sm">{p.solutions_published}</TableCell>
                    <TableCell className="text-right text-sm">{p.certifications_earned}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setEditPartner(p); setNewTier(p.tier as PartnerTier); setNote(""); }}>
                        Alterar Tier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editPartner} onOpenChange={(o) => !o && setEditPartner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Tier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Agência</Label>
              <p className="font-medium text-foreground">{editPartner?.full_name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tier atual</Label>
              <div className="mt-1">{editPartner && tierBadge(editPartner.tier)}</div>
            </div>
            <div className="space-y-1">
              <Label>Novo Tier</Label>
              <Select value={newTier} onValueChange={(v) => setNewTier(v as PartnerTier)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIERS.map((t) => (
                    <SelectItem key={t} value={t}>{TIER_CONFIG[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nota interna (opcional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo da alteração..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPartner(null)}>Cancelar</Button>
            <Button onClick={() => updateTier.mutate()} disabled={updateTier.isPending}>
              {updateTier.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPartnersTab;
