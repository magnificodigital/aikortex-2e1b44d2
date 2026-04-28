import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserPlus, Search, MoreHorizontal, Pencil, Trash2, Loader2, ShieldCheck, ShieldOff, KeyRound, RefreshCw, Building2, User } from "lucide-react";
import { ROLE_CONFIG } from "@/types/rbac";
import CreateUserDialog from "@/components/shared/CreateUserDialog";
import EditUserDialog from "@/components/admin/EditUserDialog";
import ResetPasswordDialog from "@/components/shared/ResetPasswordDialog";
import { useAuth } from "@/contexts/AuthContext";

interface UserRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  tenant_type: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  subscription?: { status: string; plan?: { name: string } | null; billing_cycle?: string } | null;
  agency?: { id: string; agency_name: string | null; tier: string; active_clients_count: number | null } | null;
  client?: { id: string; client_name: string; agency_id: string; agency_name: string | null } | null;
}

interface AdminUsersProps {
  onNavigateToAgency?: (agencyId: string) => void;
  onNavigateToClient?: (clientId: string) => void;
}

const TIER_BADGES: Record<string, { label: string; className: string }> = {
  starter: { label: "Starter", className: "bg-muted text-muted-foreground" },
  explorer: { label: "Explorer", className: "bg-blue-500/10 text-blue-600" },
  hack: { label: "Hack", className: "bg-purple-500/10 text-purple-600" },
};

