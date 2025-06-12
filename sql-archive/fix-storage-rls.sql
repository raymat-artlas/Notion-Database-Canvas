-- Supabase Storage RLSを無効化（開発用）

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- canvasesバケット用の開発用ポリシーを作成（全員アクセス可能）
CREATE POLICY "Allow all access to canvases bucket" ON storage.objects 
FOR ALL 
USING (bucket_id = 'canvases');

-- または、よりシンプルに全てのRLSを無効化
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;