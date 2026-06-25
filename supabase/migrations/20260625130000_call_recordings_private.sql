-- Fecha bucket call-recordings: deixa de ser público.
-- Leitura passa a ser via signed URL (gerada server-side por dono do arquivo).
-- Antes: qualquer um com a URL ouvia a ligação. Agora: só o user dono.

UPDATE storage.buckets
SET public = false
WHERE id = 'call-recordings';

DROP POLICY IF EXISTS "call_recordings_public_read" ON storage.objects;

-- Leitura: só authenticated dono do prefixo (mesmo padrão de write/delete).
-- Front gera signed URL com supabase.storage.createSignedUrl() quando precisa
-- tocar o áudio; quem não tem JWT do dono não consegue assinar.
DROP POLICY IF EXISTS "call_recordings_user_read" ON storage.objects;
CREATE POLICY "call_recordings_user_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'call-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
