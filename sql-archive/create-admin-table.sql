-- 管理者認証用テーブル作成

CREATE TABLE public.admin_users (
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

-- インデックス作成
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_admin_users_is_active ON public.admin_users(is_active);

-- RLS設定
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ポリシー作成（管理者のみアクセス可能）
CREATE POLICY "Only service role can access admin_users" ON public.admin_users
FOR ALL USING (auth.role() = 'service_role');

-- updated_atトリガー
CREATE TRIGGER trigger_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期管理者アカウント作成は手動で行ってください
-- 以下のSQLを実行前に、実際のメールアドレスとパスワードハッシュに変更してください
-- 
-- パスワードハッシュの生成方法：
-- 1. bcryptjs を使用してハッシュ化
-- 2. または https://bcrypt-generator.com/ でハッシュ生成
-- 
-- INSERT INTO public.admin_users (email, password_hash, name, role) VALUES 
-- ('your-email@example.com', 'bcrypt-hashed-password', 'あなたの名前', 'super_admin');

-- コメント
COMMENT ON TABLE public.admin_users IS '管理者認証用テーブル';
COMMENT ON COLUMN public.admin_users.password_hash IS 'bcryptでハッシュ化されたパスワード';
COMMENT ON COLUMN public.admin_users.login_attempts IS 'ログイン試行回数（セキュリティ対策）';
COMMENT ON COLUMN public.admin_users.locked_until IS 'アカウントロック期限';

-- セキュリティ確認
SELECT '管理者テーブル作成完了' as status;
SELECT email, role, is_active, created_at FROM public.admin_users;