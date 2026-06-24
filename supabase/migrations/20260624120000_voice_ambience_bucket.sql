-- Bucket público pra hospedar áudios ambiente de fundo das chamadas (voz).
-- Substitui a dependência do Lovable Assets storage — fica tudo no Supabase
-- da própria agência. Arquivos esperados: office.mp3, callcenter.mp3, cafe.mp3
-- (1-3 min cada, loopáveis, qualquer tamanho — Supabase aceita até 50MB free).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-ambience',
  'voice-ambience',
  true,
  104857600, -- 100MB (suficiente pra ambient de 1-3 min em mp3)
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];

-- Policy: qualquer um pode LER (público pra os browsers tocarem o áudio)
DROP POLICY IF EXISTS "voice_ambience_public_read" ON storage.objects;
CREATE POLICY "voice_ambience_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'voice-ambience');

-- Policy: só admin da plataforma (platform_owner/platform_admin) pode subir
DROP POLICY IF EXISTS "voice_ambience_admin_write" ON storage.objects;
CREATE POLICY "voice_ambience_admin_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-ambience'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('platform_owner', 'platform_admin')
    )
  );

-- Policy: admin pode atualizar/deletar (caso queira trocar arquivo)
DROP POLICY IF EXISTS "voice_ambience_admin_update" ON storage.objects;
CREATE POLICY "voice_ambience_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'voice-ambience'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('platform_owner', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS "voice_ambience_admin_delete" ON storage.objects;
CREATE POLICY "voice_ambience_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-ambience'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('platform_owner', 'platform_admin')
    )
  );
