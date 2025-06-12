-- Supabase Storage: canvasesバケットの作成とRLS設定

-- 1. canvasesバケットを作成（既に存在する場合はスキップ）
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'canvases',
  'canvases',
  false,  -- プライベートバケット
  false,
  52428800,  -- 50MB制限
  ARRAY['application/json']::text[]  -- JSONファイルのみ許可
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLSポリシーを作成

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can upload their own canvas files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own canvas files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own canvas files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own canvas files" ON storage.objects;

-- アップロードポリシー: ユーザーは自分のフォルダにのみアップロード可能
CREATE POLICY "Users can upload their own canvas files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'canvases' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- 閲覧ポリシー: ユーザーは自分のファイルのみ閲覧可能
CREATE POLICY "Users can view their own canvas files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'canvases' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- 更新ポリシー: ユーザーは自分のファイルのみ更新可能
CREATE POLICY "Users can update their own canvas files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'canvases' AND
  (storage.foldername(name))[1] = auth.uid()
)
WITH CHECK (
  bucket_id = 'canvases' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- 削除ポリシー: ユーザーは自分のファイルのみ削除可能
CREATE POLICY "Users can delete their own canvas files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'canvases' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- 3. Service Roleは全てのファイルにアクセス可能（デフォルトで有効）