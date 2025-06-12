-- 孤立したレコードの確認

-- 1. auth.usersに存在するユーザー数
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- 2. 各テーブルの孤立レコード
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN auth_user_id NOT IN (SELECT id FROM auth.users) THEN 1 END) as orphaned_records
FROM users
UNION ALL
SELECT 
    'promo_usage_history',
    COUNT(*),
    COUNT(CASE WHEN user_id NOT IN (SELECT id FROM auth.users) THEN 1 END)
FROM promo_usage_history
UNION ALL
SELECT 
    'code_usage_history',
    COUNT(*),
    COUNT(CASE WHEN user_id NOT IN (SELECT id FROM auth.users) THEN 1 END)
FROM code_usage_history;

-- 3. 具体的にどのレコードが孤立しているか（usersテーブル）
SELECT 
    u.id,
    u.auth_user_id,
    u.email,
    u.effective_plan,
    u.created_at,
    'Orphaned' as status
FROM users u
WHERE u.auth_user_id NOT IN (SELECT id FROM auth.users)
ORDER BY u.created_at DESC;