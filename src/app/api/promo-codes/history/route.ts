import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // AuthorizationヘッダーからJWTトークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーのプロモーションコード使用履歴を取得
    const { data: history, error: historyError } = await supabaseAdmin
      .from('promo_usage_history')
      .select(`
        *,
        promo_codes (
          code,
          description,
          granted_plan,
          trial_duration_days
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('Error fetching promo history:', historyError);
      return NextResponse.json({ error: 'プロモーションコード履歴の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      history: history || []
    });

  } catch (error) {
    console.error('Promo history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}