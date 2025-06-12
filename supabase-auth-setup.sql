-- Supabase認証 + アクセスコードシステム セットアップ
-- 実行順序に注意して一つずつ実行してください

-- ========================================
-- 1. access_codes テーブル作成
-- ========================================
CREATE TABLE public.access_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- コード情報
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- 特典内容
  granted_plan VARCHAR(20) DEFAULT 'premium' CHECK (granted_plan IN ('free', 'premium')),
  trial_duration_days INTEGER, -- NULL = 永久
  
  -- 使用制限
  max_uses INTEGER, -- NULL = 無制限
  current_uses INTEGER DEFAULT 0,
  one_time_per_user BOOLEAN DEFAULT true,
  
  -- 対象ユーザー
  user_type VARCHAR(20) DEFAULT 'all' CHECK (user_type IN ('new_only', 'existing_only', 'all')),
  
  -- 有効期間
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  
  -- ステータス
  is_active BOOLEAN DEFAULT true,
  
  -- メタデータ
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_access_codes_code ON public.access_codes(code);
CREATE INDEX idx_access_codes_active ON public.access_codes(is_active);

-- ========================================
-- 2. code_usage_history テーブル作成
-- ========================================
CREATE TABLE public.code_usage_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- リレーション
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id UUID REFERENCES public.access_codes(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL, -- コード削除されても履歴は残す
  
  -- 適用内容
  granted_plan VARCHAR(20) NOT NULL,
  trial_duration_days INTEGER,
  
  -- タイムスタンプ
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- ステータス
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  
  -- インデックス用
  UNIQUE(user_id, code_id) -- ユーザーごと同じコードは1回のみ
);

-- インデックス作成
CREATE INDEX idx_code_usage_user_id ON public.code_usage_history(user_id);
CREATE INDEX idx_code_usage_status ON public.code_usage_history(status);

-- ========================================
-- 3. 既存 users テーブル拡張
-- ========================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) UNIQUE,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS active_trial_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS signup_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS effective_plan VARCHAR(20) DEFAULT 'free' CHECK (effective_plan IN ('free', 'premium')),
ADD COLUMN IF NOT EXISTS plan_source VARCHAR(20) DEFAULT 'default' CHECK (plan_source IN ('default', 'trial_code', 'stripe'));

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_effective_plan ON public.users(effective_plan);

-- ========================================
-- 4. RLS (Row Level Security) 設定
-- ========================================

-- access_codes のRLS
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- 一般ユーザーは有効なコードのみ参照可能
CREATE POLICY "Users can view active codes" ON public.access_codes
  FOR SELECT TO authenticated
  USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- 管理者のみ全操作可能（raymatユーザーを管理者として設定）
CREATE POLICY "Admins can manage codes" ON public.access_codes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() AND user_id = 'raymat'
  ));

-- code_usage_history のRLS
ALTER TABLE public.code_usage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage history" ON public.code_usage_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own usage" ON public.code_usage_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 管理者は全履歴参照可能
CREATE POLICY "Admins can view all usage history" ON public.code_usage_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() AND user_id = 'raymat'
  ));

-- ========================================
-- 5. 便利なView作成
-- ========================================
CREATE OR REPLACE VIEW user_effective_plans AS
SELECT 
  u.auth_user_id,
  u.user_id,
  u.email,
  CASE 
    WHEN u.trial_expires_at > NOW() THEN 'premium'
    ELSE 'free'
  END as current_plan,
  CASE 
    WHEN u.trial_expires_at > NOW() THEN 'trial_code'
    ELSE 'default'
  END as plan_source,
  u.trial_expires_at,
  u.active_trial_code,
  u.plan as original_plan,
  CASE 
    WHEN u.trial_expires_at > NOW() THEN 
      EXTRACT(DAYS FROM (u.trial_expires_at - NOW()))::INTEGER
    ELSE 0
  END as remaining_trial_days
FROM public.users u
WHERE u.auth_user_id IS NOT NULL;

-- ========================================
-- 6. トリガー関数（自動更新）
-- ========================================
CREATE OR REPLACE FUNCTION update_user_effective_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- trial_expires_atが変更された時、effective_planを自動更新
  IF NEW.trial_expires_at IS DISTINCT FROM OLD.trial_expires_at THEN
    NEW.effective_plan := CASE 
      WHEN NEW.trial_expires_at > NOW() THEN 'premium'
      ELSE 'free'
    END;
    NEW.plan_source := CASE 
      WHEN NEW.trial_expires_at > NOW() THEN 'trial_code'
      ELSE 'default'
    END;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_effective_plan
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_effective_plan();

-- ========================================
-- 7. updated_at自動更新トリガー
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_access_codes_updated_at
  BEFORE UPDATE ON public.access_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 8. テストデータ挿入（任意）
-- ========================================
INSERT INTO public.access_codes (code, name, description, granted_plan, trial_duration_days, max_uses, user_type) VALUES
('TEST30', 'テスト用30日体験', '開発・テスト用の30日間プレミアム体験コード', 'premium', 30, 100, 'all'),
('YOUTUBE60', 'YouTube視聴者限定', 'YouTube動画視聴者向けの60日間特別体験', 'premium', 60, 50, 'new_only'),
('BETA2024', 'ベータテスター招待', 'ベータテスター向けアクセスコード', 'premium', NULL, 20, 'all'),
('COMEBACK14', '復帰ユーザー特典', '既存ユーザー向け復帰キャンペーン', 'premium', 14, NULL, 'existing_only');

-- ========================================
-- 完了メッセージ
-- ========================================
-- すべてのテーブルとRLSポリシーが作成されました
-- 次のステップ：
-- 1. Supabase Authを有効化
-- 2. Emailプロバイダー設定
-- 3. アプリケーションコードでの認証実装