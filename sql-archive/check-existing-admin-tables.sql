-- 既存の管理者関連テーブルを確認

-- 1. 全テーブル一覧
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%admin%'
ORDER BY table_name;

-- 2. admin_usersテーブルがあるかチェック
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'admin_users'
) as admin_users_exists;

-- 3. admin_settingsテーブルがあるかチェック
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'admin_settings'
) as admin_settings_exists;

-- 4. admin_usersテーブルがある場合の構造確認
\d public.admin_users

-- 5. admin_settingsテーブルがある場合の構造確認
\d public.admin_settings

-- 6. 既存データ確認
SELECT * FROM public.admin_users LIMIT 5;
SELECT * FROM public.admin_settings LIMIT 5;