-- 管理画面でのプラン変更機能を削除したため、admin_overrideデータをクリーンアップ

-- admin_overrideでpremiumに設定されたユーザーをfreeに戻す
UPDATE users 
SET 
    effective_plan = 'free',
    plan_source = 'default',
    updated_at = NOW()
WHERE plan_source = 'admin_override';

-- 確認クエリ
SELECT auth_user_id, email, plan, effective_plan, plan_source, trial_expires_at 
FROM users 
WHERE plan_source = 'admin_override';