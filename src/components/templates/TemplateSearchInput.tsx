import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const TemplateSearchInput = ({ value, onChange, placeholder }: Props) => {
  const [internal, setInternal] = useState(value);

  // Sync incoming external value changes (e.g. URL reset)
  useEffect(() => {
    setInternal(value);
  }, [value]);

  // Debounce outgoing changes
  useEffect(() => {
    if (internal === value) return;
    const t = setTimeout(() => onChange(internal), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internal]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <Input
        placeholder={placeholder ?? "Buscar por nome ou descrição..."}
        value={internal}
        onChange={(e) => setInternal(e.target.value)}
        className="pl-8 h-9 text-sm"
      />
    </div>
  );
};

export default TemplateSearchInput;
