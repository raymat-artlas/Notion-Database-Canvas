import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface CanvasData {
  databases: any[];
  relations: any[];
  canvasState: any;
  canvasInfo?: any;
  memo?: string;
}

// キャンバスをSupabase Storageに保存
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Canvas PUT request started');
    
    const { id: canvasId } = await params;
    console.log('Canvas ID:', canvasId);
    
    const body = await request.json();
    console.log('Request body keys:', Object.keys(body));
    
    const { userId, canvasData }: { userId: string; canvasData: CanvasData } = body;

    if (!userId || !canvasData) {
      console.error('Missing userId or canvasData');
      return NextResponse.json(
        { error: 'ユーザーIDとキャンバスデータが必要です' },
        { status: 400 }
      );
    }

    console.log('UserId:', userId);
    console.log('CanvasData keys:', Object.keys(canvasData));

    // 環境変数の確認
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // JSONデータを準備
    const saveData = {
      ...canvasData,
      updatedAt: new Date().toISOString()
    };

    const jsonString = JSON.stringify(saveData, null, 2);
    const fileName = `${userId}/${canvasId}.json`;
    
    console.log('Attempting to save to:', fileName);

    // Supabase Storageに保存
    console.log('Saving canvas to Supabase Storage:', fileName);
    console.log('Data size:', jsonString.length, 'bytes');
    
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available');
      return NextResponse.json(
        { error: 'データベース接続エラー' },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin.storage
      .from('canvases')
      .upload(fileName, jsonString, {
        contentType: 'application/json',
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json(
        { error: 'キャンバスの保存に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    console.log('Canvas saved successfully to Supabase');
    return NextResponse.json({ 
      success: true, 
      message: 'キャンバスが正常に保存されました',
      updatedAt: saveData.updatedAt
    });

  } catch (error) {
    console.error('Canvas save error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// キャンバスをSupabase Storageから読み込み
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: canvasId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const fileName = `${userId}/${canvasId}.json`;

    // Supabase Storageから読み込み
    console.log('Loading canvas from Supabase Storage:', fileName);
    
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available');
      return NextResponse.json(
        { error: 'データベース接続エラー' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from('canvases')
      .download(fileName);

    if (error) {
      // ファイルが存在しない場合は空のキャンバスデータを返す
      if (error.message?.includes('not found')) {
        console.log('Canvas file not found, returning empty canvas');
        const defaultCanvasData = {
          databases: [],
          relations: [],
          canvasState: { zoom: 1, panX: 0, panY: 0, selectedIds: [] },
          canvasInfo: null,
          memo: '',
          updatedAt: new Date().toISOString()
        };
        
        return NextResponse.json({ 
          success: true,
          canvasData: defaultCanvasData
        });
      }
      
      console.error('Storage download error:', error);
      return NextResponse.json(
        { error: 'キャンバスの読み込みに失敗しました', details: error.message },
        { status: 500 }
      );
    }

    // BlobからJSONテキストを読み取り
    const jsonText = await data.text();
    const canvasData = JSON.parse(jsonText);

    console.log('Canvas loaded successfully from Supabase');
    return NextResponse.json({ 
      success: true,
      canvasData
    });

  } catch (error) {
    console.error('Canvas load error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// キャンバスをSupabase Storageから削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: canvasId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const fileName = `${userId}/${canvasId}.json`;

    // Supabase Storageから削除
    console.log('Deleting canvas from Supabase Storage:', fileName);
    
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available');
      return NextResponse.json(
        { error: 'データベース接続エラー' },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin.storage
      .from('canvases')
      .remove([fileName]);

    if (error) {
      console.error('Storage delete error:', error);
      return NextResponse.json(
        { error: 'キャンバスの削除に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    console.log('Canvas deleted successfully from Supabase');
    return NextResponse.json({ 
      success: true,
      message: 'キャンバスが正常に削除されました'
    });

  } catch (error) {
    console.error('Canvas delete error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}