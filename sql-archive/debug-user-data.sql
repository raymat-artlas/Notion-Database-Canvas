-- Debug: Check if user exists in users table and their current data
SELECT 
    auth_user_id,
    email,
    plan,
    effective_plan,
    plan_source,
    active_trial_code,
    trial_expires_at,
    created_at,
    updated_at
FROM users 
WHERE auth_user_id = 'a17cb56c-d154-47db-ac57-d785c658cb4a'
   OR email = 'ray.matsuura.01@gmail.com';

-- Check promo usage history for this user
SELECT 
    user_id,
    code,
    granted_plan,
    trial_duration_days,
    expires_at,
    status,
    created_at
FROM promo_usage_history 
WHERE user_id = 'a17cb56c-d154-47db-ac57-d785c658cb4a';

-- Check if there are any rows in users table at all
SELECT COUNT(*) as total_users FROM users;

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;