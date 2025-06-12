import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: accessCodes, error } = await supabaseAdmin
      .from('access_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching access codes:', error);
      return NextResponse.json({ error: 'Failed to fetch access codes' }, { status: 500 });
    }

    return NextResponse.json({ accessCodes });
  } catch (error) {
    console.error('Access codes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/admin/access-codes - Starting');
    
    const body = await request.json();
    console.log('Received body:', body);
    
    const {
      code,
      description,
      trial_duration_days = 0,
      granted_plan = 'premium',
      max_uses = 1,
      one_time_per_user = false,
      expires_at
    } = body;

    console.log('Parsed data:', {
      code,
      description,
      trial_duration_days,
      granted_plan,
      max_uses,
      one_time_per_user,
      expires_at
    });

    if (!code || !description) {
      console.log('Validation failed: missing code or description');
      return NextResponse.json({ error: 'Code and description are required' }, { status: 400 });
    }

    const insertData = {
      code,
      name: description, // nameカラムが必須の場合はdescriptionと同じ値を設定
      description,
      trial_duration_days,
      granted_plan,
      max_uses,
      current_uses: 0,
      one_time_per_user,
      expires_at: expires_at || null,
      is_active: true
    };
    
    console.log('Inserting data:', insertData);

    const { data: accessCode, error } = await supabaseAdmin
      .from('access_codes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating access code:', error);
      return NextResponse.json({ 
        error: 'Failed to create access code', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    console.log('Access code created successfully:', accessCode);
    return NextResponse.json({ accessCode });
  } catch (error) {
    console.error('Create access code API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('access_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting access code:', error);
      return NextResponse.json({ error: 'Failed to delete access code' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete access code API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}