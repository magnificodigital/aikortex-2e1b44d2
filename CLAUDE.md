# Aikortex — MASTER v7.4

## Caminhos oficiais (NUNCA usar outros)
- **Repo:** github.com/magnificodigital/aikortex-2e1b44d2 | local: `/Users/macbookair/aikortex-2e1b44d2`
- **Supabase:** `jcahtniqqiaefszhgpqx.supabase.co` | project-ref: `jcahtniqqiaefszhgpqx`
- **App:** https://agents.aikortex.com
- **DeerFlow:** github.com/magnificodigital/aikortex-flow (Railway)
- `aikortex-01` e `aikortex-v3` são repos antigos — **nunca trabalhar neles**

## Deploy
- **Frontend:** `git push origin main` → **Vercel** reconstrói (~1-2 min) → hard refresh (Cmd+Shift+R). App Vercel: `aikortex.vercel.app` (migrando do Lovable; DNS `agents.aikortex.com` a virar). Sem `package-lock.json` (Vercel faz fresh install). Sem deps do Lovable.
- **Edge functions:** `supabase functions deploy <nome> --project-ref jcahtniqqiaefszhgpqx`
- **Migrations:** aplicar via **Supabase SQL Editor** (o Lovable aplicava automático; agora é manual — `supabase db push` diverge do histórico do Lovable).

## Constraints permanentes
- `HTTP-Referer` sempre: `https://agents.aikortex.com`
- Streaming: sempre `TransformStream + pipeTo` + `X-Accel-Buffering: no`
- Nunca Lovable Gateway — sempre OpenRouter
- Templates ativos no lançamento: apenas `sac-1` e `sdr-1`
- Nunca `git push --force` no `main`
- Nunca misturar com Sancet
