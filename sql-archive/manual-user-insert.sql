-- 手動でユーザーを追加（1件ずつ）

INSERT INTO users (
  auth_user_id,
  email,
  plan,
  canvas_count,
  export_count,
  export_reset_date,
  effective_plan,
  is_test_user,
  created_at,
  updated_at
) VALUES (
  'a17cb56c-d154-47db-ac57-d785c658cb4a',
  'ray.matsuura.01@gmail.com',
  'free',
  0,
  0,
  NOW(),
  'free',
  false,
  NOW(),
  NOW()
);