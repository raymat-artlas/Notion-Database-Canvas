-- 使用されていない不要なテーブルを削除

-- 1. 削除前にデータ確認（念のため）
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 2. notion_integrationsテーブル削除（使用されていない）
DROP TABLE IF EXISTS public.notion_integrations CASCADE;

-- 3. access_passwordsテーブル削除（古いシステム）
DROP TABLE IF EXISTS public.access_passwords CASCADE;

-- 4. 他の不要なテーブルも確認
-- 使用されていないテーブルがあれば同様に削除

-- 5. 削除後の確認
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- コメント: 
-- - notion統合は現在ローカルストレージベース
-- - access_passwordsは新しいaccess_codesに移行済み