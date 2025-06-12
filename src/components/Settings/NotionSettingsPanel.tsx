'use client';

import { useState, useEffect } from 'react';
import { Key, Save, Trash2, CheckCircle, AlertCircle, ExternalLink, BookOpen, Info } from 'lucide-react';
import NotificationModal from '@/components/UI/NotificationModal';
import { useNotification } from '@/hooks/useNotification';

interface NotionSettingsPanelProps {
  userId: string;
}

interface NotionIntegration {
  id: string;
  user_id: string;
  api_key: string;
  workspace_name?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export default function NotionSettingsPanel({ userId }: NotionSettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [integration, setIntegration] = useState<NotionIntegration | null>(null);

  const { notification, closeNotification, showConfirm } = useNotification();

  useEffect(() => {
    loadNotionSettings();
  }, [userId]);

  const loadNotionSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notion/settings?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      
      if (response.ok && data.integration) {
        setIntegration(data.integration);
        setApiKey(data.integration.api_key);
      }
    } catch (error) {
      console.error('Failed to load Notion settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotionSettings = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'APIキーを入力してください' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/notion/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          apiKey: apiKey.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Notion設定を保存しました' });
        setIntegration(data.integration);
      } else {
        setMessage({ type: 'error', text: data.error || '保存に失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存中にエラーが発生しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNotionSettings = async () => {
    showConfirm(
      'Notion設定を削除しますか？',
      async () => {
        setIsDeleting(true);
        setMessage(null);

        try {
          const response = await fetch(`/api/notion/settings?userId=${encodeURIComponent(userId)}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            setMessage({ type: 'success', text: 'Notion設定を削除しました' });
            setIntegration(null);
            setApiKey('');
          } else {
            const data = await response.json();
            setMessage({ type: 'error', text: data.error || '削除に失敗しました' });
          }
        } catch (error) {
          setMessage({ type: 'error', text: '削除中にエラーが発生しました' });
        } finally {
          setIsDeleting(false);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.906c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046 1.121-.56 1.121-1.167V6.354c0-.606-.233-.933-.746-.887l-15.177.887c-.56.047-.935.467-.935 1.027zm13.748.327c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notion連携設定</h2>
            <p className="text-sm text-gray-600">データベースをNotionにエクスポートするための設定</p>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* メッセージ表示 */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {message.type === 'success' ? (
                <CheckCircle size={18} className={`mt-0.5 flex-shrink-0 text-green-600`} />
              ) : (
                <AlertCircle size={18} className={`mt-0.5 flex-shrink-0 text-red-600`} />
              )}
              <span className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>{message.text}</span>
            </div>
          </div>
        )}

        {/* API設定 */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Key size={16} />
            API設定
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notion APIキー <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="secret_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
                />
              </div>
              {integration && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle size={14} />
                  <span>APIキーが設定されています</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveNotionSettings}
              disabled={isSaving || !apiKey.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {integration ? '更新' : '保存'}
                </>
              )}
            </button>

            {integration && (
              <button
                onClick={deleteNotionSettings}
                disabled={isDeleting}
                className="px-4 py-3 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 size={18} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* セットアップガイド */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen size={16} />
            セットアップガイド
          </h4>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">インテグレーションを作成</p>
                <p className="text-xs text-gray-600 mb-2">
                  Notion Integrationsページで新しいインテグレーションを作成します
                </p>
                <a
                  href="https://www.notion.so/my-integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  Notion Integrationsを開く
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">必要な設定を行う</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 名前を入力（例：Database Canvas Export）</li>
                  <li>• コンテンツ機能を有効化</li>
                  <li>• 「Submit」をクリック</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">APIキーをコピー</p>
                <p className="text-xs text-gray-600">
                  「Internal Integration Token」をコピーして上記フィールドに貼り付けます
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                4
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">Notionページで権限を付与</p>
                <p className="text-xs text-gray-600">
                  エクスポート先のNotionページでインテグレーションを招待（Share → Invite）
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 連携状態 */}
        {integration && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Info size={16} />
              連携状態
            </h4>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">状態</p>
                <p className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="font-medium text-gray-900">APIキー設定済み</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 注意事項 */}
        <div className="border-t border-gray-200 pt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-medium">セキュリティに関する注意事項</p>
                <ul className="space-y-1">
                  <li>• APIキーは暗号化されてサーバーに保存されます</li>
                  <li>• 共有端末での使用は推奨しません</li>
                  <li>• APIキーは定期的に再生成することを推奨します</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 通知モーダル */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        onConfirm={notification.onConfirm}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        confirmText={notification.confirmText}
        cancelText={notification.cancelText}
      />
    </div>
  );
}