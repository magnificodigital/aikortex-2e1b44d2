
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-audio', 'call-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read call-audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'call-audio');

CREATE POLICY "Service role write call-audio" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'call-audio');
