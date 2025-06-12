import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();

    console.log('Creating user with data:', userData);

    // Service roleでユーザー作成（RLS制限を回避）
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('Supabase user creation error:', error);
      return NextResponse.json({ 
        error: error.message || 'ユーザー作成に失敗しました' 
      }, { status: 400 });
    }

    console.log('User created successfully:', data);
    
    return NextResponse.json({ 
      success: true, 
      user: data 
    });

  } catch (error) {
    console.error('User creation API error:', error);
    return NextResponse.json({ 
      error: 'ユーザー作成中にエラーが発生しました' 
    }, { status: 500 });
  }
}