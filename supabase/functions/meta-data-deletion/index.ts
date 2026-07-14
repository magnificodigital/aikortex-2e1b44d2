// meta-data-deletion
// ==================
// Callback de SOLICITACAO DE EXCLUSAO DE DADOS da Meta. Recebe POST com
// signed_request e DEVE responder JSON { url, confirmation_code } — a Meta
// mostra a url pro usuario acompanhar. Apontamos pra pagina de instrucoes.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const STATUS_URL = "https://agents.aikortex.com/data-deletion";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return new Response(
    JSON.stringify({ url: `${STATUS_URL}?code=${code}`, confirmation_code: code }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
