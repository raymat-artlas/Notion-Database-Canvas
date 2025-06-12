import { createClient } from '@supabase/supabase-js'

// 環境変数を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 必須環境変数の確認
if (!supabaseUrl) {
  throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// 通常のSupabaseクライアント（匿名キー使用）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// 管理者用Supabaseクライアント（Service Roleキー使用）
let supabaseAdmin: ReturnType<typeof createClient> | null = null

if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export { supabaseAdmin }

// Database types - usersテーブルベース
export interface Profile {
  id: string // auth.users.id (UUID)
  email?: string
  plan: 'free' | 'premium'
  canvas_count: number
  export_count: number
  export_reset_date: string
  
  // Notion設定
  notion_api_key?: string
  notion_workspace_name?: string
  
  // トライアル関連
  trial_expires_at?: string
  /** @deprecated 今後はactive_promo_code_idを参照 */
  active_trial_code?: string
  /** プロモーションコードUUID参照（新方式） */
  active_promo_code_id?: string
  effective_plan: 'free' | 'premium'
  plan_source: 'default' | 'trial_code' | 'stripe' | 'promo_code'
  
  created_at: string
  updated_at: string
}

// 旧User型の互換性維持（段階的移行用）
export interface User extends Profile {
  user_id?: string // 後方互換性
  auth_user_id?: string // 後方互換性
}

// 管理画面用のシンプルなユーザー型
export interface AuthUser {
  id: string
  email: string
  created_at?: string
  last_sign_in_at?: string
}

// 新しい認証関連の型
export interface AccessCode {
  id: string
  code: string
  name: string
  description?: string
  granted_plan: 'free' | 'premium'
  trial_duration_days?: number
  max_uses?: number
  current_uses: number
  one_time_per_user: boolean
  user_type: 'new_only' | 'existing_only' | 'all'
  valid_from: string
  valid_until?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CodeUsageHistory {
  id: string
  user_id: string
  code_id: string
  code: string
  granted_plan: string
  trial_duration_days?: number
  applied_at: string
  expires_at?: string
  status: 'active' | 'expired' | 'cancelled'
}

export interface UserUsage {
  id: string
  user_id: string
  month: string // YYYY-MM format
  canvas_count: number
  export_count: number
  created_at: string
  updated_at: string
}