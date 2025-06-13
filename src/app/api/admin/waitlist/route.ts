import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Fetching waitlist from Supabase...');
    const { data: waitlist, error } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('📊 Waitlist query result:', { 
      count: waitlist?.length || 0, 
      error: error?.message,
      sampleData: waitlist?.[0] 
    });

    if (error) {
      console.error('Error fetching waitlist:', error);
      return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
    }

    return NextResponse.json({ waitlist });
  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}