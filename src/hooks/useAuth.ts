import { useState, useEffect, useCallback } from 'react'
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

  // ユーザー情報を取得・更新
  const refreshUser = useCallback(async (forceRefresh = false) => {
    try {
      console.log('🔄🔄🔄 useAuth: refreshUser CALLED!!!', { forceRefresh })
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      // 強制リフレッシュの場合はセッションを更新
      if (forceRefresh) {
        console.log('🔄 useAuth: Force refreshing Supabase session...')
        await supabase.auth.refreshSession()
      }
      
      console.log('🔄 useAuth: About to call getCurrentUser...')
      
      // タイムアウト付きでgetCurrentUserを実行
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 15000)
      )
      
      const result = await Promise.race([
        getCurrentUser(),
        timeoutPromise
      ])
      
      console.log('📊 useAuth: getCurrentUser result:', { 
        hasUser: !!result.user, 
        hasUserData: !!result.userData,
        userId: result.user?.id,
        effectivePlan: result.userData?.effective_plan,
        planSource: result.userData?.plan_source
      })
      
      setAuthState({
        user: result.user,
        userData: result.userData,
        loading: false,
        error: null
      })
      
      // Store user ID in sessionStorage for fallback usage
      if (result.user?.id) {
        sessionStorage.setItem('currentUserId', result.user.id);
        console.log('📦 useAuth: Stored user ID in session storage:', result.user.id);
      }
      
      console.log('✅ useAuth: State updated successfully with userData:', result.userData)
    } catch (error) {
      console.error('❌ useAuth: Auth refresh error:', error)
      
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

  // 認証状態変更の監視
  useEffect(() => {
    console.log('🚀 useAuth: Setting up auth state monitoring...')
    
    // 初回読み込み - 遅延実行で安定性を向上
    console.log('🔄 useAuth: Starting initial auth check...')
    const initialTimeout = setTimeout(() => {
      console.log('🔄 useAuth: Executing delayed initial refresh...')
      refreshUser().catch(error => {
        console.error('❌ useAuth: Initial refresh failed:', error)
        // 初期認証に失敗した場合は明確にローディング状態を解除
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: '認証の初期化に失敗しました。ページを再読み込みしてください。'
        }))
      })
    }, 100) // 100ms遅延
    
    // クリーンアップで初期タイムアウトもクリア
    const cleanup = () => {
      clearTimeout(initialTimeout)
    }

    // 認証状態変更の監視（必要最小限のイベントのみ）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 useAuth: Auth state changed:', event, session?.user?.id)
        
        if (event === 'SIGNED_IN') {
          // 明示的なログイン時のみ
          console.log('✅ useAuth: User signed in, refreshing user data...')
          setTimeout(() => refreshUser(), 500) // 少し遅延させる
        } else if (event === 'SIGNED_OUT') {
          // ログアウト時
          console.log('👋 useAuth: User signed out')
          // Clear stored user ID
          sessionStorage.removeItem('currentUserId');
          localStorage.removeItem('currentUserId');
          
          setAuthState({
            user: null,
            userData: null,
            loading: false,
            error: null
          })
        } else if (event === 'INITIAL_SESSION') {
          // 初期セッション - より慎重にハンドリング
          console.log('🔍 useAuth: Initial session detected')
          if (session?.user) {
            console.log('✅ useAuth: Initial session has user, skipping refresh (already done)')
            // すでにrefreshUserが呼ばれているので、ここでは呼ばない
          } else {
            console.log('❌ useAuth: Initial session has no user')
            setAuthState({
              user: null,
              userData: null,
              loading: false,
              error: null
            })
          }
        } else if (event === 'USER_DELETED') {
          // ユーザーが削除された
          console.log('🚫 useAuth: User account was deleted')
          // Clear stored user ID
          sessionStorage.removeItem('currentUserId');
          localStorage.removeItem('currentUserId');
          
          setAuthState({
            user: null,
            userData: null,
            loading: false,
            error: 'アカウントが削除されています。新しくアカウントを作成してください。'
          })
          // ログインページへリダイレクト
          window.location.href = '/login?error=account_deleted'
        }
        // TOKEN_REFRESHEDは無視（タブ切り替えで混乱を避ける）
      }
    )

    return () => {
      console.log('🧹 useAuth: Cleaning up auth subscription')
      subscription.unsubscribe()
    }
  }, [refreshUser])

  // 長時間ローディング状態を検出して強制リセット
  useEffect(() => {
    if (!authState.loading) return
    
    console.log('⏰ useAuth: Setting loading timeout (3 seconds)')
    const timeoutId = setTimeout(() => {
      console.log('⏱️ useAuth: Loading timeout reached, forcing reset')
      console.log('🔍 useAuth: Current state at timeout:', authState)
      
      // より積極的にローディング状態を解除
      setAuthState(prev => ({
        user: prev.user,
        userData: prev.userData,
        loading: false,
        error: prev.user ? null : '認証の確認に時間がかかっています。ページを再読み込みしてください。'
      }))
    }, 3000) // 3秒に短縮
    
    return () => {
      console.log('🧹 useAuth: Clearing loading timeout')
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