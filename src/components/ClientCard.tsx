interface ClientCardProps {
  name: string;
  company: string;
  activeProjects: number;
  avatarInitials: string;
}

const ClientCard = ({ name, company, activeProjects, avatarInitials }: ClientCardProps) => {
  return (
    <div className="glass-card rounded-lg p-4 flex items-center gap-3 hover:border-primary/30 transition-colors cursor-pointer">
      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
        {avatarInitials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{company}</p>
      </div>
      <span className="text-xs text-muted-foreground">{activeProjects} projeto{activeProjects !== 1 ? "s" : ""}</span>
    </div>
  );
};

export default ClientCard;
