import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { code, userType = 'new' } = await request.json();

    if (!code) {
      return NextResponse.json({ 
        valid: false, 
        error: 'アクセスコードが必要です' 
      }, { status: 400 });
    }

    // Service roleでアクセスコード検証
    const { data: accessCode, error } = await supabaseAdmin
      .from('access_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !accessCode) {
      return NextResponse.json({ 
        valid: false, 
        error: 'アクセスコードが見つからないか、無効です' 
      });
    }

    // 個人専用コード（max_uses=1）の場合の使用状況チェック
    if (accessCode.max_uses === 1) {
      const { data: existingUsage } = await supabaseAdmin
        .from('code_usage_history')
        .select('user_id')
        .eq('code_id', accessCode.id)
        .single();

      // 他のユーザーが既に使用している場合は拒否
      if (existingUsage && userType === 'new') {
        return NextResponse.json({ 
          valid: false, 
          error: 'このアクセスコードは既に他のユーザーが使用中です' 
        });
      }
    }

    // 有効期限チェック
    if (accessCode.expires_at) {
      const now = new Date();
      const expiresAt = new Date(accessCode.expires_at);
      
      if (now > expiresAt) {
        return NextResponse.json({ 
          valid: false, 
          error: 'このアクセスコードは有効期限が切れています' 
        });
      }
    }

    return NextResponse.json({ 
      valid: true, 
      accessCode 
    });

  } catch (error) {
    console.error('Access code validation error:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'アクセスコードの検証中にエラーが発生しました' 
    }, { status: 500 });
  }
}