-- 管理者パスワードを更新

UPDATE admin_users 
SET password_hash = '$2b$10$s8mcTxS8DEZZ5jjjMuy2aOudN5CWEx1xdxxLhxJdi5wZgVCCkxGu.'
WHERE email = 'ray@artlas.jp';