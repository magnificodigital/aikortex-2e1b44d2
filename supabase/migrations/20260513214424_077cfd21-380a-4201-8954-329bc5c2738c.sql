-- Hotfix 2.5-c.1: Recria policies do bucket kb-files com referência de coluna não-ambígua

-- 1. Drop policies antigas com nomes incorretos
DROP POLICY IF EXISTS "Owners can upload their KB files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can read their KB files"   ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their KB files" ON storage.objects;

-- 2. Recria com nomes padronizados e storage.objects.name explícito
CREATE POLICY "kb_files_write_own_agent"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kb-files'
  AND EXISTS (
    SELECT 1 FROM public.user_agents ua
    WHERE ua.id::text = (storage.foldername(storage.objects.name))[1]
      AND ua.user_id = auth.uid()
  )
);

CREATE POLICY "kb_files_read_own_agent"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kb-files'
  AND EXISTS (
    SELECT 1 FROM public.user_agents ua
    WHERE ua.id::text = (storage.foldername(storage.objects.name))[1]
      AND ua.user_id = auth.uid()
  )
);

CREATE POLICY "kb_files_delete_own_agent"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kb-files'
  AND EXISTS (
    SELECT 1 FROM public.user_agents ua
    WHERE ua.id::text = (storage.foldername(storage.objects.name))[1]
      AND ua.user_id = auth.uid()
  )
);