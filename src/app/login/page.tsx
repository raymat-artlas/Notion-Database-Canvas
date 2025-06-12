'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
// import NotificationModal from '@/components/UI/NotificationModal';
// import { useNotification } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  // const { notification, closeNotification, showError, showSuccess } = useNotification();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // URLパラメータからエラーメッセージを取得
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'account_deleted') {
      setErrorMessage('アカウントが削除されています。新しくアカウントを作成してください。');
    } else if (error === 'invalid_token') {
      setErrorMessage('セッションの有効期限が切れました。再度ログインしてください。');
    }
  }, [searchParams]);

  // 既にログイン済みの場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // エラーメッセージをクリア
    setErrorMessage('');
    
    if (!formData.email || !formData.password) {
      setErrorMessage('入力エラー: メールアドレスとパスワードの両方を入力してください。');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 開発環境でのみログを表示
      if (process.env.NODE_ENV === 'development') {
        console.log('Attempting login for:', formData.email)
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      
      // 開発環境でのみログを表示
      if (process.env.NODE_ENV === 'development') {
        console.log('Login response:', { data, error })
      }
      
      if (error) {
        // エラーは予期される動作なので、開発環境でもconsole.errorは使わない
        let errorMessage = 'ログインできませんでした';
        let errorDetail = '';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'ログインできませんでした';
          errorDetail = 'メールアドレスまたはパスワードが正しくありません。';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'メール認証が必要です';
          errorDetail = '登録時に送信された確認メールから、メールアドレスの認証を完了してください。';
        } else if (error.message.includes('User not found')) {
          errorMessage = 'アカウントが見つかりません';
          errorDetail = '入力されたメールアドレスのアカウントは存在しません。';
        } else if (error.message.includes('Network')) {
          errorMessage = 'ネットワークエラー';
          errorDetail = 'インターネット接続を確認してください。';
        } else {
          errorDetail = error.message || '予期しないエラーが発生しました。';
        }
        
        // エラーメッセージを状態にセット（alertの代わり）
        setErrorMessage(`${errorMessage}${errorDetail ? ': ' + errorDetail : ''}`);
        return;
      }
      
      if (data.user) {
        router.push('/dashboard');
      }
    } catch (error) {
      // 開発環境でのみログを表示
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error:', error);
      }
      // エラーメッセージを状態にセット（alertの代わり）
      setErrorMessage('ログイン処理でエラーが発生しました。しばらく待ってから再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
        {/* ヘッダー */}
        <div className="px-8 pt-8 pb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
              <LogIn className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ログイン
            </h1>
            <p className="text-gray-600">
              Database Canvasにアクセス
            </p>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-8">
          {/* エラーメッセージ表示 */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-shake">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="text-red-600" size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    {errorMessage.split(':')[0]}
                  </h4>
                  {errorMessage.includes(':') && (
                    <p className="text-sm text-red-700">
                      {errorMessage.split(':')[1].trim()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
            {/* メールアドレス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* パスワード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="パスワード"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>


            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ログイン中...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  ログイン
                </>
              )}
            </button>
          </form>
        </div>

        {/* フッター */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-4">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              アカウント作成
            </Link>
          </p>
          
          <div className="pt-4 border-t border-gray-200">
            <Link href="/" className="text-xs text-blue-600 hover:text-blue-700">
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}