-- Supabase Storage でキャンバス保存用のバケット作成

-- canvasesバケットを作成
INSERT INTO storage.buckets (id, name, public) 
VALUES ('canvases', 'canvases', false);

-- RLS（Row Level Security）ポリシーを設定
-- ユーザーは自分のフォルダのみアクセス可能

-- アップロード（作成・更新）権限
CREATE POLICY "Users can upload to their own folder" ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'canvases' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ダウンロード（読み取り）権限  
CREATE POLICY "Users can view their own files" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'canvases' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 更新権限
CREATE POLICY "Users can update their own files" ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'canvases' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 削除権限
CREATE POLICY "Users can delete their own files" ON storage.objects 
FOR DELETE 
USING (bucket_id = 'canvases' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 注意: 現在のアプリはSupabase Authを使用していないため、
-- 実際のRLSは無効化されているかもしれません。
-- その場合はSupabaseダッシュボードでバケットのみ作成してください。