import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Client, CLIENT_STATUS_CONFIG } from "@/types/client";
import ClientHealthScore from "./ClientHealthScore";
import ClientProfileTabs from "./ClientProfileTabs";
import { Mail, Phone, Globe, Building2, Users as UsersIcon } from "lucide-react";

interface ClientProfileDialogProps {
  client: Client | null;
  onClose: () => void;
}

const ClientProfileDialog = ({ client, onClose }: ClientProfileDialogProps) => (
  <Dialog open={!!client} onOpenChange={() => onClose()}>
    <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-4">
          {client && (
            <>
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/15 text-primary font-bold text-lg">
                  {client.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg">{client.companyName}</p>
                  <Badge variant="outline" className={CLIENT_STATUS_CONFIG[client.status].className}>
                    {CLIENT_STATUS_CONFIG[client.status].label}
                  </Badge>
                </div>
                <p className="text-sm font-normal text-muted-foreground">{client.contactName}</p>
              </div>
              <ClientHealthScore score={client.healthScore} size="md" />
            </>
          )}
        </DialogTitle>
      </DialogHeader>

      {client && (
        <div className="space-y-5 pt-2">
          {/* Contact & Info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              { icon: Mail, value: client.email },
              { icon: Phone, value: client.phone },
              { icon: Globe, value: client.website },
              { icon: Building2, value: `${client.industry} · ${client.companySize} funcionários` },
              { icon: UsersIcon, value: `Gerente: ${client.accountManager}` },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground py-1">
                <item.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{item.value}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Cliente desde {client.since}</span>
            </div>
          </div>

          {/* Tags */}
          {client.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {client.tags.map(tag => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.label}
                </Badge>
              ))}
            </div>
          )}

          {/* Tabs */}
          <ClientProfileTabs client={client} />
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default ClientProfileDialog;
