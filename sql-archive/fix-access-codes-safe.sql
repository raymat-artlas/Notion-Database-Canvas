-- 安全なアクセスコードテーブル修正

-- 1. 現在のテーブル構造を確認
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'access_codes' 
-- ORDER BY ordinal_position;

-- 2. expires_atカラムが存在しない場合のみ追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'access_codes' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.access_codes ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. 既存データを個人専用コード仕様に更新（安全に）
UPDATE public.access_codes 
SET 
    max_uses = CASE WHEN max_uses IS NULL OR max_uses > 10 THEN 1 ELSE max_uses END,
    one_time_per_user = false,
    trial_duration_days = CASE WHEN trial_duration_days IS NULL THEN 0 ELSE trial_duration_days END
WHERE is_active = true;

-- 4. インデックス追加（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_access_codes_code_active ON public.access_codes(code, is_active);
CREATE INDEX IF NOT EXISTS idx_access_codes_expires_at ON public.access_codes(expires_at) WHERE expires_at IS NOT NULL;

-- 5. コメント追加
COMMENT ON TABLE public.access_codes IS '個人専用アクセスコード（1人につき1つ、何回でも使用可能）';