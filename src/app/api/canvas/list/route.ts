import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ユーザーのキャンバス一覧をSupabase Storageから取得
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

    // ユーザーフォルダ内のファイル一覧を取得
    const { data: files, error } = await supabase.storage
      .from('canvases')
      .list(userId, {
        limit: 100,
        sortBy: { column: 'updated_at', order: 'desc' }
      });

    if (error) {
      console.error('Storage list error:', error);
      return NextResponse.json(
        { error: 'キャンバス一覧の取得に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    // JSONファイルのみをフィルタし、キャンバス情報を抽出
    const canvases = [];
    
    for (const file of files || []) {
      if (file.name.endsWith('.json')) {
        try {
          // ファイルをダウンロードしてcanvasInfoを取得
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('canvases')
            .download(`${userId}/${file.name}`);

          if (downloadError) {
            console.error(`Failed to download ${file.name}:`, downloadError);
            continue;
          }

          const jsonString = await fileData.text();
          const canvasData = JSON.parse(jsonString);
          
          // canvasInfoがある場合は使用、ない場合でも正しいフォールバック
          if (canvasData.canvasInfo) {
            canvases.push({
              ...canvasData.canvasInfo,
              updatedAt: canvasData.updatedAt || file.updated_at
            });
          } else {
            // フォールバック: ファイル名からIDを抽出
            const canvasId = file.name.replace('.json', '');
            canvases.push({
              id: canvasId,
              name: canvasData.name || `キャンバス ${canvasId.slice(-8)}`,
              description: canvasData.description || '',
              createdAt: canvasData.createdAt || file.created_at,
              updatedAt: canvasData.updatedAt || file.updated_at,
              isActive: canvasData.isActive !== undefined ? canvasData.isActive : true
            });
          }
        } catch (parseError) {
          console.error(`Failed to parse ${file.name}:`, parseError);
          continue;
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      canvases: canvases.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    });

  } catch (error) {
    console.error('Canvas list error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}