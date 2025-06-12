-- 管理者テーブルとユーザーを作成するSQL

-- 1. 既存のupdate_updated_at_column関数を確認（なければ作成）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. admin_usersテーブルを作成
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 管理者情報
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  
  -- 権限レベル
  role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  
  -- セッション管理
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

-- 4. RLS設定
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 5. 既存のポリシーを削除して再作成
DROP POLICY IF EXISTS "Only service role can access admin_users" ON public.admin_users;
CREATE POLICY "Only service role can access admin_users" ON public.admin_users
FOR ALL USING (auth.role() = 'service_role');

-- 6. updated_atトリガー
DROP TRIGGER IF EXISTS trigger_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trigger_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 初期管理者アカウント作成
-- パスワード: admin123!
-- bcryptハッシュ: $2b$10$YQFhZ3.5Q5Q5Q5Q5Q5Q5Q.RLKJLKJLKJLKJLKJLKJLKJLKJLKJLKj

-- 既存の管理者を削除（テスト環境用）
DELETE FROM public.admin_users WHERE email = 'admin@example.com';

-- 新しい管理者を挿入
-- 注意: 実際の運用環境では、以下のパスワードハッシュを変更してください
-- パスワード「admin123!」のbcryptハッシュ
INSERT INTO public.admin_users (email, password_hash, name, role, is_active) VALUES 
('admin@example.com', '$2b$10$dqrj3fyLLjlm88yfmIobt.0ZtlvBiEOOKnwbwJHm229zUEf67B7M6', '管理者', 'super_admin', true);

-- 8. 確認
SELECT 
  id,
  email,
  name,
  role,
  is_active,
  created_at
FROM public.admin_users;

-- コメント
COMMENT ON TABLE public.admin_users IS '管理者認証用テーブル';
COMMENT ON COLUMN public.admin_users.password_hash IS 'bcryptでハッシュ化されたパスワード';
COMMENT ON COLUMN public.admin_users.login_attempts IS 'ログイン試行回数（セキュリティ対策）';
COMMENT ON COLUMN public.admin_users.locked_until IS 'アカウントロック期限';

-- 実行結果の確認
SELECT '管理者テーブルとアカウントの作成が完了しました' as status;
SELECT '管理者ログイン情報:' as info;
SELECT 'メールアドレス: admin@example.com' as email;
SELECT 'パスワード: admin123!' as password;
SELECT '※本番環境では必ずパスワードを変更してください' as warning;