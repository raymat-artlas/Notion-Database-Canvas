import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが必要です' }, { status: 400 });
    }

    console.log('🧪 Test email API called for:', email);
    console.log('🔑 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('🔑 RESEND_API_KEY value:', process.env.RESEND_API_KEY);

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const emailPayload = {
      from: 'Test <onboarding@resend.dev>',
      to: email,
      subject: 'Test Email from Notion Database Canvas',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify Resend integration.</p>
        <p>Time: ${new Date().toISOString()}</p>
      `
    };

    console.log('📤 Sending test email with payload:', emailPayload);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify(emailPayload)
    });

    console.log('📬 Resend response status:', response.status);
    console.log('📬 Resend response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📬 Resend response body:', responseText);

    if (!response.ok) {
      return NextResponse.json({
        error: 'Failed to send email',
        status: response.status,
        details: responseText
      }, { status: 500 });
    }

    const result = JSON.parse(responseText);
    console.log('✅ Email sent successfully:', result);

    return NextResponse.json({
      success: true,
      result,
      message: 'Test email sent successfully'
    });

  } catch (error) {
    console.error('❌ Test email error:', error);
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}