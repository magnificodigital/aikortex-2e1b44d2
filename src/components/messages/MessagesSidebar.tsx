/**
 * MessagesSidebar — navegacao interna do inbox (clone Chatwoot):
 * Conversas (Todas/Nao atendidas) · Canais · Etiquetas.
 *
 * REESCRITO: a versao anterior era mockup com contadores/pastas/times
 * hardcoded e sem efeito. Agora tudo aqui e' filtro REAL sobre a lista:
 * canal e etiqueta filtram; "Nao atendidas" = conversas com unread.
 * Canais sem integracao aparecem "em breve" (nao clicaveis).
 */
import { MessageSquare, Inbox, BellDot, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InboxFilter {
  view: "all" | "unattended";
  channel: string | null; // null = todos
  tag: string | null;
}

interface MessagesSidebarProps {
  filter: InboxFilter;
  onFilterChange: (f: InboxFilter) => void;
  /** Etiquetas agregadas de todas as conversas (reais). */
  tags: string[];
  counts: { all: number; unattended: number };
}

const CHANNELS: { key: string; label: string; dot: string; soon?: boolean }[] = [
  { key: "whatsapp",  label: "WhatsApp Business", dot: "bg-emerald-500" },
  { key: "instagram", label: "Instagram",         dot: "bg-pink-500", soon: true },
  { key: "email",     label: "E-mail",            dot: "bg-blue-500", soon: true },
];

const MessagesSidebar = ({ filter, onFilterChange, tags, counts }: MessagesSidebarProps) => {
  const item = (active: boolean) => cn(
    "w-full flex items-center gap-2 px-2.5 h-8 rounded-md text-xs transition-colors text-left",
    active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
  );

  return (
    <div className="w-[210px] min-w-[190px] border-r border-border bg-card/50 flex flex-col h-full">
      <div className="h-14 shrink-0 px-4 flex items-center border-b border-border">
        <MessageSquare className="w-4 h-4 text-primary mr-2" />
        <h2 className="text-sm font-semibold">Mensagens</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Conversas */}
        <div>
          <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conversas</p>
          <button
            className={item(filter.view === "all" && !filter.channel && !filter.tag)}
            onClick={() => onFilterChange({ view: "all", channel: null, tag: null })}
          >
            <Inbox className="w-3.5 h-3.5" /> Todas
            <span className="ml-auto text-[10px] text-muted-foreground">{counts.all}</span>
          </button>
          <button
            className={item(filter.view === "unattended")}
            onClick={() => onFilterChange({ view: "unattended", channel: null, tag: null })}
          >
            <BellDot className="w-3.5 h-3.5" /> Não atendidas
            <span className="ml-auto text-[10px] text-muted-foreground">{counts.unattended}</span>
          </button>
        </div>

        {/* Canais */}
        <div>
          <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Canais</p>
          {CHANNELS.map((c) => c.soon ? (
            <div key={c.key} className="flex items-center gap-2 px-2.5 h-8 text-xs text-muted-foreground/50 select-none">
              <span className={cn("w-2 h-2 rounded-full opacity-40", c.dot)} />
              {c.label}
              <span className="ml-auto text-[9px] uppercase border border-border rounded px-1">em breve</span>
            </div>
          ) : (
            <button
              key={c.key}
              className={item(filter.channel === c.key)}
              onClick={() => onFilterChange({ ...filter, view: "all", channel: filter.channel === c.key ? null : c.key, tag: null })}
            >
              <span className={cn("w-2 h-2 rounded-full", c.dot)} />
              {c.label}
            </button>
          ))}
        </div>

        {/* Etiquetas (reais, agregadas) */}
        <div>
          <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Etiquetas</p>
          {tags.length === 0 ? (
            <p className="px-2.5 text-[11px] text-muted-foreground/60">
              Crie etiquetas na conversa — elas viram filtros aqui.
            </p>
          ) : tags.map((t) => (
            <button
              key={t}
              className={item(filter.tag === t)}
              onClick={() => onFilterChange({ ...filter, view: "all", tag: filter.tag === t ? null : t, channel: null })}
            >
              <Tag className="w-3 h-3" /> {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessagesSidebar;
