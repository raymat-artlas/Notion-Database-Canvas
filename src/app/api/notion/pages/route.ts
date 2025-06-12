import { NextRequest, NextResponse } from 'next/server';
import { getNotionPages } from '@/lib/notion';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required.' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // DBからAPIキーを取得
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('notion_api_key')
      .eq('auth_user_id', userId)
      .single();

    if (error || !data?.notion_api_key) {
      return NextResponse.json(
        { success: false, error: 'Notion APIキーが見つかりません。' },
        { status: 400 }
      );
    }

    const result = await getNotionPages(data.notion_api_key);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pages', pages: [] },
      { status: 500 }
    );
  }
}