import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // メールアドレスの簡単なバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // ウェイトリストに追加
    console.log('Attempting to insert email:', email.toLowerCase().trim());
    
    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .insert({
        email: email.toLowerCase().trim(),
        source: 'website',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // 重複エラーの場合
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 400 }
        );
      }
      
      console.error('Waitlist registration error:', error);
      return NextResponse.json(
        { error: '登録に失敗しました。もう一度お試しください。' },
        { status: 500 }
      );
    }

    // ウェルカムメールを送信
    let emailSent = false;
    let emailError = null;
    
    try {
      console.log('📧 Sending welcome email to:', email);
      await sendWelcomeEmail(email);
      console.log('✅ Welcome email sent successfully');
      emailSent = true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      emailError = error instanceof Error ? error.message : 'Unknown email error';
      // メール送信が失敗してもウェイトリスト登録は成功とする
    }

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'ウェイトリストに登録しました！確認メールをお送りしました。' 
        : 'ウェイトリストに登録しました！（メール送信でエラーが発生しましたが、登録は完了しています）',
      email: data.email,
      emailSent,
      emailError: emailSent ? null : emailError
    });

  } catch (error) {
    console.error('Waitlist registration API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ウェルカムメール送信関数
async function sendWelcomeEmail(email: string) {
  try {
    // Resendを使用する場合
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    console.log('🔑 Using Resend API key:', process.env.RESEND_API_KEY ? 'Found' : 'Not found');
    
    const emailPayload = {
      from: 'Notion Database Canvas <onboarding@resend.dev>',  // Resendのデフォルトドメインを使用
      to: email,
      subject: 'ウェイトリスト登録ありがとうございます！',
      html: getWelcomeEmailHtml(email)
    };
    
    console.log('📤 Email payload:', { ...emailPayload, html: '[HTML_CONTENT]' });
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify(emailPayload)
    });

    console.log('📬 Resend API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Resend API error:', errorText);
      throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Resend API success:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in sendWelcomeEmail:', error);
    throw error;
  }
}

function getWelcomeEmailHtml(email: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Notion Database Canvas</h1>
        <p style="color: #6b7280; margin: 8px 0 0 0;">ビジュアルデータベース設計ツール</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); padding: 30px; border-radius: 12px; color: white; text-align: center; margin-bottom: 30px;">
        <h2 style="margin: 0 0 16px 0; font-size: 24px;">ウェイトリスト登録完了！</h2>
        <p style="margin: 0; opacity: 0.9;">ご登録いただき、誠にありがとうございます</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #374151; margin: 0 0 16px 0;">🎁 早期登録者特典</h3>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li style="margin-bottom: 8px;"><strong>30日間無料トライアル</strong> - 全機能をお試しいただけます</li>
            <li style="margin-bottom: 8px;"><strong>優先アクセス権</strong> - 正式リリース時に最優先でご案内</li>
            <li style="margin-bottom: 8px;"><strong>特別価格</strong> - 通常¥500/月 → <span style="color: #8b5cf6; font-weight: bold;">¥320/月</span></li>
          </ul>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #374151; margin: 0 0 16px 0;">🚀 Notion Database Canvasとは？</h3>
        <p style="color: #6b7280; line-height: 1.6; margin: 0;">
          複雑なNotionデータベースを直感的に設計できるビジュアルツールです。ドラッグ&ドロップでテーブル構造を作成し、ワンクリックでNotionに展開できます。
        </p>
      </div>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="https://notion-database-canvas.vercel.app" 
           style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          デモを試してみる
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
      
      <div style="text-align: center;">
        <p style="color: #9ca3af; font-size: 14px; margin: 0;">
          このメールは ${email} 宛に送信されました。<br>
          心当たりがない場合は、このメールを削除してください。
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">
          © 2024 Notion Database Canvas. All rights reserved.
        </p>
      </div>
    </div>
  `;
}
