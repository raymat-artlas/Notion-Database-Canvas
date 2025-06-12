-- 既存のaccess_codesテーブルに管理者パスワードを保存

INSERT INTO public.access_codes (
  code, 
  name, 
  description, 
  granted_plan, 
  trial_duration_days, 
  max_uses, 
  current_uses, 
  one_time_per_user, 
  is_active
) VALUES (
  'ADMIN_PASSWORD', 
  'Admin Password', 
  'Rayraymat010!', 
  'premium', 
  0, 
  999999, 
  0, 
  false, 
  true
);

-- 確認
SELECT code, description FROM public.access_codes WHERE code = 'ADMIN_PASSWORD';