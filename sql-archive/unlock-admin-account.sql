-- 管理者アカウントのロックを解除するSQL

-- ray@artlas.jpのアカウントロックを解除
UPDATE admin_users 
SET 
  login_attempts = 0,
  locked_until = NULL
WHERE email = 'ray@artlas.jp';

-- 確認
SELECT 
  id,
  email,
  name,
  role,
  is_active,
  login_attempts,
  locked_until,
  last_login_at
FROM admin_users 
WHERE email = 'ray@artlas.jp';

-- 結果メッセージ
SELECT 'アカウントのロックを解除しました' as message;