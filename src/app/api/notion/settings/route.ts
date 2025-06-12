import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Notion設定を profiles テーブルで管理

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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

    // usersテーブルからNotion設定を取得
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('notion_api_key')
      .eq('auth_user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // データが存在し、APIキーがある場合のみ返す
    const integration = (data && data.notion_api_key) ? {
      api_key: data.notion_api_key
    } : null;

    return NextResponse.json({ 
      integration 
    });

  } catch (error) {
    console.error('Error fetching Notion settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, apiKey } = body;

    if (!userId || !apiKey) {
      return NextResponse.json(
        { error: 'User ID and API key are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // usersテーブルのNotion設定を更新
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        notion_api_key: apiKey
      })
      .eq('auth_user_id', userId)
      .select('notion_api_key')
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to save Notion settings' },
        { status: 500 }
      );
    }

    console.log(`✅ Updated Notion settings for user: ${userId}`);

    return NextResponse.json({ 
      success: true,
      integration: {
        api_key: data.notion_api_key
      }
    });

  } catch (error) {
    console.error('Error saving Notion settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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

    // usersテーブルのNotion設定をクリア
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        notion_api_key: null
      })
      .eq('auth_user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to remove Notion settings' },
        { status: 500 }
      );
    }

    console.log(`✅ Cleared Notion settings for user: ${userId}`);

    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Error removing Notion settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}