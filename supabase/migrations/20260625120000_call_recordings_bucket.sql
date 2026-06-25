-- Bucket público pra hospedar gravações das ligações (user + agente mixados).
-- Estrutura: {user_id}/{call_log_id ou timestamp}.webm
-- Player de áudio em /calls dá play direto na URL pública.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings',
  'call-recordings',
  true,
  52428800, -- 50MB (limite do Free tier; calls de até ~30min em webm/opus baixo bitrate cabem)
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];

-- Leitura: público (browser baixa o áudio direto pra player)
DROP POLICY IF EXISTS "call_recordings_public_read" ON storage.objects;
CREATE POLICY "call_recordings_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'call-recordings');

-- Upload: qualquer authenticated user pode subir, MAS só no prefixo do
-- próprio user_id (primeiro segmento do path). Garante isolamento entre
-- agências sem precisar JWT custom.
DROP POLICY IF EXISTS "call_recordings_user_write" ON storage.objects;
CREATE POLICY "call_recordings_user_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'call-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: só dono (pra LGPD: cliente pode deletar gravações antigas)
DROP POLICY IF EXISTS "call_recordings_user_delete" ON storage.objects;
CREATE POLICY "call_recordings_user_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'call-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
