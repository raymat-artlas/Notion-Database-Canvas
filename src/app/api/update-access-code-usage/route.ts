import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { codeId } = await request.json();

    if (!codeId) {
      return NextResponse.json({ 
        error: 'コードIDが必要です' 
      }, { status: 400 });
    }

    console.log('Updating access code usage for:', codeId);

    // 現在の使用回数を取得
    const { data: currentCode, error: fetchError } = await supabaseAdmin
      .from('access_codes')
      .select('current_uses')
      .eq('id', codeId)
      .single();

    if (fetchError || !currentCode) {
      console.error('Failed to fetch current usage:', fetchError);
      return NextResponse.json({ 
        error: 'コード情報の取得に失敗しました' 
      }, { status: 400 });
    }

    // Service roleでコード使用回数更新
    const { error } = await supabaseAdmin
      .from('access_codes')
      .update({ 
        current_uses: currentCode.current_uses + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', codeId);

    if (error) {
      console.error('Supabase code update error:', error);
      return NextResponse.json({ 
        error: error.message || 'コード使用回数更新に失敗しました' 
      }, { status: 400 });
    }

    console.log('Code usage updated successfully');
    
    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Code update API error:', error);
    return NextResponse.json({ 
      error: 'コード使用回数更新中にエラーが発生しました' 
    }, { status: 500 });
  }
}