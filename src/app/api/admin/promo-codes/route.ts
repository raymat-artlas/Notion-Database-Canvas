import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAdminAuth } from '@/lib/adminAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// GET: プロモーションコード一覧取得
export const GET = withAdminAuth(async () => {
  try {
    const { data: promoCodes, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch promo codes:', error);
      return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 });
    }

    return NextResponse.json({ promoCodes });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// POST: プロモーションコード作成
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      code,
      description,
      trial_duration_days,
      granted_plan,
      max_uses,
      one_time_per_user,
      expires_at
    } = body;

    // バリデーション
    if (!code || !description) {
      return NextResponse.json({ error: 'Code and description are required' }, { status: 400 });
    }

    const insertData = {
      code,
      description,
      trial_duration_days: trial_duration_days || 30,
      granted_plan: granted_plan || 'premium',
      max_uses: max_uses || 100,
      current_uses: 0,
      one_time_per_user: one_time_per_user ?? true,
      expires_at: expires_at || null,
      is_active: true
    };

    const { data, error } = await supabase
      .from('promo_codes')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Failed to create promo code:', error);
      
      // 重複エラーの場合
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create promo code',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating promo code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// PUT: プロモーションコード更新
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      id,
      code,
      description,
      trial_duration_days,
      granted_plan,
      max_uses,
      one_time_per_user,
      expires_at,
      is_active
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updateData = {
      code,
      description,
      trial_duration_days,
      granted_plan,
      max_uses,
      one_time_per_user,
      expires_at,
      is_active
    };

    // undefinedの値を除去
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const { data, error } = await supabase
      .from('promo_codes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update promo code:', error);
      return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating promo code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// DELETE: プロモーションコード削除
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete promo code:', error);
      return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});