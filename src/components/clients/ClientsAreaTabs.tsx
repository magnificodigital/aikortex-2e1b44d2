import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Clientes", to: "/clients" },
  { label: "Propostas", to: "/proposals" },
  { label: "Contratos", to: "/contracts" },
];

const ClientsAreaTabs = () => {
  const { pathname } = useLocation();
  return (
    <div className="border-b border-border">
      <nav className="flex gap-1 -mb-px">
        {tabs.map((t) => {
          const active = pathname === t.to || (t.to === "/clients" && pathname.startsWith("/clients"));
          return (
            <NavLink
              key={t.to}
              to={t.to}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default ClientsAreaTabs;
