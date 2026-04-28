import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Shield,
  Eye,
  FilePlus,
  Pencil,
  Trash2,
  Settings,
  Clock,
  User,
  ChevronRight,
  Lock,
  Unlock,
  Sparkles,
  History,
  Crown,
  Building2,
  UserCircle,
} from "lucide-react";
import TierFeatureCard, { initTierSubFeatures, TierSubFeatures } from "./TierFeatureCard";
import {
  SystemRole,
  SystemModule,
  PermissionAction,
  FeatureFlag,
  PartnerTier,
  ROLE_CONFIG,
  ALL_MODULES,
  PERMISSION_ACTIONS,
  DEFAULT_ROLE_PERMISSIONS,
  TIER_FEATURE_CONFIG,
  FEATURE_FLAG_LABELS,
  mockAuditLog,
  ModulePermission,
  RolePermissionMap,
} from "@/types/rbac";

const actionIcons: Record<PermissionAction, React.ReactNode> = {
  view: <Eye className="w-3.5 h-3.5" />,
  create: <FilePlus className="w-3.5 h-3.5" />,
  edit: <Pencil className="w-3.5 h-3.5" />,
  delete: <Trash2 className="w-3.5 h-3.5" />,
  manage: <Settings className="w-3.5 h-3.5" />,
};

const levelIcons: Record<string, React.ReactNode> = {
  platform: <Crown className="w-4 h-4" />,
  agency: <Building2 className="w-4 h-4" />,
  client: <UserCircle className="w-4 h-4" />,
};

const AIKORTEX_FLAGS: FeatureFlag[] = ["module.agents","module.flows","module.apps","module.templates","module.messages","module.broadcasts"];
const GESTAO_FLAGS: FeatureFlag[] = ["module.clients","module.contracts","module.sales","module.crm","module.meetings","module.financial","module.team","module.tasks"];

