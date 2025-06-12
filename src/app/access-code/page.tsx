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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
        {/* ヘッダー */}
        <div className="px-8 pt-8 pb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft size={20} />
              <span>ホームに戻る</span>
            </Link>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
              <Key className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              テストユーザー認証
            </h1>
            <p className="text-gray-600">
              アクセスコードを入力してください
            </p>
          </div>
        </div>


        {/* エラーメッセージ */}
        {error && (
          <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* フォーム */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* アクセスコード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                アクセスコード
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="アクセスコードを入力"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  autoFocus
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                配布されたアクセスコードを正確に入力してください
              </div>
            </div>
            
            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
              } shadow-lg`}
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
            <p className="text-sm text-gray-500">
              アクセスコードをお持ちでない方は
            </p>
            <Link 
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ウェイトリストにご登録ください
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}