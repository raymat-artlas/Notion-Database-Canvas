import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// 共有キャンバスにアクセス（パスワード検証付き）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shareId, password } = body;

    if (!shareId) {
      return NextResponse.json(
        { error: '共有IDが必要です' },
        { status: 400 }
      );
    }

    // 共有情報を取得
    const { data: share, error } = await supabaseAdmin
      .from('canvas_shares')
      .select('*')
      .eq('share_id', shareId)
      .single();

    if (error || !share) {
      return NextResponse.json(
        { error: '共有が見つかりません' },
        { status: 404 }
      );
    }

    // 共有の有効性をチェック
    if (!share.is_active) {
      return NextResponse.json(
        { error: 'この共有は無効です' },
        { status: 403 }
      );
    }

    // 有効期限チェック
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'この共有は有効期限が切れています' },
        { status: 403 }
      );
    }

    // アクセス回数チェック
    if (share.max_access_count && share.access_count >= share.max_access_count) {
      return NextResponse.json(
        { error: 'この共有はアクセス回数の上限に達しています' },
        { status: 403 }
      );
    }

    // パスワードチェック
    if (share.share_password) {
      if (!password) {
        return NextResponse.json(
          { error: 'パスワードが必要です', requiresPassword: true },
          { status: 401 }
        );
      }

      const isValidPassword = await bcrypt.compare(password, share.share_password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'パスワードが正しくありません', requiresPassword: true },
          { status: 401 }
        );
      }
    }

    // アクセス回数を増やす
    await supabaseAdmin
      .from('canvas_shares')
      .update({ access_count: share.access_count + 1 })
      .eq('share_id', shareId);

    // アクセス履歴を記録
    const headers = request.headers;
    await supabaseAdmin
      .from('canvas_share_accesses')
      .insert({
        share_id: shareId,
        ip_address: headers.get('x-forwarded-for') || headers.get('x-real-ip') || null,
        user_agent: headers.get('user-agent') || null
      });

    // キャンバスデータを取得
    const fileName = `${share.user_id}/${share.canvas_id}.json`;
    const { data: canvasBlob, error: downloadError } = await supabaseAdmin.storage
      .from('canvases')
      .download(fileName);

    if (downloadError || !canvasBlob) {
      console.error('Canvas download error:', downloadError);
      return NextResponse.json(
        { error: 'キャンバスデータの取得に失敗しました' },
        { status: 500 }
      );
    }

    // キャンバスデータを解析
    const canvasText = await canvasBlob.text();
    const canvasData = JSON.parse(canvasText);

    // メモを除外する場合
    if (!share.include_memo) {
      // データベースのメモを削除
      if (canvasData.databases) {
        canvasData.databases = canvasData.databases.map((db: any) => ({
          ...db,
          memo: undefined
        }));
      }
      // プロパティのメモを削除
      if (canvasData.databases) {
        canvasData.databases.forEach((db: any) => {
          if (db.properties) {
            db.properties = db.properties.map((prop: any) => ({
              ...prop,
              memo: undefined
            }));
          }
        });
      }
      // キャンバス全体のメモを削除
      if (canvasData.memo !== undefined) {
        delete canvasData.memo;
      }
    }

    return NextResponse.json({
      success: true,
      share: {
        title: share.title,
        description: share.description,
        created_at: share.created_at
      },
      canvasData
    });

  } catch (error) {
    console.error('Share access error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 共有の基本情報を取得（パスワード不要）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: '共有IDが必要です' },
        { status: 400 }
      );
    }

    // 共有情報を取得（パスワードは除外）
    const { data: share, error } = await supabaseAdmin
      .from('canvas_shares')
      .select('share_id, title, description, created_at, user_id')
      .eq('share_id', shareId)
      .single();

    if (error || !share) {
      return NextResponse.json(
        { error: '共有が見つかりません' },
        { status: 404 }
      );
    }

    // 共有作成者の情報を取得
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', share.user_id)
      .single();

    return NextResponse.json({
      success: true,
      share: {
        ...share,
        requiresPassword: true, // クライアント側でパスワード入力を表示するため常にtrue
        creatorEmail: user?.email
      }
    });

  } catch (error) {
    console.error('Share info error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}