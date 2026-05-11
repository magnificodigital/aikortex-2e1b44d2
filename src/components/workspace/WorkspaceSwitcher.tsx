import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Building2, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useActiveClient } from "@/hooks/use-active-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function colorFor(id: string) {
  // deterministic hue from id
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 45%)`;
}

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { clients, activeClientName, isAgencyMode, activeClient, setActiveClientId } =
    useActiveClient();
  const { agencyName } = useWorkspace();

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.client_name.localeCompare(b.client_name, "pt-BR")),
    [clients]
  );

  const handleSelect = (id: string | null, name: string) => {
    setActiveClientId(id);
    setOpen(false);
    if (id === null) {
      toast.success("Você voltou para Meu Workspace");
    } else {
      toast.success(`Você entrou no workspace de ${name}`);
    }
  };

  const handleCreate = () => {
    setOpen(false);
    navigate("/clients");
  };

  const hasNoClients = clients.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 max-w-[260px] gap-2 px-2.5"
        >
          {isAgencyMode ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          ) : (
            <Avatar className="h-6 w-6">
              {activeClient?.client_email && (
                <AvatarImage src={undefined} alt={activeClientName} />
              )}
              <AvatarFallback
                className="text-[10px] font-semibold text-white"
                style={{ backgroundColor: activeClient ? colorFor(activeClient.id) : undefined }}
              >
                {initials(activeClientName)}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="truncate text-sm font-medium">
            {isAgencyMode ? "Meu Workspace" : activeClientName}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        {hasNoClients ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Sem clientes ainda</p>
              <p className="text-xs text-muted-foreground">
                Crie seu primeiro cliente para organizar os workspaces.
              </p>
            </div>
            <Button size="sm" onClick={handleCreate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Criar cliente
            </Button>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandList>
              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
              <CommandGroup heading={agencyName}>
                <CommandItem
                  value="__all__"
                  onSelect={() => handleSelect(null, "Meu Workspace")}
                  className="gap-2"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex-1">Todos os clientes</span>
                  <Check
                    className={cn("h-4 w-4", isAgencyMode ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Clientes">
                {sortedClients.map((c) => {
                  const selected = activeClient?.id === c.id;
                  return (
                    <CommandItem
                      key={c.id}
                      value={c.client_name}
                      onSelect={() => handleSelect(c.id, c.client_name)}
                      className="gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className="text-[10px] font-semibold text-white"
                          style={{ backgroundColor: colorFor(c.id) }}
                        >
                          {initials(c.client_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{c.client_name}</span>
                      <Check
                        className={cn("h-4 w-4", selected ? "opacity-100" : "opacity-0")}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={handleCreate} className="gap-2 text-primary">
                  <Plus className="h-4 w-4" />
                  Criar novo cliente
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default WorkspaceSwitcher;
