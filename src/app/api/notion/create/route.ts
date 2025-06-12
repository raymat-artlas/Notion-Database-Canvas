import { NextRequest, NextResponse } from 'next/server';
import { createNotionDatabases, createNotionClient, createNotionWorkspace } from '@/lib/notion';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Notion export...');
    
    const body = await request.json();
    console.log('📋 Request body received:', JSON.stringify({
      pageId: body.pageId,
      databasesCount: body.databases?.length || 0,
      hasApiKey: !!body.apiKey,
      hasUserId: !!body.userId,
      workspaceName: body.workspaceName
    }, null, 2));
    
    let { pageId, databases, apiKey: bodyApiKey, workspaceName, userId } = body;
    
    // 🔍 CRITICAL DEBUG: Check pageId received from client
    console.log('🔍 pageId received from client:', {
      pageId,
      type: typeof pageId,
      length: pageId?.length,
      isString: typeof pageId === 'string',
      isNotEmpty: pageId && pageId.trim() !== ''
    });
    
    // Input validation
    if (!pageId) {
      console.error('❌ pageId is missing from request body');
      return NextResponse.json(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }
    
    if (typeof pageId !== 'string' || pageId.trim() === '') {
      console.error('❌ pageId is not a valid string:', pageId);
      return NextResponse.json(
        { success: false, error: 'Page ID must be a non-empty string' },
        { status: 400 }
      );
    }
    
    if (!databases || !Array.isArray(databases) || databases.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one database is required' },
        { status: 400 }
      );
    }
    
    console.log('✅ Input validation passed');

    // APIキーがなければuserIdからDB取得
    if (!bodyApiKey && userId) {
      if (!supabaseAdmin) {
        return NextResponse.json(
          { error: 'Database connection error' },
          { status: 500 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('notion_api_key')
        .eq('auth_user_id', userId)
        .single();
      if (error || !data?.notion_api_key) {
        return NextResponse.json(
          { error: 'Notion APIキーが見つかりません。' },
          { status: 401 }
        );
      }
      bodyApiKey = data.notion_api_key;
    }

    if (!bodyApiKey) {
      return NextResponse.json(
        { error: 'Notion APIキーが設定されていません' },
        { status: 401 }
      );
    }

    console.log('🔑 Creating Notion client...');
    const client = createNotionClient(bodyApiKey);
    
    console.log('📊 Starting database creation...');
    console.log('📋 Databases to create:', databases.map(db => ({
      name: db.name,
      id: db.id,
      propertiesCount: db.properties?.length || 0
    })));
    
    let result;
    if (workspaceName) {
      console.log('🏢 Creating workspace:', workspaceName);
      result = await createNotionWorkspace(client, pageId, workspaceName, databases);
    } else {
      console.log('📚 Creating databases directly...');
      result = await createNotionDatabases(client, pageId, databases);
    }
    
    console.log('✅ Database creation completed');
    console.log('📊 Result summary:', {
      success: result.success,
      resultsCount: Object.keys(result.results || {}).length,
      errorsCount: result.errors?.length || 0
    });
    const formattedResults: Record<string, { notionId: string; url: string }> = {};
    Object.entries(result.results).forEach(([dbId, dbInfo]) => {
      formattedResults[dbId] = {
        notionId: (dbInfo as { id: string; url: string }).id,
        url: (dbInfo as { id: string; url: string }).url
      };
    });
    return NextResponse.json({
      success: result.success,
      results: formattedResults,
      errors: result.errors || [],
      warnings: result.warnings || [],
      analysis: {
        supported: result.analysis?.supported || 0,
        skipped: result.analysis?.skipped || 0,
        total: result.analysis?.total || 0
      },
      statusProperties: result.statusProperties
    });
  } catch (error) {
    console.error('Export error:', error);
    
    // Notion API エラーの詳細を抽出
    let errorMessage = 'エクスポート中にエラーが発生しました';
    let notionApiError = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Notion API エラーの場合
      if ((error as any).body) {
        notionApiError = (error as any).body;
        console.error('Notion API Error Body:', JSON.stringify(notionApiError, null, 2));
        
        if (notionApiError.message) {
          errorMessage = `Notion API Error: ${notionApiError.message}`;
        }
      }
    }
    
    // デバッグ情報を含めた詳細なエラーレスポンス
    const errorDetails = {
      success: false,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      notionApiError,
      details: error
    };
    
    console.error('Full error details:', JSON.stringify(errorDetails, null, 2));
    
    return NextResponse.json(
      errorDetails,
      { status: 500 }
    );
  }
}