import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { contractStatusConfig, contractTypeConfig } from "@/types/contract";

interface ContractFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  typeFilter: string;
  onTypeChange: (v: string) => void;
}

const ContractFilters = ({ search, onSearchChange, statusFilter, onStatusChange, typeFilter, onTypeChange }: ContractFiltersProps) => (
  <div className="flex flex-wrap gap-3">
    <div className="relative flex-1 min-w-[200px] max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input placeholder="Buscar contratos..." value={search} onChange={e => onSearchChange(e.target.value)} className="pl-9 h-9" />
    </div>
    <Select value={statusFilter} onValueChange={onStatusChange}>
      <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os status</SelectItem>
        {Object.entries(contractStatusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={typeFilter} onValueChange={onTypeChange}>
      <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os tipos</SelectItem>
        {Object.entries(contractTypeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

export default ContractFilters;
