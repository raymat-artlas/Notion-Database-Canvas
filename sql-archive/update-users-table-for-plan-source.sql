-- usersテーブルにplan_source関連カラムを追加

-- 1. 必要なカラムを追加
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS effective_plan TEXT DEFAULT 'free' CHECK (effective_plan IN ('free', 'premium')),
ADD COLUMN IF NOT EXISTS plan_source TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS active_trial_code TEXT;

-- 2. 既存のuser_idカラムがある場合の処理
DO $$
BEGIN
    -- user_idをauth_user_idに移行
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'auth_user_id') THEN
        
        -- UUIDに変換可能かチェックして移行
        UPDATE public.users 
        SET auth_user_id = user_id::UUID
        WHERE user_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
        
        -- 古いuser_idカラムを削除
        ALTER TABLE public.users DROP COLUMN user_id;
    END IF;
END $$;

-- 3. インデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_plan_source ON public.users(plan_source);
CREATE INDEX IF NOT EXISTS idx_users_effective_plan ON public.users(effective_plan);

-- 4. コメント追加
COMMENT ON COLUMN public.users.auth_user_id IS 'Supabase auth.usersのUUID';
COMMENT ON COLUMN public.users.plan_source IS 'プランの取得方法: default, access_code, stripe, auto_trial等';
COMMENT ON COLUMN public.users.effective_plan IS '実際に適用されているプラン（planより優先）';
COMMENT ON COLUMN public.users.trial_expires_at IS '体験版の期限';
COMMENT ON COLUMN public.users.active_trial_code IS '現在有効な体験コード';

-- 5. 既存データの初期値設定
UPDATE public.users 
SET 
    effective_plan = COALESCE(effective_plan, plan, 'free'),
    plan_source = COALESCE(plan_source, 'default')
WHERE effective_plan IS NULL OR plan_source IS NULL;