import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/adminAuth';

// GET: 全ユーザー一覧取得（auth.usersとusersテーブルを統合）
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // 1. auth.usersから全ユーザーを取得
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({ error: 'Failed to fetch auth users' }, { status: 500 });
    }

    // 2. usersテーブルから追加情報を取得
    const { data: userProfiles, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*');
      
    if (profileError) {
      console.error('Error fetching user profiles:', profileError);
    }

    // 3. auth.usersとusersテーブルのデータを統合
    const combinedUsers = authUsers?.map(authUser => {
      const profile = userProfiles?.find(p => p.auth_user_id === authUser.id || p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        // usersテーブルの情報を追加
        plan: profile?.plan || 'free',
        effective_plan: profile?.effective_plan || 'free',
        plan_source: profile?.plan_source || 'default',
        canvas_count: profile?.canvas_count || 0,
        export_count: profile?.export_count || 0,
        trial_expires_at: profile?.trial_expires_at,
        active_trial_code: profile?.active_trial_code,
        has_profile: !!profile
      };
    }) || [];

    return NextResponse.json({ users: combinedUsers });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
});

// PUT: プラン管理は今後profiles等で拡張予定
export const PUT = withAdminAuth(async (request: NextRequest) => {
  return NextResponse.json({ error: 'Not implemented. プラン管理はprofiles等で拡張してください。' }, { status: 501 });
});

// DELETE: ユーザー削除（auth.users基準）
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    // Supabase Authユーザー削除
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete auth user' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin user delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
});