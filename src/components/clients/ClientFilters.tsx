import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface ClientFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  industry: string;
  onIndustryChange: (v: string) => void;
  manager: string;
  onManagerChange: (v: string) => void;
}

const ClientFilters = ({
  search, onSearchChange,
  status, onStatusChange,
  industry, onIndustryChange,
  manager, onManagerChange,
}: ClientFiltersProps) => (
  <div className="flex flex-col sm:flex-row gap-3">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder="Buscar empresa, contato ou email..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-9"
      />
    </div>
    <Select value={status} onValueChange={onStatusChange}>
      <SelectTrigger className="w-full sm:w-36">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="active">Ativos</SelectItem>
        <SelectItem value="onboarding">Onboarding</SelectItem>
        <SelectItem value="inactive">Inativos</SelectItem>
      </SelectContent>
    </Select>
    <Select value={industry} onValueChange={onIndustryChange}>
      <SelectTrigger className="w-full sm:w-36">
        <SelectValue placeholder="Indústria" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas</SelectItem>
        <SelectItem value="Tecnologia">Tecnologia</SelectItem>
        <SelectItem value="Vendas">Vendas</SelectItem>
        <SelectItem value="Saúde">Saúde</SelectItem>
        <SelectItem value="Finanças">Finanças</SelectItem>
        <SelectItem value="Educação">Educação</SelectItem>
        <SelectItem value="Varejo">Varejo</SelectItem>
        <SelectItem value="Logística">Logística</SelectItem>
        <SelectItem value="Analytics">Analytics</SelectItem>
      </SelectContent>
    </Select>
    <Select value={manager} onValueChange={onManagerChange}>
      <SelectTrigger className="w-full sm:w-40">
        <SelectValue placeholder="Gerente" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="Maria Silva">Maria Silva</SelectItem>
        <SelectItem value="João Costa">João Costa</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export default ClientFilters;
