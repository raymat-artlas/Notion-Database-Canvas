import { supabase, supabaseAdmin } from './supabase'
import type { AccessCode, User, CodeUsageHistory } from './supabase'
import { isAutoTrialActive, CAMPAIGN_CONFIG } from './campaignConfig'

// =====================================
// アクセスコード検証関数
// =====================================
export async function validateAccessCode(code: string, userType: 'new' | 'existing' = 'new') {
  try {
    // APIエンドポイントを使用してService Role経由で検証
    const response = await fetch('/api/validate-access-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, userType }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Access code validation error:', error)
    return { valid: false, error: 'アクセスコードの検証中にエラーが発生しました' }
  }
}

// =====================================
// アクセスコード適用関数
// =====================================
export async function applyAccessCode(authUserId: string, code: string) {
  try {
    // 1. コード検証
    const validation = await validateAccessCode(code, 'existing')
    if (!validation.valid || !validation.accessCode) {
      return { success: false, error: validation.error }
    }

    const accessCode = validation.accessCode as AccessCode

    // 2. このコードが他のユーザーに使われていないかチェック（個人専用コード）
    if (accessCode.max_uses === 1) {
      const { data: existingUsage } = await supabase
        .from('code_usage_history')
        .select('user_id')
        .eq('code_id', accessCode.id)
        .single()

      // 他のユーザーが既に使用している場合はエラー
      if (existingUsage && existingUsage.user_id !== authUserId) {
        return { success: false, error: 'このアクセスコードは他のユーザーが使用中です' }
      }
    }

    // 3. ユーザー情報取得
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'ユーザー情報が見つかりません' }
    }

    // 4. 課金ユーザーの場合は適用拒否
    if (user.effective_plan === 'premium' && user.plan_source === 'stripe') {
      return { 
        success: false, 
        error: '既にプレミアムプランをご利用中のため、このコードはご利用いただけません' 
      }
    }

    // 5. 体験期間計算
    const now = new Date()
    const expiresAt = accessCode.trial_duration_days 
      ? new Date(now.getTime() + accessCode.trial_duration_days * 24 * 60 * 60 * 1000)
      : null

    // 6. ユーザー情報更新
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        trial_expires_at: expiresAt?.toISOString(),
        active_trial_code: code,
        effective_plan: accessCode.granted_plan,
        plan_source: accessCode.trial_duration_days ? 'trial_code' : 'default',
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', authUserId)

    if (userUpdateError) {
      console.error('User update error:', userUpdateError)
      return { success: false, error: 'ユーザー情報の更新に失敗しました' }
    }

    // 7. 使用履歴追加
    const { error: historyError } = await supabase
      .from('code_usage_history')
      .insert({
        user_id: authUserId,
        code_id: accessCode.id,
        code: code,
        granted_plan: accessCode.granted_plan,
        trial_duration_days: accessCode.trial_duration_days,
        expires_at: expiresAt?.toISOString(),
        status: 'active'
      })

    if (historyError) {
      console.error('History insert error:', historyError)
      // 履歴作成失敗は致命的ではないので続行
    }

    // 8. コード使用回数更新
    const { error: codeUpdateError } = await supabase
      .from('access_codes')
      .update({ 
        current_uses: accessCode.current_uses + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', accessCode.id)

    if (codeUpdateError) {
      console.error('Code usage update error:', codeUpdateError)
      // 使用回数更新失敗も致命的ではないので続行
    }

    return { 
      success: true, 
      message: accessCode.trial_duration_days 
        ? `${accessCode.trial_duration_days}日間のプレミアム体験を開始しました！`
        : 'プレミアムプランが有効になりました！',
      expiresAt
    }

  } catch (error) {
    console.error('Apply access code error:', error)
    return { success: false, error: 'アクセスコードの適用中にエラーが発生しました' }
  }
}

// =====================================
// サインアップ時のアカウント作成
// =====================================
export async function createUserWithAccessCode(
  email: string,
  password: string,
  accessCode: string
) {
  try {
    // 1. アクセスコード検証
    const validation = await validateAccessCode(accessCode, 'new')
    if (!validation.valid || !validation.accessCode) {
      return { success: false, error: validation.error }
    }
    const codeData = validation.accessCode as AccessCode
    // 2. Supabase Authでアカウント作成
    const signupResponse = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, accessCode }),
    });
    const signupResult = await signupResponse.json();
    if (!signupResponse.ok || !signupResult.success) {
      return { 
        success: false, 
        error: signupResult.error || 'アカウントの作成に失敗しました' 
      }
    }
    const authData = { user: signupResult.user, session: null }
    // コード使用履歴記録・使用回数更新は従来通り
    // ...（省略: 必要ならAPI呼び出しを残す）
    return { 
      success: true, 
      user: authData.user,
      message: codeData.trial_duration_days 
        ? `アカウントを作成しました！${codeData.trial_duration_days}日間のプレミアム体験をお楽しみください。`
        : 'アカウントを作成しました！'
    }
  } catch (error) {
    return { success: false, error: 'アカウント作成中にエラーが発生しました' }
  }
}

