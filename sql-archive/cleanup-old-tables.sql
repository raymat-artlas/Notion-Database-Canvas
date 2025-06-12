-- 不要な古いテーブルを削除

-- 1. access_passwordsテーブルを削除（バックアップ後）
-- まずデータ確認
-- SELECT * FROM public.access_passwords;

-- データが不要であることを確認してから削除
DROP TABLE IF EXISTS public.access_passwords CASCADE;

-- 2. 関連するAPIファイルも削除対象
-- src/app/api/passwords/ ディレクトリも削除可能

-- 3. 他の不要なテーブルがあれば確認
-- \dt public.*