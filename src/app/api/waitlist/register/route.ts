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
    try {
      await sendWelcomeEmail(email);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // メール送信が失敗してもウェイトリスト登録は成功とする
    }

    return NextResponse.json({
      success: true,
      message: 'ウェイトリストに登録しました！正式リリース時にご連絡いたします。',
      email: data.email
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
  // Resendを使用する場合
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Notion Database Canvas <noreply@artlas.jp>',
        to: email,
        subject: 'ウェイトリスト登録ありがとうございます！',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Notion Database Canvasへようこそ！</h1>
            
            <p>この度は、Notion Database Canvasのウェイトリストにご登録いただき、誠にありがとうございます。</p>
            
            <p>正式リリース時には、以下の特典をご用意しています：</p>
            <ul>
              <li>🎁 30日間の無料トライアル</li>
              <li>🚀 早期アクセス権</li>
              <li>💰 特別割引価格（¥320/月）</li>
            </ul>
            
            <p>リリースまでもう少しお待ちください。準備が整い次第、優先的にご案内いたします。</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #666; font-size: 14px;">
              このメールは ${email} 宛に送信されました。<br>
              心当たりがない場合は、このメールを削除してください。
            </p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }
  }
}