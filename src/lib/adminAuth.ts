import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function verifyAdminAuth(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value;
  
  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 管理者の存在確認
    const { data: admin, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('id', decoded.adminId)
      .eq('is_active', true)
      .single();
    
    if (error || !admin) {
      return { authenticated: false, error: 'Admin not found or inactive' };
    }
    
    return { authenticated: true, admin };
  } catch (error) {
    return { authenticated: false, error: 'Invalid token' };
  }
}

export function withAdminAuth(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const auth = await verifyAdminAuth(request);
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: ' + auth.error }, 
        { status: 401 }
      );
    }
    
    // リクエストに管理者情報を追加
    (request as any).admin = auth.admin;
    
    return handler(request, ...args);
  };
}