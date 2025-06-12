-- Supabase auth.usersと連携する現代的なusersテーブル作成

CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- auth.usersテーブルとの関連
  auth_user_id UUID NOT NULL UNIQUE, -- auth.users.id
  email VARCHAR(255) NOT NULL,
  
  -- プラン情報
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  effective_plan VARCHAR(20) DEFAULT 'free' CHECK (effective_plan IN ('free', 'premium')),
  
  -- トライアル情報
  trial_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- 使用統計
  canvas_count INTEGER DEFAULT 0,
  export_count INTEGER DEFAULT 0,
  export_reset_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
  
  -- アクセスコード関連
  is_test_user BOOLEAN DEFAULT false,
  access_code_used VARCHAR(50),
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_plan ON public.users(plan);
CREATE INDEX idx_users_effective_plan ON public.users(effective_plan);
CREATE INDEX idx_users_trial_expires_at ON public.users(trial_expires_at);
CREATE INDEX idx_users_is_test_user ON public.users(is_test_user);

-- updated_at自動更新トリガー（関数が存在しない場合は作成）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS設定
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ポリシー作成
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Service role can manage all users" ON public.users
FOR ALL USING (auth.role() = 'service_role');

-- 管理者用ポリシー（必要に応じて）
CREATE POLICY "Admins can manage all users" ON public.users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = 'admin@example.com'  -- 管理者メールアドレスに変更
  )
);

-- コメント
COMMENT ON TABLE public.users IS 'ユーザー情報とプラン管理';
COMMENT ON COLUMN public.users.auth_user_id IS 'auth.users.idとの外部キー';
COMMENT ON COLUMN public.users.effective_plan IS '現在有効なプラン（トライアル考慮）';
COMMENT ON COLUMN public.users.trial_expires_at IS 'トライアル期限';
COMMENT ON COLUMN public.users.is_test_user IS 'テストユーザーフラグ';