-- 既存のpromo_codesテーブルを安全に更新

-- 不足しているカラムを追加（IF NOT EXISTS相当の処理）
DO $$ 
BEGIN
    -- trial_duration_days カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'promo_codes' AND column_name = 'trial_duration_days'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN trial_duration_days INTEGER NOT NULL DEFAULT 30;
    END IF;

    -- granted_plan カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'promo_codes' AND column_name = 'granted_plan'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN granted_plan VARCHAR(20) DEFAULT 'premium' CHECK (granted_plan IN ('free', 'premium'));
    END IF;

    -- max_uses カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'promo_codes' AND column_name = 'max_uses'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 100;
    END IF;

    -- current_uses カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'promo_codes' AND column_name = 'current_uses'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN current_uses INTEGER DEFAULT 0;
    END IF;

    -- one_time_per_user カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'promo_codes' AND column_name = 'one_time_per_user'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN one_time_per_user BOOLEAN DEFAULT true;
    END IF;

    -- expires_at カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'promo_codes' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- is_active カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'promo_codes' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- created_at カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'promo_codes' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- updated_at カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'promo_codes' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- インデックス作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON public.promo_codes(expires_at);

-- RLS有効化
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- ポリシー作成（存在しない場合のみ）
DO $$
BEGIN
    -- ユーザー向けポリシー
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'promo_codes' AND policyname = 'Users can view active promo codes'
    ) THEN
        CREATE POLICY "Users can view active promo codes" ON public.promo_codes
        FOR SELECT USING (
            is_active = true 
            AND (expires_at IS NULL OR expires_at > NOW())
        );
    END IF;

    -- 管理者向けポリシー
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'promo_codes' AND policyname = 'Admins can manage promo codes'
    ) THEN
        CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- updated_atトリガー作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_promo_codes_updated_at ON public.promo_codes;
CREATE TRIGGER trigger_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- promo_usage_historyテーブルも同様に安全に作成/更新
CREATE TABLE IF NOT EXISTS public.promo_usage_history (
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

-- promo_usage_historyのインデックス
CREATE INDEX IF NOT EXISTS idx_promo_usage_user_id ON public.promo_usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_code_id ON public.promo_usage_history(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_status ON public.promo_usage_history(status);

-- promo_usage_historyのRLS
ALTER TABLE public.promo_usage_history ENABLE ROW LEVEL SECURITY;

-- promo_usage_historyのポリシー
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'promo_usage_history' AND policyname = 'Users can view their promo usage'
    ) THEN
        CREATE POLICY "Users can view their promo usage" ON public.promo_usage_history
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'promo_usage_history' AND policyname = 'Admins can manage promo usage'
    ) THEN
        CREATE POLICY "Admins can manage promo usage" ON public.promo_usage_history
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- サンプルデータ（既存データがない場合のみ）
INSERT INTO public.promo_codes (code, description, trial_duration_days, max_uses)
SELECT 'LAUNCH2025', '正式リリース記念30日無料', 30, 1000
WHERE NOT EXISTS (SELECT 1 FROM public.promo_codes WHERE code = 'LAUNCH2025');

INSERT INTO public.promo_codes (code, description, trial_duration_days, max_uses)
SELECT 'BETA30', 'ベータ版ユーザー向け30日延長', 30, 500
WHERE NOT EXISTS (SELECT 1 FROM public.promo_codes WHERE code = 'BETA30');

-- 確認クエリ
SELECT 'プロモーションコードテーブル更新完了' as status;
SELECT COUNT(*) as promo_codes_count FROM public.promo_codes;