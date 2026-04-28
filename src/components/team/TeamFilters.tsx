import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Filter } from "lucide-react";
import { UserRole, UserStatus, Department, roleConfig, statusConfig, departmentConfig } from "@/types/team";

interface TeamFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  roleFilter: string;
  onRoleChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  departmentFilter: string;
  onDepartmentChange: (v: string) => void;
  onInvite: () => void;
}

const TeamFilters = ({
  search, onSearchChange, roleFilter, onRoleChange,
  statusFilter, onStatusChange, departmentFilter, onDepartmentChange, onInvite,
}: TeamFiltersProps) => (
  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
    <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input placeholder="Buscar membro..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9 h-9 text-sm" />
    </div>
    <Select value={roleFilter} onValueChange={onRoleChange}>
      <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Função" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas funções</SelectItem>
        {(Object.keys(roleConfig) as UserRole[]).map((r) => (
          <SelectItem key={r} value={r}>{roleConfig[r].label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={departmentFilter} onValueChange={onDepartmentChange}>
      <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Departamento" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos dept.</SelectItem>
        {(Object.keys(departmentConfig) as Department[]).map((d) => (
          <SelectItem key={d} value={d}>{departmentConfig[d].label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={statusFilter} onValueChange={onStatusChange}>
      <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        {(Object.keys(statusConfig) as UserStatus[]).map((s) => (
          <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button size="sm" className="gap-1.5" onClick={onInvite}>
      <UserPlus className="w-4 h-4" /> Adicionar Membro
    </Button>
  </div>
);

export default TeamFilters;
