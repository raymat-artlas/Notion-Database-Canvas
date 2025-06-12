-- プロモーションコード専用テーブル作成

CREATE TABLE public.promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- コード情報
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  
  -- 特典内容
  trial_duration_days INTEGER NOT NULL DEFAULT 30,
  granted_plan VARCHAR(20) DEFAULT 'premium' CHECK (granted_plan IN ('free', 'premium')),
  
  -- 使用制限
  max_uses INTEGER NOT NULL DEFAULT 100,
  current_uses INTEGER DEFAULT 0,
  one_time_per_user BOOLEAN DEFAULT true,
  
  -- 有効期限
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- ステータス
  is_active BOOLEAN DEFAULT true,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- プロモーションコード使用履歴テーブル
CREATE TABLE public.promo_usage_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- リレーション
  user_id UUID NOT NULL, -- auth.users.id
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  
  -- 付与内容
  granted_plan VARCHAR(20),
  trial_duration_days INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- 使用状況
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_promo_codes_active ON public.promo_codes(is_active);
CREATE INDEX idx_promo_codes_expires_at ON public.promo_codes(expires_at);

CREATE INDEX idx_promo_usage_user_id ON public.promo_usage_history(user_id);
CREATE INDEX idx_promo_usage_code_id ON public.promo_usage_history(promo_code_id);
CREATE INDEX idx_promo_usage_status ON public.promo_usage_history(status);

-- RLS設定
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_usage_history ENABLE ROW LEVEL SECURITY;

-- ポリシー作成
CREATE POLICY "Users can view active promo codes" ON public.promo_codes
FOR SELECT USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW())
);

CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their promo usage" ON public.promo_usage_history
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage promo usage" ON public.promo_usage_history
FOR ALL USING (auth.role() = 'service_role');

-- updated_atトリガー
CREATE TRIGGER trigger_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE public.promo_codes IS 'プロモーションコード（大量配布用、体験期間付与）';
COMMENT ON TABLE public.promo_usage_history IS 'プロモーションコード使用履歴';

-- サンプルデータ
INSERT INTO public.promo_codes (code, description, trial_duration_days, max_uses) VALUES
('LAUNCH2025', '正式リリース記念30日無料', 30, 1000),
('BETA30', 'ベータ版ユーザー向け30日延長', 30, 500);