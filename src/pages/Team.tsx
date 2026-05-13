import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import { UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamMetrics from "@/components/team/TeamMetrics";
import TeamTable from "@/components/team/TeamTable";
import TeamFilters from "@/components/team/TeamFilters";
import TeamWorkload from "@/components/team/TeamWorkload";
import TeamActivity from "@/components/team/TeamActivity";
import TeamPerformance from "@/components/team/TeamPerformance";
import TeamFeedback from "@/components/team/TeamFeedback";
import TeamProductivity from "@/components/team/TeamProductivity";
import EditMemberDialog from "@/components/team/EditMemberDialog";
import MemberDetailDialog from "@/components/team/MemberDetailDialog";
import CreateUserDialog from "@/components/shared/CreateUserDialog";

const Team = () => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, role, tenant_type, is_active, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setMembers(data); });
  }, []);

  const filtered = useMemo(() => {
    return members.filter((m: any) => {
      if (search && !(m.full_name || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      return true;
    });
  }, [search, roleFilter, statusFilter, departmentFilter, members]);

  return (
    <ModuleGate moduleKey="gestao.equipe">
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UsersRound className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Equipe</h1>
            <p className="text-sm text-muted-foreground">Gestão de colaboradores, desempenho e produtividade</p>
          </div>
        </div>

        <TeamMetrics members={members} />

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members" className="text-xs">Membros</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4 mt-4">
            <TeamFilters
              search={search} onSearchChange={setSearch}
              roleFilter={roleFilter} onRoleChange={setRoleFilter}
              statusFilter={statusFilter} onStatusChange={setStatusFilter}
              departmentFilter={departmentFilter} onDepartmentChange={setDepartmentFilter}
              onInvite={() => setShowCreate(true)}
            />
            <TeamTable members={filtered} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateUserDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        context="agency"
      />
          </ModuleGate>
    </DashboardLayout>
  );
};

export default Team;
