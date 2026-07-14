// meta-deauth
// ===========
// Callback de DESAUTORIZACAO da Meta: chamado quando um usuario remove o
// app Aikortex das integracoes dele. Recebe POST com signed_request.
// Respondemos 200 (nao ha token especifico pra revogar aqui — os tokens
// ficam por conta/pagina; a limpeza definitiva e' via /data-deletion).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  // Meta faz POST; qualquer 200 confirma o recebimento.
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
