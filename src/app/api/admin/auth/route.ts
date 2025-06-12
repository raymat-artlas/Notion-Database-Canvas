import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// POST: 管理者ログイン
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 管理者を検索
    const { data: admin, error: fetchError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (fetchError || !admin) {
      // ログイン試行回数を増やすなどのセキュリティ対策は省略
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // アカウントロックチェック
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return NextResponse.json({ error: 'Account is temporarily locked' }, { status: 423 });
    }

    // パスワード確認
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isPasswordValid) {
      // ログイン試行回数を増やす
      const newAttempts = admin.login_attempts + 1;
      const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // 5回失敗で15分ロック

      await supabase
        .from('admin_users')
        .update({ 
          login_attempts: newAttempts,
          locked_until: lockUntil
        })
        .eq('id', admin.id);

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // ログイン成功 - 試行回数をリセット
    await supabase
      .from('admin_users')
      .update({ 
        login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString()
      })
      .eq('id', admin.id);

    // JWTトークンを生成
    const token = jwt.sign(
      { 
        adminId: admin.id, 
        email: admin.email, 
        role: admin.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response = NextResponse.json({ 
      success: true, 
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

    // HTTPOnlyクッキーにトークンを設定
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24時間
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 管理者ログアウト
export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });
    
    // クッキーを削除
    response.cookies.set('admin-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });

    return response;
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: 管理者認証状態確認
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // 管理者が存在するかチェック
      const { data: admin, error } = await supabase
        .from('admin_users')
        .select('id, email, name, role, is_active')
        .eq('id', decoded.adminId)
        .eq('is_active', true)
        .single();

      if (error || !admin) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }

      return NextResponse.json({ 
        authenticated: true,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      });
    } catch (jwtError) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  } catch (error) {
    console.error('Admin auth check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}