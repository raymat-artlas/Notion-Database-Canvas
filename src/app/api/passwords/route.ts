import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { AccessPassword } from '@/lib/supabase';

// GET: パスワード一覧を取得
export async function GET() {
  try {
    const { data: passwords, error } = await supabaseAdmin
      .from('access_passwords')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching passwords:', error);
      return NextResponse.json(
        { error: 'Failed to fetch passwords' },
        { status: 500 }
      );
    }

    // フィールド名をクライアント形式に変換
    const formattedPasswords = passwords.map(p => ({
      id: p.id,
      userId: p.user_id,
      password: p.password,
      label: p.label,
      createdAt: p.created_at,
      expiresAt: p.expires_at,
      isActive: p.is_active,
      usageCount: p.usage_count
    }));

    return NextResponse.json(formattedPasswords);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to read passwords' },
      { status: 500 }
    );
  }
}

// POST: 新しいパスワードを追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Creating password:', body);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const insertData: any = {
      user_id: body.userId,
      password: body.password,
      label: body.label,
      expires_at: body.expiresAt || null,
      is_active: true,
      usage_count: 0
    };

    console.log('Inserting data:', insertData);

    const { data, error } = await supabaseAdmin
      .from('access_passwords')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create password', details: error.message },
        { status: 500 }
      );
    }

    const result = {
      id: data.id,
      userId: data.user_id,
      password: data.password,
      label: data.label,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      isActive: data.is_active,
      usageCount: data.usage_count
    };

    console.log('Password created successfully:', result);
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Server error', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT: パスワードを更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Password ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('access_passwords')
      .update({
        is_active: updates.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating password:', error);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      password: data.password,
      label: data.label,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      isActive: data.is_active,
      usageCount: data.usage_count
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
}

// DELETE: パスワードを削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Password ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('access_passwords')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting password:', error);
      return NextResponse.json(
        { error: 'Failed to delete password' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete password' },
      { status: 500 }
    );
  }
}