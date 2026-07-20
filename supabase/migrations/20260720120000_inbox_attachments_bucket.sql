-- Bucket público pra anexos do inbox (imagem/documento enviados pelo atendente).
-- Precisa ser público: a Meta (WhatsApp/IG/FB) baixa a mídia pela URL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inbox-attachments',
  'inbox-attachments',
  true,
  16777216, -- 16 MB (limite prático do WhatsApp pra documentos)
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Leitura pública (a URL do anexo é buscada pela Meta e vista no chat).
create policy "inbox_attachments_public_read"
  on storage.objects for select
  using (bucket_id = 'inbox-attachments');

-- Só usuário autenticado sobe arquivo, dentro da própria pasta (uid/...).
create policy "inbox_attachments_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'inbox-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
