import { useState, useEffect, useCallback, useRef } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, signOut } from '@/lib/auth'
import type { User } from '@/lib/supabase'

interface AuthState {
  user: SupabaseUser | null
  userData: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userData: null,
    loading: true,
    error: null
  })
  
  // タブ切り替えによる重複処理を防ぐ
  const lastAuthCheckRef = useRef<number>(0)
  const isAuthCheckingRef = useRef<boolean>(false)

  // ユーザー情報を取得・更新
  const refreshUser = useCallback(async (forceRefresh = false) => {
    // ページが非表示の場合は実行しない（タブ切り替え対策）
    if (!forceRefresh && document.hidden) {
      return
    }
    
    // 短時間での重複実行を防ぐ（5秒以内は無視）
    const now = Date.now()
    if (!forceRefresh && now - lastAuthCheckRef.current < 5000) {
      return
    }
    
    // 既に実行中の場合は無視
    if (isAuthCheckingRef.current && !forceRefresh) {
      return
    }
    
    try {
      isAuthCheckingRef.current = true
      lastAuthCheckRef.current = now
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      // 強制リフレッシュの場合はセッションを更新
      if (forceRefresh) {
        await supabase.auth.refreshSession()
      }
      
      // タイムアウト付きでgetCurrentUserを実行
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 10000)
      )
      
      const result = await Promise.race([
        getCurrentUser(),
        timeoutPromise
      ])
      
      setAuthState({
        user: result.user,
        userData: result.userData,
        loading: false,
        error: null
      })
      
      // Store user ID in sessionStorage for fallback usage
      if (result.user?.id) {
        sessionStorage.setItem('currentUserId', result.user.id);
      }
    } catch (error) {
      let errorMessage = 'ユーザー情報の取得に失敗しました'
      if (error instanceof Error) {
        // Refresh Tokenエラーの特別処理
        if (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found')) {
          errorMessage = 'アカウントが見つかりません。再度ログインしてください。'
          // 数秒後にログインページへリダイレクト
          setTimeout(() => {
            window.location.href = '/login?error=invalid_token'
          }, 2000)
        } else if (error.message === 'Auth timeout') {
          errorMessage = '認証がタイムアウトしました'
        }
      }
      
      setAuthState({
        user: null,
        userData: null,
        loading: false,
        error: errorMessage
      })
    } finally {
      isAuthCheckingRef.current = false
    }
  }, [])

  // ログアウト処理
  const handleSignOut = useCallback(async () => {
    try {
      const result = await signOut()
      if (result.success) {
        // Clear stored user ID
        sessionStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUserId');
        
        setAuthState({
          user: null,
          userData: null,
          loading: false,
          error: null
        })
        // ダッシュボードから離れる
        window.location.href = '/login'
      } else {
        setAuthState(prev => ({ ...prev, error: result.error || 'ログアウトに失敗しました' }))
      }
    } catch (error) {
      console.error('Sign out error:', error)
      setAuthState(prev => ({ ...prev, error: 'ログアウト中にエラーが発生しました' }))
    }
  }, [])

  // 初回のみ認証を実行
  useEffect(() => {
    // 初回読み込み時のみ実行
    refreshUser().catch(error => {
      console.error('❌ useAuth: Initial refresh failed:', error)
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: '認証の初期化に失敗しました。ページを再読み込みしてください。'
      }))
    })
  }, []) // 依存配列を空にして初回のみ実行

  // 必要最小限の認証状態変更監視のみ
  useEffect(() => {
    // 明示的なログイン・ログアウトのみ監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // タブ切り替えやトークン更新は無視
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          return
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          // 明示的なログイン時のみ
          setAuthState({
            user: session.user,
            userData: null, // 後でrefreshUserで取得
            loading: false,
            error: null
          })
          // ユーザーデータを取得
          setTimeout(() => refreshUser(true), 100)
        } else if (event === 'SIGNED_OUT') {
          // ログアウト時
          sessionStorage.removeItem('currentUserId');
          localStorage.removeItem('currentUserId');
          setAuthState({
            user: null,
            userData: null,
            loading: false,
            error: null
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [refreshUser])

  // 長時間ローディング状態を検出して強制リセット
  useEffect(() => {
    if (!authState.loading) return
    
    const timeoutId = setTimeout(() => {
      // より積極的にローディング状態を解除
      setAuthState(prev => ({
        user: prev.user,
        userData: prev.userData,
        loading: false,
        error: prev.user ? null : '認証の確認に時間がかかっています。ページを再読み込みしてください。'
      }))
    }, 10000) // 10秒に延長
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [authState.loading])

  // プラン関連のヘルパー関数
  const isAuthenticated = authState.user !== null
  // getEffectivePlan関数を使って正確な判定を行う
  const isPremium = authState.userData ? (() => {
    const { getEffectivePlan } = require('@/lib/planLimits')
    return getEffectivePlan(authState.userData) === 'premium'
  })() : false
  const isTrialActive = authState.userData?.plan_source === 'trial_code' && 
                       authState.userData?.trial_expires_at && 
                       new Date(authState.userData.trial_expires_at) > new Date()
  
  const trialDaysRemaining = authState.userData?.trial_expires_at 
    ? Math.max(0, Math.ceil((new Date(authState.userData.trial_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return {
    // 認証状態
    user: authState.user,
    userData: authState.userData,
    loading: authState.loading,
    error: authState.error,
    
    // ヘルパー
    isAuthenticated,
    isPremium,
    isTrialActive,
    trialDaysRemaining,
    
    // 関数
    refreshUser,
    signOut: handleSignOut
  }
}