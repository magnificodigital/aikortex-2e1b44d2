import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ShieldCheck, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CreateUserDialog from "@/components/shared/CreateUserDialog";
import EditUserDialog from "@/components/admin/EditUserDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Equipe da Plataforma — usuários do admin do SaaS (platform_owner/platform_admin).
 * É o nível mais alto da hierarquia de Gestão: Plataforma → Agências → Clientes.
 * Criação/edição acontece AQUI (no contexto certo); a aba Usuários é só busca global.
 */

interface PlatformUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  tenant_type: string;
  is_active: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  platform_owner: "Dono do SaaS",
  platform_admin: "Admin",
};

export default function PlatformTeamSection() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlatformUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("admin-users", { body: { action: "list" } });
    const all = (data as any)?.users ?? [];
    setUsers(all.filter((u: any) => ["platform_owner", "platform_admin"].includes(u.role)));
    setLoading(false);
  };
  useEffect(() => { fetchTeam(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "delete", user_id: deleteTarget.user_id },
    });
    setDeleting(false);
    if (error) { toast.error("Falha ao excluir usuário"); return; }
    toast.success("Usuário excluído");
    setDeleteTarget(null);
    fetchTeam();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Equipe da Plataforma</h3>
          <Badge variant="outline" className="text-[10px]">{users.length}</Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">— administradores do SaaS</span>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Criar admin
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline" /></TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhum administrador da plataforma</TableCell></TableRow>
              ) : users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{ROLE_LABEL[u.role] || u.role}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditTarget(u)}><Pencil className="w-3.5 h-3.5" /></Button>
                    {u.role !== "platform_owner" && (
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(u)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={fetchTeam} context="platform" />
      <EditUserDialog open={!!editTarget} onClose={() => setEditTarget(null)} onSuccess={fetchTeam} user={editTarget as any} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <strong>{deleteTarget?.email}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>{deleting ? "Excluindo…" : "Excluir"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
