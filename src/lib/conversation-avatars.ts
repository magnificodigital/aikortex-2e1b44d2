// Avatar por conversa/contato armazenado como data URL no localStorage.
// Frontend-only: permite trocar a foto do contato no inbox sem depender
// de storage do backend.
const KEY = (id: string) => `conv-avatar:${id}`;
const EVT = "conv-avatar:changed";

export function getConversationAvatar(id?: string | null): string | null {
  if (!id || typeof window === "undefined") return null;
  try { return localStorage.getItem(KEY(id)); } catch { return null; }
}

export function setConversationAvatar(id: string, dataUrl: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (dataUrl) localStorage.setItem(KEY(id), dataUrl);
    else localStorage.removeItem(KEY(id));
    window.dispatchEvent(new CustomEvent(EVT, { detail: { id } }));
  } catch {}
}

export function subscribeAvatar(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
