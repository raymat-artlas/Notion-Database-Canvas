-- Supabase認証システム用のRPC関数
-- auth.tsで使用される関数を定義

-- ========================================
-- アクセスコード適用のトランザクション関数
-- ========================================
CREATE OR REPLACE FUNCTION apply_access_code(
  p_auth_user_id UUID,
  p_code_id UUID,
  p_code VARCHAR(50),
  p_granted_plan VARCHAR(20),
  p_trial_duration_days INTEGER,
  p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
BEGIN
  -- 1. ユーザー情報更新
  UPDATE public.users 
  SET 
    trial_expires_at = p_expires_at,
    active_trial_code = p_code,
    effective_plan = p_granted_plan,
    plan_source = CASE 
      WHEN p_trial_duration_days IS NOT NULL THEN 'trial_code'
      ELSE 'default'
    END,
    updated_at = NOW()
  WHERE auth_user_id = p_auth_user_id;

  -- 2. 使用履歴追加
  INSERT INTO public.code_usage_history (
    user_id,
    code_id,
    code,
    granted_plan,
    trial_duration_days,
    expires_at,
    status
  ) VALUES (
    p_auth_user_id,
    p_code_id,
    p_code,
    p_granted_plan,
    p_trial_duration_days,
    p_expires_at,
    'active'
  );

  -- 3. コード使用回数更新
  UPDATE public.access_codes 
  SET 
    current_uses = current_uses + 1,
    updated_at = NOW()
  WHERE id = p_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 期限切れ体験の自動更新関数
-- ========================================
CREATE OR REPLACE FUNCTION update_expired_trials()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- 期限切れの体験ユーザーを無料プランに戻す
  UPDATE public.users 
  SET 
    effective_plan = 'free',
    plan_source = 'default',
    active_trial_code = NULL,
    updated_at = NOW()
  WHERE 
    trial_expires_at IS NOT NULL 
    AND trial_expires_at < NOW()
    AND effective_plan = 'premium'
    AND plan_source = 'trial_code';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- 使用履歴も期限切れに更新
  UPDATE public.code_usage_history
  SET 
    status = 'expired'
  WHERE 
    expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND status = 'active';

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ユーザーの現在の有効プラン取得関数
-- ========================================
CREATE OR REPLACE FUNCTION get_user_effective_plan(p_auth_user_id UUID)
RETURNS TABLE (
  current_plan VARCHAR(20),
  plan_source VARCHAR(20),
  trial_expires_at TIMESTAMP WITH TIME ZONE,
  remaining_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.effective_plan as current_plan,
    u.plan_source,
    u.trial_expires_at,
    CASE 
      WHEN u.trial_expires_at > NOW() THEN 
        EXTRACT(DAYS FROM (u.trial_expires_at - NOW()))::INTEGER
      ELSE 0
    END as remaining_days
  FROM public.users u
  WHERE u.auth_user_id = p_auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 管理者用：アクセスコード統計取得
-- ========================================
CREATE OR REPLACE FUNCTION get_access_code_stats()
RETURNS TABLE (
  code VARCHAR(50),
  name VARCHAR(100),
  current_uses INTEGER,
  max_uses INTEGER,
  conversion_rate NUMERIC(5,2),
  active_trials INTEGER,
  total_signups INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.code,
    ac.name,
    ac.current_uses,
    ac.max_uses,
    CASE 
      WHEN ac.current_uses > 0 THEN 
        ROUND((cuh.active_count::NUMERIC / ac.current_uses::NUMERIC) * 100, 2)
      ELSE 0
    END as conversion_rate,
    COALESCE(cuh.active_count, 0) as active_trials,
    ac.current_uses as total_signups
  FROM public.access_codes ac
  LEFT JOIN (
    SELECT 
      code_id,
      COUNT(*) FILTER (WHERE status = 'active') as active_count
    FROM public.code_usage_history
    GROUP BY code_id
  ) cuh ON ac.id = cuh.code_id
  WHERE ac.is_active = true
  ORDER BY ac.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 自動期限切れ更新用のcron設定（手動実行用）
-- ========================================
-- この関数を定期的に実行して期限切れユーザーを更新
-- 実際のcron設定はSupabaseのダッシュボードで行う

-- テスト実行：
-- SELECT update_expired_trials();