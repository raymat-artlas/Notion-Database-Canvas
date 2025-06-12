import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// 共有キャンバスを複製
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/canvas/duplicate - Start');
    const body = await request.json();
    console.log('Duplicate request body:', body);
    
    const { canvasData, userId, newCanvasName } = body;

    if (!canvasData || !userId) {
      console.error('Missing required data:', { hasCanvasData: !!canvasData, hasUserId: !!userId });
      return NextResponse.json(
        { error: 'キャンバスデータとユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // ユーザーのプランをチェック
    console.log('Fetching user data for:', userId);
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('plan, canvas_count, trial_expires_at')
      .eq('id', userId)
      .single();
      
    console.log('User data result:', { user, userError });

    if (userError || !user) {
      console.error('User fetch error:', userError);
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました', details: userError?.message },
        { status: 500 }
      );
    }

    // 無料プランのキャンバス数制限チェック
    const isPremium = user.plan === 'premium' || 
      (user.trial_expires_at && new Date(user.trial_expires_at) > new Date());
    
    if (!isPremium && user.canvas_count >= 3) {
      return NextResponse.json(
        { error: 'キャンバス数の上限に達しています', limitReached: true },
        { status: 403 }
      );
    }

    // 新しいキャンバスIDを生成
    const newCanvasId = uuidv4();
    console.log('Generated new canvas ID:', newCanvasId);

    // データベースとプロパティに新しいIDを割り当て
    const idMapping = new Map<string, string>();
    const newDatabases = canvasData.databases.map((db: any) => {
      const newDbId = uuidv4();
      idMapping.set(db.id, newDbId);
      
      return {
        ...db,
        id: newDbId,
        properties: db.properties.map((prop: any) => {
          const newPropId = uuidv4();
          idMapping.set(prop.id, newPropId);
          return {
            ...prop,
            id: newPropId
          };
        })
      };
    });

    // リレーションのIDを更新
    const newRelations = canvasData.relations.map((rel: any) => ({
      ...rel,
      id: uuidv4(),
      fromDatabaseId: idMapping.get(rel.fromDatabaseId) || rel.fromDatabaseId,
      toDatabaseId: idMapping.get(rel.toDatabaseId) || rel.toDatabaseId,
      fromPropertyId: rel.fromPropertyId ? idMapping.get(rel.fromPropertyId) || rel.fromPropertyId : undefined,
      toPropertyId: rel.toPropertyId ? idMapping.get(rel.toPropertyId) || rel.toPropertyId : undefined
    }));

    // リレーション設定のプロパティIDを更新
    newDatabases.forEach((db: any) => {
      db.properties.forEach((prop: any) => {
        if (prop.relationConfig && prop.relationConfig.linkedPropertyId) {
          prop.relationConfig.linkedPropertyId = 
            idMapping.get(prop.relationConfig.linkedPropertyId) || 
            prop.relationConfig.linkedPropertyId;
        }
        if (prop.relationConfig && prop.relationConfig.targetDatabaseId) {
          prop.relationConfig.targetDatabaseId = 
            idMapping.get(prop.relationConfig.targetDatabaseId) || 
            prop.relationConfig.targetDatabaseId;
        }
      });
    });

    // 複製したキャンバスデータを作成
    const duplicatedCanvasData = {
      ...canvasData,
      databases: newDatabases,
      relations: newRelations,
      canvasInfo: {
        ...canvasData.canvasInfo,
        name: newCanvasName || `${canvasData.canvasInfo?.name || 'キャンバス'} (コピー)`,
        duplicatedFrom: canvasData.canvasInfo?.id || 'unknown',
        duplicatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Supabase Storageに保存
    const fileName = `${userId}/${newCanvasId}.json`;
    const jsonString = JSON.stringify(duplicatedCanvasData, null, 2);
    
    console.log('Uploading to:', fileName);
    console.log('Data size:', jsonString.length, 'bytes');

    const { error: uploadError } = await supabaseAdmin.storage
      .from('canvases')
      .upload(fileName, jsonString, {
        contentType: 'application/json',
        upsert: false
      });
      
    console.log('Upload result:', { uploadError });

    if (uploadError) {
      console.error('Canvas upload error:', uploadError);
      console.error('Upload error details:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode
      });
      return NextResponse.json(
        { error: 'キャンバスの保存に失敗しました', details: uploadError.message },
        { status: 500 }
      );
    }

    // ユーザーのキャンバス数を更新
    console.log('Updating user canvas count from', user.canvas_count, 'to', user.canvas_count + 1);
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ canvas_count: user.canvas_count + 1 })
      .eq('id', userId);
      
    console.log('User update result:', { updateError });

    if (updateError) {
      console.error('User update error:', updateError);
      console.error('User update error details:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details
      });
      // キャンバスを削除してロールバック
      await supabaseAdmin.storage
        .from('canvases')
        .remove([fileName]);
      
      return NextResponse.json(
        { error: 'ユーザー情報の更新に失敗しました', details: updateError.message },
        { status: 500 }
      );
    }
    
    console.log('Canvas duplication completed successfully');

    return NextResponse.json({
      success: true,
      canvasId: newCanvasId,
      message: 'キャンバスが正常に複製されました'
    });

  } catch (error) {
    console.error('Canvas duplicate error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}