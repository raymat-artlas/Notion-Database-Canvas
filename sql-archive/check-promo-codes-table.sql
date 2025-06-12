-- 既存のpromo_codesテーブル構造を確認

-- 1. テーブル構造確認
\d public.promo_codes;

-- 2. 既存データ確認
SELECT * FROM public.promo_codes LIMIT 5;

-- 3. カラム一覧確認
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'promo_codes'
ORDER BY ordinal_position;

-- 4. インデックス確認
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'promo_codes' AND schemaname = 'public';

-- 5. RLS設定確認
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables 
WHERE tablename = 'promo_codes' AND schemaname = 'public';

-- 6. ポリシー確認
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'promo_codes' AND schemaname = 'public';