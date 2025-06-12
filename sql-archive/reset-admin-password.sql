-- 管理者パスワードをリセットするSQL

-- 新しいパスワード: admin123!
-- bcryptハッシュ: $2b$10$dqrj3fyLLjlm88yfmIobt.0ZtlvBiEOOKnwbwJHm229zUEf67B7M6

-- ray@artlas.jpのパスワードをリセット
UPDATE admin_users 
SET 
  password_hash = '$2b$10$dqrj3fyLLjlm88yfmIobt.0ZtlvBiEOOKnwbwJHm229zUEf67B7M6',
  login_attempts = 0,
  locked_until = NULL,
  updated_at = NOW()
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
  updated_at
FROM admin_users 
WHERE email = 'ray@artlas.jp';

-- 結果メッセージ
SELECT 'パスワードをリセットしました' as message;
SELECT 'メールアドレス: ray@artlas.jp' as email;
SELECT 'パスワード: admin123!' as password;
SELECT '※セキュリティのため、ログイン後すぐにパスワードを変更してください' as warning;