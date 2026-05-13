/**
 * Safe rehype-sanitize plugin loader.
 * Não quebra o build se rehype-sanitize não estiver instalado.
 * O Lovable instala automaticamente — este fallback é só pro preview imediato.
 */

let _rehypeSanitize: any = null;
let _loadPromise: Promise<any> | null = null;

function loadRehypeSanitize() {
  if (_rehypeSanitize) return _rehypeSanitize;
  if (_loadPromise) return _rehypeSanitize;
  _loadPromise = import("rehype-sanitize")
    .then(mod => { _rehypeSanitize = mod.default || mod; return _rehypeSanitize; })
    .catch(() => { console.warn("[Aikortex] rehype-sanitize não disponível. Execute npm install."); return null; });
  return null;
}

export function getRehypePlugins(): any[] {
  const sanitize = loadRehypeSanitize();
  return sanitize ? [sanitize] : [];
}
