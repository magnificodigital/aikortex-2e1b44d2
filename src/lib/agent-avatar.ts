// Helper pra estilo do avatar:
// - Ícone Aikortex (logo geométrico) → object-contain + padding pra não cortar
// - Foto humana / upload do user → object-cover (preenche o círculo)

export function isAikortexIcon(url?: string | null): boolean {
  if (!url) return false;
  return url.includes("aikortex-icon");
}

/**
 * Retorna className apropriado pra <img> de avatar dependendo da fonte.
 * Use com w-X h-X rounded-full no container externo.
 */
export function avatarImgClass(url?: string | null, extra = ""): string {
  if (isAikortexIcon(url)) {
    // Ícone fica ~70% do círculo, contido, padding visual via scale
    return `w-full h-full object-contain p-[18%] bg-gradient-to-br from-primary/15 to-primary/5 ${extra}`.trim();
  }
  return `w-full h-full object-cover ${extra}`.trim();
}
