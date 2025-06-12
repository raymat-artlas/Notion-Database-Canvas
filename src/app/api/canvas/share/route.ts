import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// 共有IDを生成する関数
function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let shareId = '';
  for (let i = 0; i < 8; i++) {
    shareId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return shareId;
}

// キャンバスの共有を作成
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/canvas/share - Start');
    const body = await request.json();
    console.log('Request body:', body);
    
    const {
      canvasId,
      userId,
      title,
      description,
      password,
      expiresIn, // 有効期限（時間単位）
      maxAccessCount,
      includeMemo
    } = body;

    if (!canvasId || !userId) {
      return NextResponse.json(
        { error: 'キャンバスIDとユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // 共有IDを生成（重複チェック付き）
    let shareId: string = '';
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      shareId = generateShareId();
      console.log('Generated share ID:', shareId);
      
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('canvas_shares')
        .select('id')
        .eq('share_id', shareId)
        .single();
      
      console.log('Duplicate check result:', { existing, checkError });
      
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique share ID after 10 attempts');
    }

    // パスワードのハッシュ化（設定されている場合）
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // 有効期限の計算
    let expiresAt = null;
    if (expiresIn) {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + expiresIn);
      expiresAt = expirationDate.toISOString();
    }

    // 共有レコードを作成
    const insertData = {
      share_id: shareId,
      canvas_id: canvasId,
      user_id: userId,
      share_password: hashedPassword,
      title: title || `キャンバス共有 - ${new Date().toLocaleDateString('ja-JP')}`,
      description: description || '',
      expires_at: expiresAt,
      max_access_count: maxAccessCount || null,
      include_memo: includeMemo || false,
      is_active: true
    };
    
    console.log('Inserting share data:', insertData);
    
    const { data, error } = await supabaseAdmin
      .from('canvas_shares')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Share creation error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      return NextResponse.json(
        { error: '共有の作成に失敗しました', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('Share created successfully:', data);

    return NextResponse.json({
      success: true,
      shareId: data.share_id,
      shareUrl: `/canvas/share/${data.share_id}`
    });

  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ユーザーの共有一覧を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('canvas_shares')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Shares fetch error:', error);
      return NextResponse.json(
        { error: '共有の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      shares: data || []
    });

  } catch (error) {
    console.error('Shares fetch error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 共有を削除または更新
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { shareId, userId, updates } = body;

    if (!shareId || !userId) {
      return NextResponse.json(
        { error: '共有IDとユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // 権限チェック
    const { data: share } = await supabaseAdmin
      .from('canvas_shares')
      .select('user_id')
      .eq('share_id', shareId)
      .single();

    if (!share || share.user_id !== userId) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // パスワードが更新される場合はハッシュ化
    if (updates.password !== undefined) {
      if (updates.password) {
        updates.share_password = await bcrypt.hash(updates.password, 10);
      } else {
        updates.share_password = null;
      }
      delete updates.password;
    }

    // 共有を更新
    const { error } = await supabaseAdmin
      .from('canvas_shares')
      .update(updates)
      .eq('share_id', shareId);

    if (error) {
      console.error('Share update error:', error);
      return NextResponse.json(
        { error: '共有の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '共有が更新されました'
    });

  } catch (error) {
    console.error('Share update error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 共有を削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');
    const userId = searchParams.get('userId');

    if (!shareId || !userId) {
      return NextResponse.json(
        { error: '共有IDとユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // 権限チェック
    const { data: share } = await supabaseAdmin
      .from('canvas_shares')
      .select('user_id')
      .eq('share_id', shareId)
      .single();

    if (!share || share.user_id !== userId) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // 共有を削除
    const { error } = await supabaseAdmin
      .from('canvas_shares')
      .delete()
      .eq('share_id', shareId);

    if (error) {
      console.error('Share delete error:', error);
      return NextResponse.json(
        { error: '共有の削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '共有が削除されました'
    });

  } catch (error) {
    console.error('Share delete error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}