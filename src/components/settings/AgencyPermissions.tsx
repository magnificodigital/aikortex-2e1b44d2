import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Shield, Eye, FilePlus, Pencil, Trash2, Settings, Lock, Unlock,
  UserCircle, Users, Briefcase,
} from "lucide-react";
import {
  SystemRole, SystemModule, PermissionAction,
  ROLE_CONFIG, ALL_MODULES, PERMISSION_ACTIONS,
  DEFAULT_ROLE_PERMISSIONS, ModulePermission, RolePermissionMap,
} from "@/types/rbac";

const actionIcons: Record<PermissionAction, React.ReactNode> = {
  view: <Eye className="w-3.5 h-3.5" />,
  create: <FilePlus className="w-3.5 h-3.5" />,
  edit: <Pencil className="w-3.5 h-3.5" />,
  delete: <Trash2 className="w-3.5 h-3.5" />,
  manage: <Settings className="w-3.5 h-3.5" />,
};

// Only agency-level roles the agency owner can manage
const AGENCY_ROLES: SystemRole[] = [
  "agency_admin", "agency_manager", "agency_member", "client_owner", "client_viewer",
];

const AgencyPermissions = () => {
  const [selectedRole, setSelectedRole] = useState<SystemRole>("agency_admin");
  const [permissions, setPermissions] = useState<Record<SystemRole, RolePermissionMap>>(
    () => ({ ...DEFAULT_ROLE_PERMISSIONS })
  );

  const currentPerms = permissions[selectedRole];
  const roleConfig = ROLE_CONFIG[selectedRole];

  const togglePermission = (module: SystemModule, action: PermissionAction) => {
    setPermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [module]: {
          ...prev[selectedRole][module],
          [action]: !prev[selectedRole][module][action],
        },
      },
    }));
  };

  const toggleAllModule = (module: SystemModule, enabled: boolean) => {
    const perm: ModulePermission = {
      view: enabled, create: enabled, edit: enabled, delete: enabled, manage: enabled,
    };
    setPermissions(prev => ({
      ...prev,
      [selectedRole]: { ...prev[selectedRole], [module]: perm },
    }));
  };

  const resetToDefaults = () => {
    setPermissions({ ...DEFAULT_ROLE_PERMISSIONS });
    toast({ title: "Permissões restauradas ao padrão" });
  };

  const savePermissions = () => {
    toast({ title: "Permissões salvas", description: `Permissões de ${roleConfig.label} atualizadas.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Permissões da Equipe</h3>
          <p className="text-sm text-muted-foreground">Gerencie o que cada função da sua equipe e clientes podem acessar</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedRole} onValueChange={v => setSelectedRole(v as SystemRole)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Equipe da Agência
              </div>
              {AGENCY_ROLES.filter(r => ["agency_admin", "agency_manager", "agency_member"].includes(r)).map(r => (
                <SelectItem key={r} value={r}>
                  <span className={ROLE_CONFIG[r].color}>{ROLE_CONFIG[r].label}</span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mt-1">
                <UserCircle className="w-3.5 h-3.5" /> Clientes
              </div>
              {AGENCY_ROLES.filter(r => ["client_owner", "client_viewer"].includes(r)).map(r => (
                <SelectItem key={r} value={r}>
                  <span className={ROLE_CONFIG[r].color}>{ROLE_CONFIG[r].label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge className={`${roleConfig.bg} ${roleConfig.color} border-0 text-xs`}>
            {roleConfig.level === "agency" ? "Equipe" : "Cliente"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>Restaurar Padrão</Button>
          <Button size="sm" onClick={savePermissions}>Salvar</Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{roleConfig.description}</p>

      <ScrollArea className="h-[450px]">
        <div className="space-y-1">
          <div className="grid grid-cols-[200px_repeat(5,1fr)_60px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground sticky top-0 bg-background z-10 border-b border-border">
            <span>Módulo</span>
            {PERMISSION_ACTIONS.map(a => (
              <span key={a.key} className="flex items-center gap-1 justify-center">
                {actionIcons[a.key]} {a.label}
              </span>
            ))}
            <span className="text-center">Todos</span>
          </div>

          {(["platform", "aikortex", "gestao"] as const).map(group => (
            <div key={group}>
              <div className="px-3 py-2 mt-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  {group === "platform" ? "Plataforma" : group === "aikortex" ? "Aikortex" : "Gestão"}
                </span>
              </div>
              {ALL_MODULES.filter(m => m.group === group).map(mod => {
                const modPerms = currentPerms[mod.key];
                const allEnabled = modPerms && Object.values(modPerms).every(Boolean);
                return (
                  <div
                    key={mod.key}
                    className="grid grid-cols-[200px_repeat(5,1fr)_60px] gap-2 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors items-center"
                  >
                    <span className="text-sm font-medium text-foreground">{mod.label}</span>
                    {PERMISSION_ACTIONS.map(a => (
                      <div key={a.key} className="flex justify-center">
                        <Switch
                          checked={modPerms?.[a.key] ?? false}
                          onCheckedChange={() => togglePermission(mod.key, a.key)}
                          className="scale-90"
                        />
                      </div>
                    ))}
                    <div className="flex justify-center">
                      <button
                        onClick={() => toggleAllModule(mod.key, !allEnabled)}
                        className={`p-1.5 rounded-md transition-colors ${
                          allEnabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        title={allEnabled ? "Revogar todos" : "Conceder todos"}
                      >
                        {allEnabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AgencyPermissions;
