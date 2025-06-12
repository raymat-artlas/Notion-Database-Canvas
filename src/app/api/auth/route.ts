import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

interface AccessPassword {
  id: string;
  password: string;
  label: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  usageCount: number;
}

const PASSWORDS_FILE = path.join(process.cwd(), 'data', 'passwords.json');

// パスワードファイルを読み込み
function readPasswordsFile(): AccessPassword[] {
  try {
    if (fs.existsSync(PASSWORDS_FILE)) {
      const data = fs.readFileSync(PASSWORDS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading passwords file:', error);
    return [];
  }
}

// パスワードファイルに書き込み
function writePasswordsFile(passwords: AccessPassword[]) {
  try {
    const dataDir = path.dirname(PASSWORDS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2));
  } catch (error) {
    console.error('Error writing passwords file:', error);
    throw error;
  }
}

// POST: ユーザーID+パスワード認証
export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json();
    
    if (!userId || !password) {
      return NextResponse.json(
        { error: 'UserID and password are required' },
        { status: 400 }
      );
    }

    // デフォルトユーザー（後方互換性のため）
    if (userId === 'demo' && password === 'notion-canvas-2024') {
      return NextResponse.json({ 
        success: true,
        userId: 'demo',
        passwordId: null,
        label: 'デモユーザー'
      });
    }

    let matchedPassword = null;

    // まずSupabaseからユーザーID+パスワードの組み合わせを確認
    try {
      const { data: supabasePasswords, error } = await supabaseAdmin
        .from('access_passwords')
        .select('*')
        .eq('user_id', userId)
        .eq('password', password)
        .eq('is_active', true);

      if (!error && supabasePasswords) {
        // ユーザーID+パスワードが一致し、有効期限内かチェック
        matchedPassword = supabasePasswords.find(p => 
          (!p.expires_at || new Date(p.expires_at) > new Date())
        );

        if (matchedPassword) {
          // 使用回数をカウント
          const { error: updateError } = await supabaseAdmin
            .from('access_passwords')
            .update({ usage_count: matchedPassword.usage_count + 1 })
            .eq('id', matchedPassword.id);

          if (updateError) {
            console.error('Error updating usage count:', updateError);
          }

          return NextResponse.json({ 
            success: true,
            userId: matchedPassword.user_id, // user_idフィールドを返す
            passwordId: matchedPassword.id,
            label: matchedPassword.label
          });
        }
      }
    } catch (supabaseError) {
      console.error('Supabase connection failed, falling back to file:', supabaseError);
    }

    // Supabaseが失敗した場合はファイルをチェック（後方互換性のため）
    const filePasswords = readPasswordsFile();
    matchedPassword = filePasswords.find(p => 
      p.id === userId &&
      p.password === password && 
      p.isActive && 
      (!p.expiresAt || new Date(p.expiresAt) > new Date())
    );

    if (matchedPassword) {
      // 使用回数をカウント（ファイル内のパスワードの場合）
      matchedPassword.usageCount += 1;
      writePasswordsFile(filePasswords);

      return NextResponse.json({ 
        success: true,
        userId: matchedPassword.id, // userIdとして返す
        passwordId: matchedPassword.id,
        label: matchedPassword.label
      });
    }

    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}