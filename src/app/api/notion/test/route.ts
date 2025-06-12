import { NextRequest, NextResponse } from 'next/server';
import { testNotionConnection } from '@/lib/notion';
import { getNotionApiKey } from '@/lib/notion-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // リクエストボディにAPIキーがある場合は使用（初回設定時）
    let apiKey = body.apiKey;
    
    // セッションから取得を試みる
    if (!apiKey) {
      apiKey = getNotionApiKey();
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    const result = await testNotionConnection(apiKey);
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to test connection' },
      { status: 500 }
    );
  }
}