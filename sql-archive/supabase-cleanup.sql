-- Supabase構造の整理・最適化スクリプト
-- このスクリプトを実行してSupabaseの構造を簡素化します

-- 1. 未使用テーブルの削除
-- canvasesテーブルは使用されていないため削除
DROP TABLE IF EXISTS public.canvases;

-- 2. 既存のusersテーブルの最適化
-- 不要なカラムが存在する場合は削除
-- ALTER TABLE users DROP COLUMN IF EXISTS unnecessary_column;

-- 3. access_passwordsテーブルの最適化
-- Notion設定のカラムが不足している場合は追加
ALTER TABLE access_passwords 
ADD COLUMN IF NOT EXISTS notion_api_key TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_name TEXT;

-- 4. インデックスの追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_access_passwords_user_id ON access_passwords(user_id);
CREATE INDEX IF NOT EXISTS idx_access_passwords_active ON access_passwords(is_active);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- 5. RLSポリシーの確認・修正
-- access_passwordsテーブル
DROP POLICY IF EXISTS "Users can view own passwords" ON access_passwords;
CREATE POLICY "Users can view own passwords" ON access_passwords
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can update own passwords" ON access_passwords;
CREATE POLICY "Users can update own passwords" ON access_passwords
    FOR UPDATE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- usersテーブル
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- 6. Storageバケットの確認
-- canvas-dataバケットが存在しない場合は作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('canvas-data', 'canvas-data', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage RLSポリシーの設定
DROP POLICY IF EXISTS "Users can manage own canvas files" ON storage.objects;
CREATE POLICY "Users can manage own canvas files" ON storage.objects
    FOR ALL USING (
        bucket_id = 'canvas-data' AND 
        (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'service_role')
    );

-- 8. コメントの追加（ドキュメント化）
COMMENT ON TABLE access_passwords IS 'ユーザー認証とNotionインテグレーション設定';
COMMENT ON TABLE users IS 'ユーザープランと使用量トラッキング';
COMMENT ON TABLE access_codes IS '新規ユーザー登録用のアクセスコード';
COMMENT ON TABLE code_usage_history IS 'アクセスコード使用履歴';

COMMENT ON COLUMN access_passwords.notion_api_key IS 'NotionのAPIキー（暗号化推奨）';
COMMENT ON COLUMN access_passwords.notion_workspace_name IS 'Notionワークスペース名';
COMMENT ON COLUMN users.plan IS 'ユーザープラン: free | premium';
COMMENT ON COLUMN users.canvas_count IS 'キャンバス作成数';
COMMENT ON COLUMN users.export_count IS 'エクスポート回数';

-- 9. 統計用のビューを作成
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    ap.user_id,
    ap.label,
    ap.created_at as registered_at,
    ap.usage_count as login_count,
    u.plan,
    u.canvas_count,
    u.export_count,
    CASE 
        WHEN ap.notion_api_key IS NOT NULL THEN true 
        ELSE false 
    END as has_notion_integration
FROM access_passwords ap
LEFT JOIN users u ON ap.user_id = u.user_id
WHERE ap.is_active = true;

-- 10. 管理者用の集計ビュー
CREATE OR REPLACE VIEW admin_dashboard AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN u.plan = 'premium' THEN 1 END) as premium_users,
    COUNT(CASE WHEN u.plan = 'free' THEN 1 END) as free_users,
    SUM(u.canvas_count) as total_canvases,
    SUM(u.export_count) as total_exports,
    COUNT(CASE WHEN ap.notion_api_key IS NOT NULL THEN 1 END) as users_with_notion
FROM access_passwords ap
LEFT JOIN users u ON ap.user_id = u.user_id
WHERE ap.is_active = true;

-- 実行後の確認用クエリ
-- SELECT * FROM user_stats;
-- SELECT * FROM admin_dashboard;