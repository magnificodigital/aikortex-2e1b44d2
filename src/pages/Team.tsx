import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { UsersRound } from "lucide-react";
import { mockTeamMembers, TeamMember } from "@/types/team";
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
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);

  const filtered = useMemo(() => {
    return mockTeamMembers.filter((m) => {
      if (search && !m.fullName.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (departmentFilter !== "all" && m.department !== departmentFilter) return false;
      return true;
    });
  }, [search, roleFilter, statusFilter, departmentFilter]);

  return (
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

        <TeamMetrics members={mockTeamMembers} />

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members" className="text-xs">Membros</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs">Desempenho</TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs">Feedback</TabsTrigger>
            <TabsTrigger value="productivity" className="text-xs">Produtividade</TabsTrigger>
            <TabsTrigger value="workload" className="text-xs">Carga</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4 mt-4">
            <TeamFilters
              search={search} onSearchChange={setSearch}
              roleFilter={roleFilter} onRoleChange={setRoleFilter}
              statusFilter={statusFilter} onStatusChange={setStatusFilter}
              departmentFilter={departmentFilter} onDepartmentChange={setDepartmentFilter}
              onInvite={() => setShowCreate(true)}
            />
            <TeamTable members={filtered} onView={setViewingMember} onEdit={setEditingMember} />
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <TeamPerformance members={mockTeamMembers} onMemberClick={setViewingMember} />
          </TabsContent>

          <TabsContent value="feedback" className="mt-4">
            <TeamFeedback members={mockTeamMembers} />
          </TabsContent>

          <TabsContent value="productivity" className="mt-4">
            <TeamProductivity members={mockTeamMembers} onMemberClick={setViewingMember} />
          </TabsContent>

          <TabsContent value="workload" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TeamWorkload members={mockTeamMembers} onMemberClick={setViewingMember} />
              <TeamActivity />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateUserDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { /* TODO: reload real data */ }}
        context="agency"
      />
      <EditMemberDialog member={editingMember} open={!!editingMember} onOpenChange={(o) => !o && setEditingMember(null)} />
      <MemberDetailDialog member={viewingMember} open={!!viewingMember} onOpenChange={(o) => !o && setViewingMember(null)} />
    </DashboardLayout>
  );
};

export default Team;
