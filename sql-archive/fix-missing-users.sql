-- 認証済みユーザーをusersテーブルに追加するSQL

-- 1. 現在のauth.usersを確認
SELECT 
  'Auth users:' as info,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. 現在のusersテーブルを確認
SELECT 
  'Users table:' as info,
  auth_user_id,
  email,
  plan,
  effective_plan,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 3. auth.usersに存在するがusersテーブルに存在しないユーザーを確認
SELECT 
  'Missing users:' as info,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.auth_user_id
WHERE u.auth_user_id IS NULL;

-- 4. 不足しているユーザーをusersテーブルに追加
INSERT INTO users (
  auth_user_id,
  email,
  plan,
  canvas_count,
  export_count,
  export_reset_date,
  effective_plan,
  plan_source,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  'free',
  0,
  0,
  NOW(),
  'free',
  'default',
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN users u ON au.id = u.auth_user_id
WHERE u.auth_user_id IS NULL;

-- 5. 結果を確認
SELECT 
  'After fix:' as info,
  COUNT(*) as user_count
FROM users;

SELECT 
  'User details:' as info,
  auth_user_id,
  email,
  plan,
  effective_plan,
  canvas_count,
  created_at
FROM users
ORDER BY created_at DESC;