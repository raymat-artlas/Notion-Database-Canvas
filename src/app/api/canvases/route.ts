import { NextRequest, NextResponse } from 'next/server';

// GET: キャンバス一覧を取得（ローカルストレージ用のダミー）
export async function GET(request: NextRequest) {
  try {
    // ローカルストレージベースなので、ダミーのキャンバス情報を返す
    const dummyCanvas = {
      id: 'local-canvas',
      name: 'ローカルキャンバス',
      description: 'ローカルストレージに保存されるキャンバス',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };

    return NextResponse.json([dummyCanvas]);
  } catch (error) {
    console.error('Error fetching canvases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canvases' },
      { status: 500 }
    );
  }
}

// POST: 新しいキャンバスを作成（ローカルストレージ用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Creating canvas with data:', body); // デバッグログ
    
    // ユーザーが指定した名前と説明を使用
    const newCanvas = {
      id: crypto.randomUUID(),
      name: body.name || 'Untitled Canvas',
      description: body.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };

    console.log('Returning canvas:', newCanvas); // デバッグログ

    return NextResponse.json(newCanvas, { status: 201 });
  } catch (error) {
    console.error('Error creating canvas:', error);
    return NextResponse.json(
      { error: 'Failed to create canvas' },
      { status: 500 }
    );
  }
}

// DELETE: キャンバスを削除（ローカルストレージ用のダミー）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Canvas ID is required' },
        { status: 400 }
      );
    }

    console.log('Deleting canvas with ID:', id); // デバッグログ

    // ローカルストレージベースなので、常に成功を返す
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting canvas:', error);
    return NextResponse.json(
      { error: 'Failed to delete canvas' },
      { status: 500 }
    );
  }
}

