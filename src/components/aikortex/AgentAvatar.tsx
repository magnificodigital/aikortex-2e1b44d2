// Avatar do agente com fallback em cascata:
// 1. persona_emoji (emoji escolhido pela agência via Vibe ou edit)
// 2. avatar_url (imagem custom)
// 3. inicial do nome (fallback final)
//
// Mantém compatível com agentes existentes — sem persona_emoji e sem
// avatar_url, mostra a inicial igual ao comportamento anterior.

interface Props {
  name: string;
  emoji?: string | null;
  avatarUrl?: string | null;
  fallbackAvatar?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "w-8 h-8 text-base",
  md: "w-10 h-10 text-lg",
  lg: "w-14 h-14 text-2xl",
  xl: "w-20 h-20 text-4xl",
};

const AgentAvatar = ({ name, emoji, avatarUrl, fallbackAvatar, size = "sm", className = "" }: Props) => {
  const sizeCls = SIZES[size];
  const base = `rounded-full overflow-hidden flex items-center justify-center shrink-0 ${sizeCls} ${className}`;

  if (emoji && emoji.trim()) {
    return (
      <div className={`${base} bg-primary/10`}>
        <span className="leading-none select-none">{emoji}</span>
      </div>
    );
  }

  if (avatarUrl && avatarUrl.trim()) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${base} object-cover`}
      />
    );
  }

  if (fallbackAvatar) {
    return (
      <img
        src={fallbackAvatar}
        alt={name}
        className={`${base} object-cover`}
      />
    );
  }

  const initial = (name || "?").slice(0, 1).toUpperCase();
  return (
    <div className={`${base} bg-primary/15 text-primary font-bold`}>
      {initial}
    </div>
  );
};

export default AgentAvatar;
