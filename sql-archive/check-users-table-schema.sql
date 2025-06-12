-- Check the actual schema of the users table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check if effective_plan column exists and has data
SELECT 
    auth_user_id,
    email,
    plan,
    effective_plan,
    plan_source,
    active_trial_code,
    trial_expires_at
FROM users
LIMIT 5;