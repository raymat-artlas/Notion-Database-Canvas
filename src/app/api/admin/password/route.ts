import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: 管理者パスワード取得
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('access_codes')
      .select('description')
      .eq('code', 'ADMIN_PASSWORD_SETTING')
      .single();

    if (error || !data) {
      console.error('Failed to fetch admin password:', error);
      return NextResponse.json({ error: 'Password not found' }, { status: 404 });
    }

    return NextResponse.json({ password: data.description });
  } catch (error) {
    console.error('Error fetching admin password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: 管理者パスワード更新
export async function PUT(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('admin_settings')
      .update({ setting_value: password })
      .eq('setting_key', 'admin_password');

    if (error) {
      console.error('Failed to update admin password:', error);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating admin password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}