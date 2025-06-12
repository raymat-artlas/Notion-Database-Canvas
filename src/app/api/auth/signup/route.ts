import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      accessCode, 
      autoTrial = false, 
      trialDays = 0, 
      planSource = 'default',
      grantedPlan = 'free'
    } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create user with admin client (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email
    });

    if (authError || !authData.user) {
      console.error('Auth signup error:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    // 自動体験またはシークレットキーの場合、usersテーブルにエントリを作成
    if (autoTrial && trialDays > 0) {
      try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
        
        const { error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            auth_user_id: authData.user.id,
            email: authData.user.email,
            plan: 'free',
            effective_plan: grantedPlan,
            plan_source: planSource,
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
        console.error('Auto trial setup error:', error);
        // エラーでも認証アカウントは作成済みなので続行
      }
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
      message: 'Account created successfully',
      autoTrial,
      trialDays
    });

  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}