const AdminUsersTab = ({ onNavigateToAgency, onNavigateToClient }: AdminUsersProps) => {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<UserRow | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [resetPwTarget, setResetPwTarget] = useState<UserRow | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setUsers([]); setLoading(false); return; }
    fetchUsers();
  }, [authLoading, user?.id]);

  const adminInvoke = async (body: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body });
    if (error) throw new Error((data as any)?.error || error.message || "Erro desconhecido");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchUsers = async () => {
    if (authLoading || !user) return;
    setLoading(true);
    try {
      const data = await adminInvoke({ action: "list" });
      setUsers(data?.users || []);
    } catch {
      toast.error("Erro ao carregar usuários");
      setUsers([]);
    }
    setLoading(false);
  };

  const getRoleBadge = (role: string) => {
    const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
    if (!config) return <Badge variant="secondary" className="text-xs">{role}</Badge>;
    return <Badge className={`${config.bg} ${config.color} border-0 text-xs`}>{config.label}</Badge>;
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminInvoke({ action: "delete", user_id: deleteTarget.user_id });
      toast.success("Usuário excluído");
      setDeleteTarget(null);
      fetchUsers();
    } catch { toast.error("Erro ao excluir usuário"); }
    finally { setDeleteLoading(false); }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      const newActive = !toggleTarget.is_active;
      await adminInvoke({ action: newActive ? "unsuspend" : "suspend", user_id: toggleTarget.user_id });
      toast.success(newActive ? "Usuário ativado" : "Usuário desativado");
      setToggleTarget(null);
      fetchUsers();
    } catch { toast.error("Erro ao alterar status"); }
    finally { setToggleLoading(false); }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());
    let matchStatus = true;
    if (statusFilter === "active") matchStatus = u.is_active;
    else if (statusFilter === "inactive") matchStatus = !u.is_active;
    let matchRole = true;
    if (roleFilter !== "all") matchRole = u.role === roleFilter;
    return matchSearch && matchStatus && matchRole;
  });

  const isSelf = (u: UserRow) => u.user_id === user?.id;

  const getConnectionInfo = (u: UserRow) => {
    if (u.agency) return { type: "agency" as const, label: u.agency.agency_name || "Agência", id: u.agency.id, tier: u.agency.tier };
    if (u.client) return { type: "client" as const, label: `${u.client.agency_name || "Agência"} → ${u.client.client_name}`, agencyId: u.client.agency_id, clientId: u.client.id };
    if (["platform_owner", "platform_admin"].includes(u.role)) return { type: "platform" as const, label: "Plataforma" };
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Papel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Papéis</SelectItem>
              <SelectItem value="platform_owner">Admin</SelectItem>
              <SelectItem value="platform_admin">Admin Plataforma</SelectItem>
              <SelectItem value="agency_owner">Agência</SelectItem>
              <SelectItem value="agency_admin">Admin Agência</SelectItem>
              <SelectItem value="agency_manager">Gerente</SelectItem>
              <SelectItem value="agency_member">Membro</SelectItem>
              <SelectItem value="client_owner">Cliente</SelectItem>
              <SelectItem value="client_viewer">Visualizador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchUsers} disabled={loading || authLoading || !user}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Novo Usuário
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} de {users.length} usuário(s)</div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Vinculado a</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando...
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
              ) : filtered.map(u => {
                const conn = getConnectionInfo(u);
                const tierBadge = u.agency ? TIER_BADGES[u.agency.tier] || TIER_BADGES.starter : null;

                return (
                  <TableRow key={u.id} className={`${!u.is_active ? "opacity-50" : ""} cursor-pointer hover:bg-accent/50`} onClick={() => setSelectedUser(u)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {(u.full_name || u.email || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{u.full_name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      {conn ? (
                        <span
                          className={conn.type !== "platform" ? "text-blue-600 hover:underline cursor-pointer text-sm" : "text-sm text-muted-foreground"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (conn.type === "agency") onNavigateToAgency?.(conn.id!);
                            else if (conn.type === "client") onNavigateToClient?.((conn as any).clientId);
                          }}
                        >
                          {conn.type === "agency" && <Building2 className="w-3 h-3 inline mr-1" />}
                          {conn.type === "client" && <User className="w-3 h-3 inline mr-1" />}
                          {conn.label}
                        </span>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {tierBadge ? <Badge className={`${tierBadge.className} border-0 text-xs`}>{tierBadge.label}</Badge> : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 text-xs ${u.is_active ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                        {u.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Nunca"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditTarget(u); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setResetPwTarget(u); }}>
                            <KeyRound className="w-4 h-4 mr-2" /> Alterar Senha
                          </DropdownMenuItem>
                          {!isSelf(u) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setToggleTarget(u); }}>
                                {u.is_active ? <><ShieldOff className="w-4 h-4 mr-2" /> Desativar</> : <><ShieldCheck className="w-4 h-4 mr-2" /> Ativar</>}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}>
                                <Trash2 className="w-4 h-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User detail side panel */}
      <Sheet open={!!selectedUser} onOpenChange={o => !o && setSelectedUser(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedUser?.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {(selectedUser?.full_name || selectedUser?.email || "?")[0].toUpperCase()}
                </div>
              )}
              {selectedUser?.full_name || selectedUser?.email || "Usuário"}
            </SheetTitle>
          </SheetHeader>

          {selectedUser && (() => {
            const conn = getConnectionInfo(selectedUser);
            return (
              <div className="space-y-4 mt-4">
                <div className="space-y-1">
                  <p className="text-sm"><span className="text-muted-foreground">E-mail:</span> {selectedUser.email || "—"}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Papel:</span> {getRoleBadge(selectedUser.role)}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Tenant:</span> {selectedUser.tenant_type}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Status:</span>{" "}
                    <Badge className={`border-0 text-xs ${selectedUser.is_active ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                      {selectedUser.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </p>
                </div>

                <Separator />

                {conn && conn.type === "agency" && selectedUser.agency && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Agência</p>
                    <p className="text-sm">
                      <span
                        className="text-blue-600 hover:underline cursor-pointer"
                        onClick={() => { setSelectedUser(null); onNavigateToAgency?.(selectedUser.agency!.id); }}
                      >
                        {selectedUser.agency.agency_name}
                      </span>
                    </p>
                    <div className="flex gap-2 items-center">
                      <Badge className={`${(TIER_BADGES[selectedUser.agency.tier] || TIER_BADGES.starter).className} border-0 text-xs`}>
                        {(TIER_BADGES[selectedUser.agency.tier] || TIER_BADGES.starter).label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{selectedUser.agency.active_clients_count || 0} clientes</span>
                    </div>
                  </div>
                )}

                {conn && conn.type === "client" && selectedUser.client && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Cliente</p>
                    <p className="text-sm">{selectedUser.client.client_name}</p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Agência: </span>
                      <span
                        className="text-blue-600 hover:underline cursor-pointer"
                        onClick={() => { setSelectedUser(null); onNavigateToAgency?.(selectedUser.client!.agency_id); }}
                      >
                        {selectedUser.client.agency_name}
                      </span>
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Ações</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedUser(null); setEditTarget(selectedUser); }}>
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedUser(null); setResetPwTarget(selectedUser); }}>
                      <KeyRound className="w-3 h-3 mr-1" /> Resetar senha
                    </Button>
                    {!isSelf(selectedUser) && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedUser(null); setToggleTarget(selectedUser); }}>
                          {selectedUser.is_active ? <><ShieldOff className="w-3 h-3 mr-1" /> Suspender</> : <><ShieldCheck className="w-3 h-3 mr-1" /> Ativar</>}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setSelectedUser(null); setDeleteTarget(selectedUser); }}>
                          <Trash2 className="w-3 h-3 mr-1" /> Excluir
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={fetchUsers} context="platform" />
      <EditUserDialog open={!!editTarget} onClose={() => setEditTarget(null)} onSuccess={fetchUsers} user={editTarget} />
      <ResetPasswordDialog open={!!resetPwTarget} onClose={() => setResetPwTarget(null)} userId={resetPwTarget?.user_id || ""} userName={resetPwTarget?.full_name || resetPwTarget?.email || ""} />

      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggleTarget?.is_active ? "Desativar" : "Ativar"} conta</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active
                ? <>Desativar <span className="font-medium">{toggleTarget?.full_name || toggleTarget?.email}</span>?</>
                : <>Reativar <span className="font-medium">{toggleTarget?.full_name || toggleTarget?.email}</span>?</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive} disabled={toggleLoading}>
              {toggleLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {toggleTarget?.is_active ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <span className="font-medium">{deleteTarget?.full_name || deleteTarget?.email || "este usuário"}</span>? Ação irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsersTab;
