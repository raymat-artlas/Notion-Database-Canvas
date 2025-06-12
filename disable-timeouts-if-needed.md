# タイムアウトを無効化する場合の手順

もしタイムアウトエラーが頻発して問題になる場合は、以下の方法でタイムアウトを無効化できます：

## 1. useAuth.tsでタイムアウトを無効化

```typescript
// タイムアウトなしバージョン
const refreshUser = useCallback(async () => {
  try {
    console.log('🔄 useAuth: Refreshing user data...')
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    const result = await getCurrentUser()
    
    setAuthState({
      user: result.user,
      userData: result.userData,
      loading: false,
      error: null
    })
    
    console.log('✅ useAuth: State updated successfully')
  } catch (error) {
    console.error('❌ useAuth: Auth refresh error:', error)
    setAuthState({
      user: null,
      userData: null,
      loading: false,
      error: null // エラーメッセージを表示しない
    })
  }
}, [])
```

## 2. auth.tsでタイムアウトを無効化

```typescript
export async function getCurrentUser() {
  try {
    console.log('🔍 getCurrentUser: Getting auth user...')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!user || authError) {
      return { user: null, userData: null }
    }
    
    // タイムアウトなしでユーザーデータを取得
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()
        
      if (userData && !userError) {
        return { user, userData }
      }
    } catch (error) {
      console.warn('⚠️ getCurrentUser: Error fetching user data:', error)
    }
    
    // デフォルトプロファイルを返す
    const defaultProfile = {
      id: user.id,
      email: user.email,
      plan: 'free' as const,
      canvas_count: 0,
      export_count: 0,
      export_reset_date: new Date().toISOString(),
      effective_plan: 'free' as const,
      plan_source: 'default' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    return { user, userData: defaultProfile }
    
  } catch (error) {
    console.error('❌ getCurrentUser: Fatal error:', error)
    return { user: null, userData: null }
  }
}
```

## 3. ダッシュボードでタイムアウト無効化

```typescript
const loadCanvases = async () => {
  try {
    setIsLoadingCanvases(true)
    // タイムアウトなしで処理
    // 既存の処理...
  } catch (error) {
    console.error('Failed to load canvases:', error)
    setCanvases([])
  } finally {
    setIsLoadingCanvases(false)
  }
}
```

この方法を使用する場合は、元のコードに戻すことになりますが、エラーハンドリングは改善されているので、無限ローディングは避けられます。