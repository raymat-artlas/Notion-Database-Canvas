-- 管理者設定用テーブル作成（パスワードをSupabaseで管理）

CREATE TABLE public.admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 設定項目
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  
  -- メタデータ
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_admin_settings_key ON public.admin_settings(setting_key);

-- RLS設定
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- ポリシー作成（サービスロールのみアクセス可能）
CREATE POLICY "Only service role can access admin_settings" ON public.admin_settings
FOR ALL USING (auth.role() = 'service_role');

-- updated_atトリガー
CREATE TRIGGER trigger_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 管理者パスワード設定
INSERT INTO public.admin_settings (setting_key, setting_value, description) VALUES 
('admin_password', 'Rayraymat010!', '管理者ログインパスワード');

-- コメント
COMMENT ON TABLE public.admin_settings IS '管理者設定（パスワードなど）';
COMMENT ON COLUMN public.admin_settings.setting_key IS '設定キー';
COMMENT ON COLUMN public.admin_settings.setting_value IS '設定値';

-- 確認
SELECT setting_key, setting_value, description FROM public.admin_settings;