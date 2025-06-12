-- 既存のaccess_codesテーブルに管理者パスワード用のレコードを追加

-- 管理者パスワード用の特別なアクセスコードとして保存
INSERT INTO public.access_codes (
  code, 
  name, 
  description, 
  trial_duration_days, 
  granted_plan, 
  max_uses, 
  current_uses, 
  one_time_per_user, 
  expires_at, 
  is_active
) VALUES (
  'ADMIN_PASSWORD_SETTING',
  'Admin Password',
  'Rayraymat010!',
  0,
  'free',
  999999,
  0,
  false,
  NULL,
  true
);

-- 確認
SELECT * FROM public.access_codes WHERE code = 'ADMIN_PASSWORD_SETTING';