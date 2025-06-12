import React, { useState, useEffect } from 'react';
import { X, Copy, Trash2, Eye, EyeOff, Clock, Users, Link } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
  canvasName?: string;
}

interface CanvasShare {
  share_id: string;
  canvas_id: string;
  title: string;
  description: string;
  is_active: boolean;
  expires_at: string | null;
  access_count: number;
  max_access_count: number | null;
  include_memo: boolean;
  created_at: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  canvasId,
  canvasName
}) => {
  const { user } = useAuth();
  const [shares, setShares] = useState<CanvasShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [shareId, setShareId] = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [maxAccessCount, setMaxAccessCount] = useState<number | null>(null);
  const [includeMemo, setIncludeMemo] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchShares();
      setTitle(`${canvasName || 'キャンバス'} - 共有`);
    }
  }, [isOpen, user, canvasName]);

  const fetchShares = async () => {
    if (!user) return;

    try {
      console.log('Fetching shares for user:', user.id);
      const response = await fetch(`/api/canvas/share?userId=${user.id}`);
      const data = await response.json();
      
      console.log('Fetch shares response:', data);
      
      if (data.success) {
        const canvasShares = data.shares.filter((share: CanvasShare) => 
          share.canvas_id === canvasId
        );
        setShares(canvasShares);
      } else {
        console.error('Failed to fetch shares:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch shares:', error);
    }
  };

  const generateShareId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setShareId(id);
  };

  const createShare = async () => {
    if (!user || !shareId) {
      console.error('Missing user or shareId:', { user, shareId });
      return;
    }

    setLoading(true);
    try {
      console.log('Creating share with:', {
        canvasId,
        userId: user.id,
        shareId,
        title
      });
      
      const response = await fetch('/api/canvas/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasId,
          userId: user.id,
          title,
          description,
          password: sharePassword || null,
          expiresIn,
          maxAccessCount,
          includeMemo
        })
      });

      const data = await response.json();
      console.log('Create share response:', data);
      
      if (data.success) {
        await fetchShares();
        resetForm();
        copyToClipboard(data.shareId);
      } else {
        alert('共有の作成に失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create share:', error);
      alert('共有の作成中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const deleteShare = async (shareIdToDelete: string) => {
    if (!user || !confirm('この共有を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/canvas/share?shareId=${shareIdToDelete}&userId=${user.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchShares();
      } else {
        alert('共有の削除に失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to delete share:', error);
      alert('共有の削除中にエラーが発生しました');
    }
  };

  const toggleShareActive = async (share: CanvasShare) => {
    if (!user) return;

    try {
      const response = await fetch('/api/canvas/share', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareId: share.share_id,
          userId: user.id,
          updates: { is_active: !share.is_active }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchShares();
      }
    } catch (error) {
      console.error('Failed to toggle share:', error);
    }
  };

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/canvas/share/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const resetForm = () => {
    setShareId('');
    setSharePassword('');
    setShowPassword(false);
    setDescription('');
    setExpiresIn(null);
    setMaxAccessCount(null);
    setIncludeMemo(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">キャンバスを共有</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* 新規共有作成フォーム */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-3">新しい共有を作成</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">共有ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareId}
                  onChange={(e) => setShareId(e.target.value.toUpperCase())}
                  placeholder="例: ABC12345"
                  className="flex-1 px-3 py-2 border rounded-md"
                  maxLength={8}
                />
                <button
                  onClick={generateShareId}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                >
                  自動生成
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">説明（任意）</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">パスワード（任意）</label>
              <div className="flex gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="パスワードを設定"
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

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">
                  <Clock size={14} className="inline mr-1" />
                  有効期限（時間）
                </label>
                <input
                  type="number"
                  value={expiresIn || ''}
                  onChange={(e) => setExpiresIn(e.target.value ? Number(e.target.value) : null)}
                  placeholder="無期限"
                  className="w-full px-3 py-2 border rounded-md"
                  min={1}
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">
                  <Users size={14} className="inline mr-1" />
                  最大アクセス回数
                </label>
                <input
                  type="number"
                  value={maxAccessCount || ''}
                  onChange={(e) => setMaxAccessCount(e.target.value ? Number(e.target.value) : null)}
                  placeholder="無制限"
                  className="w-full px-3 py-2 border rounded-md"
                  min={1}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeMemo"
                checked={includeMemo}
                onChange={(e) => setIncludeMemo(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="includeMemo" className="text-sm">
                メモを含める
              </label>
            </div>

            <button
              onClick={createShare}
              disabled={!shareId || loading}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '作成中...' : '共有を作成'}
            </button>
          </div>
        </div>

        {/* 既存の共有一覧 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">既存の共有</h3>
          {shares.length === 0 ? (
            <p className="text-gray-500 text-center py-4">まだ共有がありません</p>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.share_id}
                  className={`p-3 border rounded-lg ${
                    share.is_active ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{share.share_id}</span>
                        {!share.is_active && (
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">無効</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{share.title}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>アクセス: {share.access_count}回</span>
                        {share.max_access_count && (
                          <span>上限: {share.max_access_count}回</span>
                        )}
                        {share.expires_at && (
                          <span>期限: {new Date(share.expires_at).toLocaleDateString('ja-JP')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(share.share_id)}
                        className="p-2 hover:bg-gray-100 rounded"
                        title="URLをコピー"
                      >
                        {copied === share.share_id ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => toggleShareActive(share)}
                        className="p-2 hover:bg-gray-100 rounded"
                        title={share.is_active ? '無効にする' : '有効にする'}
                      >
                        {share.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={() => deleteShare(share.share_id)}
                        className="p-2 hover:bg-gray-100 rounded text-red-600"
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};