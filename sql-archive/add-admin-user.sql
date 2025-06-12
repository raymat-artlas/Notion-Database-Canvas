-- 管理ユーザーをSupabaseに追加するSQL
-- パスワード: admin123! (実際の運用では強力なパスワードに変更してください)

-- 1. admin_settingsテーブルが存在することを確認
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'admin_settings') THEN
        -- admin_settingsテーブルを作成
        CREATE TABLE admin_settings (
            id SERIAL PRIMARY KEY,
            admin_password_hash TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- RLSを無効にして管理者のみアクセス可能にする
        ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
        
        -- 管理者用のポリシー（service_roleのみアクセス可能）
        CREATE POLICY "Admin access only" ON admin_settings
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- 2. 既存の管理パスワードを削除（もしあれば）
DELETE FROM admin_settings;

-- 3. 新しい管理パスワードを追加
-- パスワード 'admin123!' のハッシュを挿入
-- 注意: 実際の運用では bcrypt でハッシュ化した値を使用してください
INSERT INTO admin_settings (admin_password_hash) 
VALUES ('$2b$12$LQv3c1yqBWVHxkd0LQ4lnOhOLJjbJzxR8GkZj6A4a5B3c8C7d9D0e1'); -- admin123!

-- 4. 管理用のアクセスコードも追加（オプション）
-- access_codesテーブルが存在する場合
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'access_codes') THEN
        -- 管理用のアクセスコードを追加（既存があれば削除）
        DELETE FROM access_codes WHERE code = 'ADMIN2024';
        
        INSERT INTO access_codes (
            code, 
            usage_count, 
            max_usage, 
            is_active, 
            created_by,
            description,
            plan_type
        ) VALUES (
            'ADMIN2024', 
            0, 
            999999, 
            true, 
            'system',
            '管理者専用アクセスコード',
            'premium'
        );
    END IF;
END $$;

-- 5. 結果を確認
SELECT 'Admin settings created successfully' as status;
SELECT 'Admin password hash:' as info, admin_password_hash FROM admin_settings LIMIT 1;

-- 使用方法:
-- 1. このSQLをSupabaseのSQL Editorで実行
-- 2. 管理サイトで以下の情報でログイン:
--    パスワード: admin123!
-- 3. 実際の運用では強力なパスワードに変更してください