const PermissionsManager = () => {
  const [selectedRole, setSelectedRole] = useState<SystemRole>("agency_owner");
  const [permissions, setPermissions] = useState<Record<SystemRole, RolePermissionMap>>(
    () => ({ ...DEFAULT_ROLE_PERMISSIONS })
  );
  const [selectedTier, setSelectedTier] = useState<PartnerTier>("starter");
  const [tierFeatures, setTierFeatures] = useState<Record<PartnerTier, FeatureFlag[]>>(() => {
    const initial: Record<string, FeatureFlag[]> = {};
    for (const t of Object.keys(TIER_FEATURE_CONFIG) as PartnerTier[]) {
      initial[t] = [...TIER_FEATURE_CONFIG[t].features];
    }
    return initial as Record<PartnerTier, FeatureFlag[]>;
  });
  const [tierSubFeatures, setTierSubFeatures] = useState<TierSubFeatures>(initTierSubFeatures);

  const currentPerms = permissions[selectedRole];

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

  const toggleTierFeature = (tier: PartnerTier, flag: FeatureFlag) => {
    setTierFeatures(prev => {
      const current = prev[tier];
      const has = current.includes(flag);
      return {
        ...prev,
        [tier]: has ? current.filter(f => f !== flag) : [...current, flag],
      };
    });
  };

  const toggleSubFeature = (tier: PartnerTier, subKey: string) => {
    setTierSubFeatures(prev => ({
      ...prev,
      [tier]: { ...prev[tier], [subKey]: !prev[tier][subKey] },
    }));
  };

  const saveTierFeatures = () => {
    for (const t of Object.keys(tierFeatures) as PartnerTier[]) {
      TIER_FEATURE_CONFIG[t].features = [...tierFeatures[t]];
    }
    toast({ title: "Funcionalidades salvas", description: `Configurações do tier ${TIER_FEATURE_CONFIG[selectedTier].label} atualizadas.` });
  };

  const resetToDefaults = () => {
    setPermissions({ ...DEFAULT_ROLE_PERMISSIONS });
    toast({ title: "Permissões restauradas ao padrão" });
  };

  const savePermissions = () => {
    toast({ title: "Permissões salvas", description: `Permissões de ${ROLE_CONFIG[selectedRole].label} atualizadas.` });
  };

  const roleConfig = ROLE_CONFIG[selectedRole];
  const tierConfig = TIER_FEATURE_CONFIG[selectedTier];

  const rolesByLevel = {
    platform: (Object.keys(ROLE_CONFIG) as SystemRole[]).filter(r => ROLE_CONFIG[r].level === "platform"),
    agency: (Object.keys(ROLE_CONFIG) as SystemRole[]).filter(r => ROLE_CONFIG[r].level === "agency"),
    client: (Object.keys(ROLE_CONFIG) as SystemRole[]).filter(r => ROLE_CONFIG[r].level === "client"),
  };

  const renderFeatureSection = (title: string, flags: FeatureFlag[]) => (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {flags.map(flag => (
          <TierFeatureCard
            key={flag}
            flag={flag}
            enabled={(tierFeatures[selectedTier] ?? []).includes(flag)}
            onToggle={() => toggleTierFeature(selectedTier, flag)}
            subFeatures={tierSubFeatures[selectedTier]}
            onToggleSubFeature={(subKey) => toggleSubFeature(selectedTier, subKey)}
          />
        ))}
      </div>
    </div>
  );

  const advancedFlags = (Object.keys(FEATURE_FLAG_LABELS) as FeatureFlag[]).filter(f => f.startsWith("feature."));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="permissions" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="permissions" className="text-xs gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Permissões
          </TabsTrigger>
          <TabsTrigger value="features" className="text-xs gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Funcionalidades por Plano
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1.5">
            <History className="w-3.5 h-3.5" /> Audit Log
          </TabsTrigger>
        </TabsList>

        {/* ── PERMISSIONS MATRIX ─────────────────── */}
        <TabsContent value="permissions" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <Select value={selectedRole} onValueChange={v => setSelectedRole(v as SystemRole)}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["platform", "agency", "client"] as const).map(level => (
                    <div key={level}>
                      <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        {levelIcons[level]}
                        {level === "platform" ? "Plataforma" : level === "agency" ? "Agência" : "Cliente"}
                      </div>
                      {rolesByLevel[level].map(r => (
                        <SelectItem key={r} value={r}>
                          <span className={ROLE_CONFIG[r].color}>{ROLE_CONFIG[r].label}</span>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <Badge className={`${roleConfig.bg} ${roleConfig.color} border-0 text-xs`}>
                {roleConfig.level === "platform" ? "Plataforma" : roleConfig.level === "agency" ? "Agência" : "Cliente"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetToDefaults}>Restaurar Padrão</Button>
              <Button size="sm" onClick={savePermissions}>Salvar</Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{roleConfig.description}</p>

          <ScrollArea className="h-[500px]">
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
        </TabsContent>

        {/* ── FEATURE FLAGS ──────────────────────── */}
        <TabsContent value="features" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Select value={selectedTier} onValueChange={v => setSelectedTier(v as PartnerTier)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIER_FEATURE_CONFIG) as PartnerTier[]).map(t => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <span>{TIER_FEATURE_CONFIG[t].icon}</span>
                        <span className={TIER_FEATURE_CONFIG[t].color}>{TIER_FEATURE_CONFIG[t].label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge className={`${tierConfig.bg} ${tierConfig.color} border-0`}>
                {(tierFeatures[selectedTier] ?? []).length} features
              </Badge>
            </div>
            <Button size="sm" onClick={saveTierFeatures}>Salvar Alterações</Button>
          </div>

          {renderFeatureSection("Aikortex", AIKORTEX_FLAGS)}
          {renderFeatureSection("Gestão", GESTAO_FLAGS)}
          {renderFeatureSection("Funcionalidades Avançadas", advancedFlags)}

          {/* Tier progression */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Progressão de Tiers</h4>
            <div className="flex gap-2">
              {(Object.keys(TIER_FEATURE_CONFIG) as PartnerTier[]).map((t, i, arr) => {
                const tc = TIER_FEATURE_CONFIG[t];
                return (
                  <div key={t} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer ${
                      t === selectedTier ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`} onClick={() => setSelectedTier(t)}>
                      <span>{tc.icon}</span>
                      <span className={`text-sm font-medium ${tc.color}`}>{tc.label}</span>
                      <span className="text-xs text-muted-foreground">({(tierFeatures[t] ?? []).length})</span>
                    </div>
                    {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── AUDIT LOG ──────────────────────────── */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <History className="w-4 h-4" /> Log de Auditoria
            </h4>
            <Badge variant="secondary" className="text-xs">{mockAuditLog.length} registros</Badge>
          </div>
          <div className="space-y-2">
            {mockAuditLog.map(entry => {
              const actionLabels: Record<string, { label: string; color: string }> = {
                role_assigned: { label: "Role Atribuída", color: "text-blue-600" },
                role_removed: { label: "Role Removida", color: "text-orange-600" },
                permission_changed: { label: "Permissão Alterada", color: "text-purple-600" },
                user_invited: { label: "Usuário Convidado", color: "text-emerald-600" },
                user_suspended: { label: "Usuário Suspenso", color: "text-red-600" },
                user_activated: { label: "Usuário Ativado", color: "text-green-600" },
                feature_enabled: { label: "Feature Ativada", color: "text-cyan-600" },
                feature_disabled: { label: "Feature Desativada", color: "text-gray-600" },
                financial_change: { label: "Alteração Financeira", color: "text-amber-600" },
                module_access_changed: { label: "Acesso ao Módulo", color: "text-indigo-600" },
              };
              const ac = actionLabels[entry.action] ?? { label: entry.action, color: "text-foreground" };
              return (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{entry.userName}</span>
                      <Badge className={`${ac.color} bg-transparent border border-current/20 text-xs px-1.5 py-0`}>
                        {ac.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground/80">{entry.target}</span> — {entry.details}
                    </p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PermissionsManager;
