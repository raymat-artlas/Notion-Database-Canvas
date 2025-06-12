-- 安全なユーザー確認と追加SQL

-- まず現在の状況を確認
SELECT COUNT(*) as auth_user_count FROM auth.users;
SELECT COUNT(*) as users_table_count FROM users;

-- auth.usersテーブルの最初の数件を確認
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;