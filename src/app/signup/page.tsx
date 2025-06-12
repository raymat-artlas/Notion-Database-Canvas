'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Key, Mail, Lock, UserPlus, ArrowLeft, CheckCircle, AlertCircle, Gift, Clock, Users } from 'lucide-react';
import { createUserWithAccessCode } from '@/lib/auth';
import { useSearchParams } from 'next/navigation';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessCode = searchParams.get('code');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // アクセスコードがない場合はアクセスコードページにリダイレクト
    if (!accessCode) {
      router.push('/access-code');
    }
  }, [accessCode, router]);

  // アカウント作成
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('すべての項目を入力してください');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // アクセスコードを使用してアカウント作成
      const result = await createUserWithAccessCode(
        formData.email,
        formData.password,
        accessCode!
      );
      
      if (result.success) {
        setSuccess(result.message || 'アカウントを作成しました！');
        // 少し待ってからダッシュボードにリダイレクト
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(result.error || 'アカウント作成に失敗しました');
      }
    } catch (error) {
      setError('アカウント作成中にエラーが発生しました');
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

  return (
    <div className="min-h-screen relative bg-gray-50">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900">
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 w-full max-w-lg overflow-hidden">

        {/* ヘッダー */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/access-code"
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
              <span>アクセスコード入力に戻る</span>
            </Link>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl mb-4 shadow-lg">
              <UserPlus className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              ベータアカウント作成
            </h1>
            <p className="text-white/70">
              Notion Database Canvas クローズドベータ版
            </p>
            {accessCode && (
              <div className="mt-3 px-3 py-2 bg-green-500/20 border border-green-400/30 rounded-xl backdrop-blur-sm">
                <p className="text-sm text-green-300">
                  アクセスコード: <span className="font-mono font-medium">{accessCode}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ベータテスター情報 */}
        <div className="mx-8 mt-4 p-4 bg-blue-500/20 border border-blue-400/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-300" />
            <span className="font-semibold text-blue-200">ベータテスター向け</span>
          </div>
          <p className="text-sm text-blue-200">
            正式リリース前の限定アクセスをお試しいただけます。
            有効なアクセスコードでアカウントを作成してください。
          </p>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="mx-8 mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-300" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}
        {success && (
          <div className="mx-8 mt-4 p-3 bg-green-500/20 border border-green-400/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-300" />
              <p className="text-green-300 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* フォーム */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* メールアドレス */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-3">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="email"
                  placeholder="example@example.com"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* パスワード */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-3">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="6文字以上で入力"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* パスワード確認 */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-3">
                パスワード確認
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="パスワードを再入力"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            
            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                isLoading
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>作成中...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <UserPlus size={20} />
                  <span>ベータアカウントを作成</span>
                </div>
              )}
            </button>
          </form>

          {/* ログインリンク */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              既にアカウントをお持ちですか？{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                ログイン
              </Link>
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}