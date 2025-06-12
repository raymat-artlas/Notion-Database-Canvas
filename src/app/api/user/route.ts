import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: ユーザープロフィール情報取得（profiles基準）
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // AuthorizationヘッダーからJWTトークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      // トークンが無効な場合、URLパラメータからuserIdを取得
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }
      
      // デフォルトプロファイルを返す
      const defaultProfile = {
        id: userId,
        email: null,
        plan: 'free',
        canvas_count: 0,
        export_count: 0,
        export_reset_date: new Date().toISOString(),
        effective_plan: 'free',
        plan_source: 'default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return NextResponse.json({ userData: defaultProfile });
    }
    
    // usersテーブルからユーザー情報取得
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();
      
    if (error || !profile) {
      // プロフィールが存在しない場合、デフォルトプロファイルを返す
      console.log('Profile not found, returning default profile for user:', user.id)
      
      const defaultProfile = {
        id: user.id,
        email: user.email,
        plan: 'free',
        canvas_count: 0,
        export_count: 0,
        export_reset_date: new Date().toISOString(),
        effective_plan: 'free',
        plan_source: 'default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return NextResponse.json({ userData: defaultProfile });
    }
    
    return NextResponse.json({ userData: profile });
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json(
      { error: 'Failed to get user information' },
      { status: 500 }
    );
  }
}

// POST: プロフィール情報更新
export async function POST(request: NextRequest) {
  try {
    const { userId, updates } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    // usersテーブルを更新
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', userId)
      .select()
      .single();
      
    if (error) {
      console.error('Profile update error:', error);
      // プロフィールが存在しない場合は作成を試みる
      if (error.code === 'PGRST116') {
        console.log('Profile not found, creating new profile for user:', userId);
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            auth_user_id: userId,
            ...updates,
            plan: updates.plan || 'free',
            canvas_count: updates.canvas_count || 0,
            export_count: updates.export_count || 0,
            export_reset_date: updates.export_reset_date || new Date().toISOString(),
            effective_plan: updates.effective_plan || 'free',
            plan_source: updates.plan_source || 'default',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (createError) {
          console.error('Profile creation error:', createError);
          return NextResponse.json(
            { error: 'Failed to create profile' },
            { status: 500 }
          );
        }
        
        return NextResponse.json({ user: newProfile, success: true });
      }
      
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ user: profile, success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// 来月の開始日を取得
function getNextMonthStart(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}