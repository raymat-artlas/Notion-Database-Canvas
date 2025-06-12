// シンプルなウェイトリスト設定
export const WAITLIST_CONFIG = {
  trialDays: 30,
  description: 'ウェイトリスト登録でリリース時に30日間のプレミアム体験をプレゼント'
}

// キャンペーン設定（無効化）
export const CAMPAIGN_CONFIG = {
  // ウェイティングリスト自動体験キャンペーン
  autoTrial: {
    enabled: false,  // キャンペーン無効化
    name: 'ウェイティングリスト限定体験',
    startDate: '2025-06-09T00:00:00Z',  // UTC時刻で指定
    endDate: '2025-12-31T23:59:59Z',
    trialDays: 30,
    maxUsers: 500,
    description: '期間限定！新規登録で1ヶ月間プレミアム機能を無料体験'
  },
  
  // シークレットキー設定
  secretKeys: {
    // テストユーザー用の長期アクセス
    'beta-tester-2025': {
      name: 'ベータテスター',
      trialDays: 180,  // 6ヶ月
      grantedPlan: 'premium',
      description: 'ベータテスター向け長期利用権'
    },
    
    // 開発者用の無制限アクセス
    'dev-unlimited-2025': {
      name: '開発者アカウント',
      trialDays: 365,  // 1年
      grantedPlan: 'premium',
      description: '開発者向け長期利用権'
    }
  }
}

// キャンペーン期間チェック
export function isAutoTrialActive(): boolean {
  if (!CAMPAIGN_CONFIG.autoTrial.enabled) return false
  
  const now = new Date()
  const start = new Date(CAMPAIGN_CONFIG.autoTrial.startDate)
  const end = new Date(CAMPAIGN_CONFIG.autoTrial.endDate)
  
  return now >= start && now <= end
}

// シークレットキーの検証
export function validateSecretKey(key: string): {
  valid: boolean
  keyData?: typeof CAMPAIGN_CONFIG.secretKeys[string]
} {
  const keyData = CAMPAIGN_CONFIG.secretKeys[key as keyof typeof CAMPAIGN_CONFIG.secretKeys]
  
  if (keyData) {
    return { valid: true, keyData }
  }
  
  return { valid: false }
}

// キャンペーン情報取得
export function getCampaignInfo() {
  const isActive = isAutoTrialActive()
  const config = CAMPAIGN_CONFIG.autoTrial
  
  if (!isActive) {
    return {
      isActive: false,
      message: 'キャンペーンは現在実施されていません'
    }
  }
  
  const endDate = new Date(config.endDate)
  const remainingDays = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  
  return {
    isActive: true,
    name: config.name,
    description: config.description,
    trialDays: config.trialDays,
    maxUsers: config.maxUsers,
    endDate: config.endDate,
    remainingDays: Math.max(0, remainingDays)
  }
}