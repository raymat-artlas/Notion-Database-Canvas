import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // AuthorizationヘッダーからJWTトークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'プロモーションコードを入力してください' }, { status: 400 });
    }

    // プロモーションコードを検証
    const { data: promoCode, error: promoError } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (promoError || !promoCode) {
      return NextResponse.json({ error: '無効なプロモーションコードです' }, { status: 400 });
    }

    // 有効期限チェック
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'このプロモーションコードは有効期限切れです' }, { status: 400 });
    }

    // 使用回数チェック
    if (promoCode.current_uses >= promoCode.max_uses) {
      return NextResponse.json({ error: 'このプロモーションコードは使用上限に達しています' }, { status: 400 });
    }

    // 1回限りのコードの場合、既に使用されているかチェック
    if (promoCode.one_time_per_user) {
      const { data: existingUsage } = await supabaseAdmin
        .from('promo_usage_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('promo_code_id', promoCode.id)
        .single();

      if (existingUsage) {
        return NextResponse.json({ error: '既にこのプロモーションコードを使用しています' }, { status: 400 });
      }
    }

    // プロモーションコードを適用
    const expiresAt = promoCode.trial_duration_days 
      ? new Date(Date.now() + promoCode.trial_duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // ユーザー情報を更新
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        effective_plan: promoCode.granted_plan,
        plan_source: 'promo_code',
        trial_expires_at: expiresAt,
        active_trial_code: code.toUpperCase(),
        active_promo_code_id: promoCode.id,
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', user.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json({ error: 'プロモーションコードの適用に失敗しました' }, { status: 500 });
    }

    // 使用履歴を記録
    const { error: historyError } = await supabaseAdmin
      .from('promo_usage_history')
      .insert({
        user_id: user.id,
        promo_code_id: promoCode.id,
        code: code.toUpperCase(),
        granted_plan: promoCode.granted_plan,
        trial_duration_days: promoCode.trial_duration_days,
        expires_at: expiresAt,
        status: 'active'
      });

    if (historyError) {
      console.error('Error recording usage history:', historyError);
    }

    // 使用回数を更新
    const { error: incrementError } = await supabaseAdmin
      .from('promo_codes')
      .update({
        current_uses: promoCode.current_uses + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', promoCode.id);

    if (incrementError) {
      console.error('Error incrementing usage:', incrementError);
    }

    // 更新されたユーザー情報を取得して返す
    const { data: updatedUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    return NextResponse.json({ 
      success: true,
      message: promoCode.trial_duration_days 
        ? `${promoCode.trial_duration_days}日間のプレミアム体験を開始しました！`
        : 'プロモーションコードが適用されました！',
      grantedPlan: promoCode.granted_plan,
      trialDays: promoCode.trial_duration_days,
      expiresAt,
      userData: updatedUser // 更新されたユーザーデータを返す
    });

  } catch (error) {
    console.error('Promo code validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}