// =====================================
// 自動体験付きサインアップ
// =====================================
export async function createUserWithAutoTrial(
  email: string,
  password: string
) {
  try {
    let trialDays = 0;
    let planSource = 'default';
    let grantedPlan = 'free';
    
    // 自動体験をチェック
    if (isAutoTrialActive()) {
      trialDays = CAMPAIGN_CONFIG.autoTrial.trialDays;
      planSource = 'auto_trial';
      grantedPlan = 'premium';
    }

    // Supabase Authでアカウント作成
    const signupResponse = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        autoTrial: trialDays > 0,
        trialDays,
        planSource,
        grantedPlan
      }),
    });
    
    const signupResult = await signupResponse.json();
    if (!signupResponse.ok || !signupResult.success) {
      return { 
        success: false, 
        error: signupResult.error || 'アカウントの作成に失敗しました' 
      }
    }

    let message = 'アカウントを作成しました！';
    
    if (trialDays > 0) {
      message = `アカウントを作成しました！期間限定で${trialDays}日間のプレミアム体験をお楽しみください。`;
    }
    
    return { 
      success: true, 
      user: signupResult.user,
      message,
      trialDays
    }
    
  } catch (error) {
    console.error('Auto trial signup error:', error);
    return { success: false, error: 'アカウント作成中にエラーが発生しました' }
  }
}

// =====================================
// ユーザー情報取得
// =====================================
export async function getCurrentUser() {
  try {
    console.log('🔍🔍🔍 getCurrentUser: FUNCTION CALLED - Getting auth user...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('📊 getCurrentUser: Auth result:', { 
      hasUser: !!user, 
      userId: user?.id,
      userEmail: user?.email,
      authError 
    })
    
    if (!user || authError) {
      console.log('❌ getCurrentUser: No user or auth error')
      return { user: null, userData: null }
    }
    
    // APIエンドポイント経由でユーザー情報を取得（RLS回避）
    // キャッシュから取得を試みる（クライアントサイドのみ）
    if (typeof window !== 'undefined') {
      const cachedData = sessionStorage.getItem(`userData_${user.id}`);
      if (cachedData) {
        try {
          const userData = JSON.parse(cachedData);
          // キャッシュが5分以内なら使用
          if (userData._cachedAt && Date.now() - userData._cachedAt < 300000) {
            console.log('✅ getCurrentUser: Using cached user data');
            return { user, userData };
          }
        } catch (e) {
          console.log('⚠️ getCurrentUser: Invalid cache, fetching fresh data');
        }
      }
    }
    
    // API経由でユーザー詳細情報を取得（タイムアウトを5秒に短縮）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒でタイムアウト
    
    try {
      console.log('🔍 getCurrentUser: Fetching user data via API for user:', user.id)
      
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const result = await response.json();
      const userData = result.userData; // APIのレスポンス形式に合わせる
        
      console.log('🔍 getCurrentUser: API response result:', {
        userData,
        hasData: !!userData,
        dataKeys: userData ? Object.keys(userData) : null
      })
      
      console.log('📊 getCurrentUser: User data result:', { 
        hasUserData: !!userData,
        plan: userData?.plan,
        effectivePlan: userData?.effective_plan,
        planSource: userData?.plan_source,
        trialExpiresAt: userData?.trial_expires_at,
        canvasCount: userData?.canvas_count,
        activeTrialCode: userData?.active_trial_code,
        fullUserData: userData
      })
      
      if (userData) {
        console.log('✅ getCurrentUser: Successfully retrieved user data via API')
        // キャッシュに保存（クライアントサイドのみ）
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`userData_${user.id}`, JSON.stringify({
            ...userData,
            _cachedAt: Date.now()
          }));
        }
        return { user, userData }
      } else {
        console.log('⚠️ getCurrentUser: No user data found via API')
      }
    } catch (error) {
      console.warn('⚠️ getCurrentUser: Error fetching user data:', error)
    }
    
    // usersテーブルにデータがない場合はデフォルトプロファイルを返す
    console.log('🔧 getCurrentUser: Creating default profile for user')
    console.log('🔍 getCurrentUser: This should NOT happen if user exists in Supabase!')
    
    // プロモーションコード履歴をチェックして適切なデフォルトプランを設定
    let defaultEffectivePlan = 'free' as const;
    let defaultPlanSource = 'default' as const;
    let trialExpiresAt = null;
    
    
    const defaultProfile = {
      id: user.id,
      email: user.email,
      plan: 'free' as const,
      canvas_count: 0,
      export_count: 0,
      export_reset_date: new Date().toISOString(),
      effective_plan: defaultEffectivePlan,
      plan_source: defaultPlanSource,
      trial_expires_at: trialExpiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('✅ getCurrentUser: Returning default profile')
    return { user, userData: defaultProfile }
    
  } catch (error) {
    console.error('❌ getCurrentUser: Fatal error:', error)
    
    // タイムアウトエラーの場合は、再試行の提案をログに出力
    if (error instanceof Error && error.message.includes('timeout')) {
      console.warn('⚠️ getCurrentUser: Timeout occurred. This might be due to slow network or Supabase issues.')
      console.warn('💡 getCurrentUser: Consider checking your internet connection or Supabase status.')
    }
    
    return { user: null, userData: null }
  }
}

// =====================================
// ログアウト
// =====================================
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Sign out error:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}