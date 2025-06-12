-- テスト: ユーザーデータを一時的に変更してアプリの反応を確認

-- 現在のデータを確認
SELECT auth_user_id, email, plan, effective_plan, plan_source, trial_expires_at, active_trial_code 
FROM users 
WHERE email = 'ray.matsuura.01@gmail.com';

-- 一時的にeffective_planをfreeに変更（既にfreeの場合はpremiumに変更）
UPDATE users 
SET 
    effective_plan = CASE 
        WHEN effective_plan = 'premium' THEN 'free'::user_plan_type
        ELSE 'premium'::user_plan_type
    END,
    plan_source = CASE 
        WHEN effective_plan = 'premium' THEN 'default'
        ELSE 'promo_code'
    END,
    updated_at = NOW()
WHERE email = 'ray.matsuura.01@gmail.com';

-- 変更後のデータを確認
SELECT auth_user_id, email, plan, effective_plan, plan_source, trial_expires_at, active_trial_code 
FROM users 
WHERE email = 'ray.matsuura.01@gmail.com';