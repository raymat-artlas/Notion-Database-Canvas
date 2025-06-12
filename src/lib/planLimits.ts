import { User } from './supabase';

export const PLAN_LIMITS = {
  free: {
    canvases: 2,
    exportsPerMonth: 10,
    downloadEnabled: false,
    onlineStorageEnabled: false,
    retentionDays: 30, // 無料プランは30日間保存
  },
  premium: {
    canvases: Infinity,
    exportsPerMonth: Infinity,
    downloadEnabled: true,
    onlineStorageEnabled: true,
    retentionDays: Infinity, // プレミアムは無期限
  },
} as const;

export interface PlanLimitCheck {
  allowed: boolean;
  message?: string;
  currentUsage?: number;
  limit?: number;
}

// effective_planを計算する関数
// ユーザーの実際に有効なプランを判定する
export function getEffectivePlan(user: User): 'free' | 'premium' {
  console.log('🔍 getEffectivePlan: Input user data:', {
    plan: user.plan,
    effective_plan: user.effective_plan,
    plan_source: user.plan_source,
    trial_expires_at: user.trial_expires_at
  });

  // 1. Stripe課金ユーザーは常にpremium
  if (user.plan_source === 'stripe' && user.plan === 'premium') {
    console.log('✅ getEffectivePlan: Stripe premium user');
    return 'premium';
  }
  
  
  // 2. トライアル期間がある場合は期限チェック
  if (user.trial_expires_at) {
    const now = new Date();
    const expiresAt = new Date(user.trial_expires_at);
    
    console.log('📅 getEffectivePlan: Trial check:', {
      now: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isValid: now < expiresAt
    });
    
    if (now < expiresAt) {
      // トライアル期間中は effective_plan を使用
      console.log('⏰ getEffectivePlan: Trial active, returning:', user.effective_plan);
      return user.effective_plan || 'premium';
    } else {
      // トライアル期間終了 - 基本プランに戻る
      console.log('⏰ getEffectivePlan: Trial expired, returning:', user.plan);
      return user.plan || 'free';
    }
  }
  
  // 3. trial_expires_atがnullの場合 - effective_planをそのまま使用
  console.log('📋 getEffectivePlan: No trial period, using effective_plan:', user.effective_plan);
  return user.effective_plan || user.plan || 'free';
}

export function checkCanvasLimit(user: User): PlanLimitCheck {
  // effective_planを使用し、期限チェックも行う
  const effectivePlan = getEffectivePlan(user);
  const limit = PLAN_LIMITS[effectivePlan].canvases;
  
  console.log('🔍 checkCanvasLimit Debug:', {
    user_plan: user.plan,
    user_effective_plan: user.effective_plan,
    user_plan_source: user.plan_source,
    user_trial_expires_at: user.trial_expires_at,
    calculated_effective_plan: effectivePlan,
    limit,
    user_canvas_count: user.canvas_count,
    will_block: user.canvas_count >= limit
  });
  
  if (user.canvas_count >= limit) {
    return {
      allowed: false,
      message: effectivePlan === 'free' 
        ? `無料プランでは${limit}個までのキャンバスを作成できます。プレミアムプランにアップグレードすると無制限に作成できます。\n\n※この制限はローカルストレージをクリアしてもリセットされません。`
        : 'キャンバス作成上限に達しました',
      currentUsage: user.canvas_count,
      limit,
    };
  }

  return {
    allowed: true,
    currentUsage: user.canvas_count,
    limit,
  };
}

export function checkExportLimit(user: User): PlanLimitCheck {
  const effectivePlan = getEffectivePlan(user);
  const limit = PLAN_LIMITS[effectivePlan].exportsPerMonth;
  
  // 月が変わっているかチェック
  const now = new Date();
  const resetDate = new Date(user.export_reset_date);
  
  if (now >= resetDate) {
    // 月が変わったのでカウントリセット
    return {
      allowed: true,
      currentUsage: 0,
      limit,
    };
  }

  if (user.export_count >= limit) {
    return {
      allowed: false,
      message: effectivePlan === 'free'
        ? `無料プランでは月${limit}回までエクスポートできます。プレミアムプランにアップグレードすると無制限にエクスポートできます。`
        : 'エクスポート上限に達しました',
      currentUsage: user.export_count,
      limit,
    };
  }

  return {
    allowed: true,
    currentUsage: user.export_count,
    limit,
  };
}

export function checkDownloadAccess(user: User): PlanLimitCheck {
  const effectivePlan = getEffectivePlan(user);
  const allowed = PLAN_LIMITS[effectivePlan].downloadEnabled;
  
  if (!allowed) {
    return {
      allowed: false,
      message: 'ダウンロード機能はプレミアムプランでご利用いただけます。',
    };
  }

  return { allowed: true };
}

export function checkOnlineStorageAccess(user: User): PlanLimitCheck {
  const effectivePlan = getEffectivePlan(user);
  const allowed = PLAN_LIMITS[effectivePlan].onlineStorageEnabled;
  
  if (!allowed) {
    return {
      allowed: false,
      message: 'オンライン保存機能はプレミアムプランでご利用いただけます。',
    };
  }

  return { allowed: true };
}