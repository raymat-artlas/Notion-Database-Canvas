'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Key, ArrowLeft, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { validateAccessCode } from '@/lib/auth';

export default function AccessCodePage() {
  const router = useRouter();
  
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      setError('アクセスコードを入力してください');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await validateAccessCode(accessCode.trim(), 'new');
      
      if (result.valid) {
        // アクセスコードが有効な場合、サインアップページにリダイレクト
        router.push(`/signup?code=${encodeURIComponent(accessCode.trim())}`);
      } else {
        setError(result.error || '無効なアクセスコードです');
      }
    } catch (error) {
      setError('アクセスコードの検証中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-gray-50">
      {/* Background Gradient - similar to main page */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900">
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 w-full max-w-md overflow-hidden">
          {/* ヘッダー */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center justify-between mb-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                <ArrowLeft size={20} />
                <span>ホームに戻る</span>
              </Link>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
                <Key className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                テストユーザー認証
              </h1>
              <p className="text-white/80">
                アクセスコードを入力してください
              </p>
            </div>
          </div>


          {/* エラーメッセージ */}
          {error && (
            <div className="mx-8 mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-300" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* フォーム */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* アクセスコード */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">
                  アクセスコード
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
                  <input
                    type="text"
                    placeholder="アクセスコードを入力"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    required
                    autoFocus
                  />
                </div>
                <div className="mt-2 text-xs text-white/60">
                  配布されたアクセスコードを正確に入力してください
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
                    <span>確認中...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle size={20} />
                    <span>アクセスコードを確認</span>
                  </div>
                )}
              </button>
            </form>

            {/* ヘルプテキスト */}
            <div className="mt-6 text-center">
              <p className="text-sm text-white/60">
                アクセスコードをお持ちでない方は
              </p>
              <Link 
                href="/#waitlist"
                className="text-sm text-purple-400 hover:text-purple-300 font-medium"
              >
                ウェイトリストにご登録ください
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}