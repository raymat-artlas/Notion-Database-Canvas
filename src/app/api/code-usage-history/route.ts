import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const historyData = await request.json();

    console.log('Creating code usage history:', historyData);

    // Service roleで履歴作成（RLS制限を回避）
    const { data, error } = await supabaseAdmin
      .from('code_usage_history')
      .insert(historyData)
      .select()
      .single();

    if (error) {
      console.error('Supabase history creation error:', error);
      return NextResponse.json({ 
        error: error.message || '履歴作成に失敗しました' 
      }, { status: 400 });
    }

    console.log('History created successfully:', data);
    
    return NextResponse.json({ 
      success: true, 
      history: data 
    });

  } catch (error) {
    console.error('History creation API error:', error);
    return NextResponse.json({ 
      error: '履歴作成中にエラーが発生しました' 
    }, { status: 500 });
  }
}