-- Auth.usersの削除時に関連データを自動削除するトリガーを設定

-- 1. まず既存の外部キー制約を削除（存在する場合）
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;
ALTER TABLE promo_usage_history DROP CONSTRAINT IF EXISTS promo_usage_history_user_id_fkey;
ALTER TABLE code_usage_history DROP CONSTRAINT IF EXISTS code_usage_history_user_id_fkey;
ALTER TABLE canvas_shares DROP CONSTRAINT IF EXISTS canvas_shares_user_id_fkey;

-- 2. カスケード削除付きの外部キー制約を追加
-- usersテーブル
ALTER TABLE users 
ADD CONSTRAINT users_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- promo_usage_historyテーブル
ALTER TABLE promo_usage_history 
ADD CONSTRAINT promo_usage_history_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- code_usage_historyテーブル
ALTER TABLE code_usage_history 
ADD CONSTRAINT code_usage_history_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- canvas_sharesテーブル（もし存在すれば）
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'canvas_shares') THEN
        ALTER TABLE canvas_shares 
        ADD CONSTRAINT canvas_shares_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. 既に孤立しているレコードをクリーンアップ
-- auth.usersに存在しないユーザーのデータを削除

-- usersテーブルのクリーンアップ
DELETE FROM users 
WHERE auth_user_id NOT IN (SELECT id FROM auth.users);

-- promo_usage_historyのクリーンアップ
DELETE FROM promo_usage_history 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- code_usage_historyのクリーンアップ
DELETE FROM code_usage_history 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- canvas_sharesのクリーンアップ（存在する場合）
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'canvas_shares') THEN
        EXECUTE 'DELETE FROM canvas_shares WHERE user_id NOT IN (SELECT id FROM auth.users)';
    END IF;
END $$;

-- 4. 今後の削除を自動化するトリガー関数（バックアップとして）
CREATE OR REPLACE FUNCTION cleanup_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- usersテーブルから削除
    DELETE FROM users WHERE auth_user_id = OLD.id;
    
    -- その他のテーブルからも削除
    DELETE FROM promo_usage_history WHERE user_id = OLD.id;
    DELETE FROM code_usage_history WHERE user_id = OLD.id;
    
    -- canvas_sharesが存在する場合は削除
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'canvas_shares') THEN
        EXECUTE 'DELETE FROM canvas_shares WHERE user_id = $1' USING OLD.id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. トリガーの作成（既存のものがあれば置き換え）
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_user_data();

-- 確認用：現在の孤立レコード数を表示
SELECT 
    'users' as table_name,
    COUNT(*) as orphaned_records
FROM users 
WHERE auth_user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 
    'promo_usage_history',
    COUNT(*)
FROM promo_usage_history 
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 
    'code_usage_history',
    COUNT(*)
FROM code_usage_history 
WHERE user_id NOT IN (SELECT id FROM auth.users);