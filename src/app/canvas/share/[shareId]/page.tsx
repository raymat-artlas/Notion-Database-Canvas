'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Eye, EyeOff, Copy, Download, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface ShareInfo {
  share_id: string;
  title: string;
  description: string;
  created_at: string;
  creatorEmail?: string;
  requiresPassword: boolean;
}

interface CanvasData {
  databases: any[];
  relations: any[];
  canvasState: any;
  canvasInfo?: any;
  memo?: string;
}

export default function ShareAccessPage() {
  const router = useRouter();
  const params = useParams();
  const shareId = params?.shareId as string;
  const { user } = useAuth();
  
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    if (shareId) {
      fetchShareInfo();
    }
  }, [shareId]);

  const fetchShareInfo = async () => {
    try {
      const response = await fetch(`/api/canvas/share/access?shareId=${shareId}`);
      const data = await response.json();
      
      if (data.success) {
        setShareInfo(data.share);
      } else {
        setError('共有が見つかりません');
      }
    } catch (error) {
      console.error('Failed to fetch share info:', error);
      setError('共有情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const accessShare = async () => {
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/canvas/share/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCanvasData(data.canvasData);
        setAccessGranted(true);
      } else {
        if (data.requiresPassword && !password) {
          setError('パスワードを入力してください');
        } else {
          setError(data.error || 'アクセスに失敗しました');
        }
      }
    } catch (error) {
      console.error('Failed to access share:', error);
      setError('アクセス中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const duplicateCanvas = async () => {
    if (!user || !canvasData) {
      alert('ログインが必要です');
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      console.log('Duplicating canvas with data:', {
        hasCanvasData: !!canvasData,
        userId: user.id,
        canvasDataSize: JSON.stringify(canvasData).length
      });
      
      const response = await fetch('/api/canvas/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasData,
          userId: user.id,
          newCanvasName: `${shareInfo?.title || 'キャンバス'} (コピー)`
        })
      });

      console.log('Duplicate response status:', response.status);
      const data = await response.json();
      console.log('Duplicate response data:', data);
      
      if (data.success) {
        alert('キャンバスを複製しました');
        router.push(`/canvas/${data.canvasId}`);
      } else {
        console.error('Duplication failed:', data);
        if (data.limitReached) {
          alert('キャンバス数の上限に達しています。プレミアムプランにアップグレードしてください。');
        } else {
          const errorMsg = data.error || 'キャンバスの複製に失敗しました';
          const detailMsg = data.details ? `\n詳細: ${data.details}` : '';
          alert(errorMsg + detailMsg);
        }
      }
    } catch (error) {
      console.error('Failed to duplicate canvas:', error);
      console.error('Network or other error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      alert('キャンバスの複製中にエラーが発生しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const downloadAsJson = () => {
    if (!canvasData) return;

    const jsonString = JSON.stringify(canvasData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${shareInfo?.title || 'canvas'}_${shareId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && !shareInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error && !shareInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>戻る</span>
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-2">{shareInfo?.title}</h1>
          {shareInfo?.description && (
            <p className="text-gray-600 mb-4">{shareInfo.description}</p>
          )}
          
          <div className="text-sm text-gray-500 mb-6">
            <p>共有ID: <span className="font-mono font-bold">{shareId}</span></p>
            <p>作成日: {shareInfo && new Date(shareInfo.created_at).toLocaleDateString('ja-JP')}</p>
            {shareInfo?.creatorEmail && (
              <p>作成者: {shareInfo.creatorEmail}</p>
            )}
          </div>

          {!accessGranted ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  パスワード
                </label>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && accessShare()}
                    placeholder="パスワードを入力"
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <button
                onClick={accessShare}
                disabled={loading}
                className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'アクセス中...' : 'アクセス'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  ✓ キャンバスにアクセスしました
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">キャンバス情報</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>データベース数: {canvasData?.databases.length || 0}</p>
                  <p>リレーション数: {canvasData?.relations.length || 0}</p>
                  {canvasData?.canvasInfo?.updatedAt && (
                    <p>最終更新: {new Date(canvasData.canvasInfo.updatedAt).toLocaleDateString('ja-JP')}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={duplicateCanvas}
                  disabled={loading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? '複製中...' : 'マイキャンバスに複製'}
                </button>
                
                <button
                  onClick={downloadAsJson}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center gap-2"
                >
                  <Download size={16} />
                  JSON
                </button>
              </div>

              {canvasData?.memo && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">メモ</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {canvasData.memo}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}