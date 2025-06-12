-- アクセスコードテーブルをUUIDベース個人専用コードに対応

-- 1. カラム構造確認と修正
-- 既存のaccess_codesテーブルの構造を新仕様に合わせる

-- nameカラムをdescriptionに統合（重複回避）
DO $$
BEGIN
    -- nameカラムが存在し、descriptionカラムが空の場合はコピー
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_codes' AND column_name = 'name') THEN
        UPDATE public.access_codes 
        SET description = COALESCE(description, name)
        WHERE description IS NULL OR description = '';
        
        -- nameカラムを削除
        ALTER TABLE public.access_codes DROP COLUMN IF EXISTS name;
    END IF;
END $$;

-- 2. expires_atカラムが存在しない場合は追加
ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 3. 依存関係のあるポリシーを削除してからカラム移行
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_codes' AND column_name = 'valid_until') THEN
        -- 依存するポリシーを削除
        DROP POLICY IF EXISTS "Users can view active codes" ON public.access_codes;
        DROP POLICY IF EXISTS "Admins can manage codes" ON public.access_codes;
        
        -- データ移行
        UPDATE public.access_codes 
        SET expires_at = valid_until
        WHERE expires_at IS NULL AND valid_until IS NOT NULL;
        
        -- カラム削除
        ALTER TABLE public.access_codes DROP COLUMN IF EXISTS valid_until;
        ALTER TABLE public.access_codes DROP COLUMN IF EXISTS valid_from;
        
        -- ポリシーを再作成（新しいカラム名で）
        CREATE POLICY "Users can view active codes" ON public.access_codes
        FOR SELECT USING (
            is_active = true 
            AND (expires_at IS NULL OR expires_at > NOW())
        );
        
        CREATE POLICY "Admins can manage codes" ON public.access_codes
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- 4. 不要なカラムを削除
ALTER TABLE public.access_codes 
DROP COLUMN IF EXISTS user_type,
DROP COLUMN IF EXISTS created_by;

-- 5. デフォルト値を新仕様に合わせて更新
-- 個人専用コード用のデフォルト値
ALTER TABLE public.access_codes 
ALTER COLUMN max_uses SET DEFAULT 1,
ALTER COLUMN one_time_per_user SET DEFAULT false,
ALTER COLUMN trial_duration_days SET DEFAULT 0;

-- 6. 既存のアクセスコードを個人専用コード仕様に更新
UPDATE public.access_codes 
SET 
    max_uses = 1,
    one_time_per_user = false,
    trial_duration_days = 0
WHERE max_uses IS NULL OR max_uses > 10; -- 大量配布用でない場合

-- 7. コメント更新
COMMENT ON TABLE public.access_codes IS '個人専用アクセスコード（1人につき1つ、何回でも使用可能）';
COMMENT ON COLUMN public.access_codes.max_uses IS '最大使用ユーザー数（1=個人専用、>10=プロモーション）';
COMMENT ON COLUMN public.access_codes.one_time_per_user IS '個人専用コードの場合はfalse（何回でも使用可能）';
COMMENT ON COLUMN public.access_codes.trial_duration_days IS 'アクセスコードは0、プロモーションコードのみ期間設定';
COMMENT ON COLUMN public.access_codes.expires_at IS 'アクセスコード自体の有効期限';

-- 8. インデックス最適化
DROP INDEX IF EXISTS idx_access_codes_active;
CREATE INDEX IF NOT EXISTS idx_access_codes_code_active ON public.access_codes(code, is_active);
CREATE INDEX IF NOT EXISTS idx_access_codes_expires_at ON public.access_codes(expires_at) WHERE expires_at IS NOT NULL;