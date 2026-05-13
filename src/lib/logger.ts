const isDev = import.meta.env.DEV;

export const logger = {
  error: (...args: any[]) => { if (isDev) console.error("[Aikortex]", ...args); },
  warn: (...args: any[]) => { if (isDev) console.warn("[Aikortex]", ...args); },
  log: (...args: any[]) => { if (isDev) console.log("[Aikortex]", ...args); },
  info: (...args: any[]) => { if (isDev) console.info("[Aikortex]", ...args); },
};
