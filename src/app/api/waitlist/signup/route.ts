import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAutoTrialActive, CAMPAIGN_CONFIG } from '@/lib/campaignConfig';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // キャンペーンが有効かチェック
    if (!isAutoTrialActive()) {
      return NextResponse.json(
        { error: 'キャンペーン期間外です' },
        { status: 400 }
      );
    }

    // 仮パスワード生成（8文字のランダム文字列）
    const tempPassword = Math.random().toString(36).slice(-8);

    // Supabase Authでアカウント作成
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true // メール確認をスキップ
    });

    if (authError || !authData.user) {
      console.error('Auth signup error:', authError);
      
      // 既存アカウントの場合のエラーハンドリング
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: authError?.message || 'アカウント作成に失敗しました' },
        { status: 400 }
      );
    }

    // usersテーブルに体験ユーザー情報を作成
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + CAMPAIGN_CONFIG.autoTrial.trialDays * 24 * 60 * 60 * 1000);
      
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email: authData.user.email,
          plan: 'free',
          effective_plan: 'premium',
          plan_source: 'waitlist_signup',
          trial_expires_at: expiresAt.toISOString(),
          canvas_count: 0,
          export_count: 0,
          export_reset_date: now.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        });

      if (userError) {
        console.error('User creation error:', userError);
        // ユーザー作成エラーでも認証アカウントは作成済みなので続行
      }
    } catch (error) {
      console.error('User data setup error:', error);
      // エラーでも認証アカウントは作成済みなので続行
    }

    // TODO: 実際の実装では、メールでログイン情報を送信
    console.log(`ウェイティングリスト登録完了:`, {
      email,
      tempPassword,
      trialDays: CAMPAIGN_CONFIG.autoTrial.trialDays
    });

    return NextResponse.json({
      success: true,
      message: `アカウントを作成しました！${CAMPAIGN_CONFIG.autoTrial.trialDays}日間のプレミアム体験をお楽しみください。`,
      email,
      // 開発環境では仮パスワードを返す（本番では削除）
      tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined
    });

  } catch (error) {
    console.error('Waitlist signup API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}