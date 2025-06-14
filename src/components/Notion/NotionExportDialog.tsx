'use client';

import { useState, useEffect } from 'react';
import { Upload, Key, TestTube, Globe, AlertCircle, Check, Loader2, ExternalLink } from 'lucide-react';
import { Database } from '@/types';
import NotificationModal from '@/components/UI/NotificationModal';
import { useNotification } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';

interface NotionExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  databases: Database[];
  canvasName?: string;
}

interface NotionPage {
  id: string;
  title: string;
  url: string;
}

// セッションストレージの安全な取得関数
const safeGetSessionStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

// セッションストレージの安全な設定関数
const safeSetSessionStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // 失敗しても続行
  }
};

export default function NotionExportDialog({ isOpen, onClose, databases, canvasName }: NotionExportDialogProps) {
  const { user, loading } = useAuth();
  // デフォルトプロジェクト名を生成（キャンバス名 + 日時）
  const generateDefaultName = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const baseName = canvasName || 'Database Canvas';
    return `${baseName} ${dateStr} ${timeStr}`;
  };

  const [step, setStep] = useState<'setup' | 'export' | 'result'>('setup');
  const [apiKey, setApiKey] = useState('');
  const [projectName, setProjectName] = useState(generateDefaultName());
  const [hasApiKey, setHasApiKey] = useState(false);

  const { notification, closeNotification, showConfirm } = useNotification();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const [conversionMessage, setConversionMessage] = useState<string>('');
  const [showConversionInfo, setShowConversionInfo] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [propertyAnalysis, setPropertyAnalysis] = useState<any>(null);
  const [propertyDialogResolve, setPropertyDialogResolve] = useState<any>(null);
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    console.log('🔍 Export dialog useEffect:', { 
      isOpen, 
      user: !!user, 
      loading, 
      userId: user?.id,
      authUser: user,
      sessionUserId: safeGetSessionStorage('currentUserId')
    });
    
    if (isOpen) {
      // ローディング中でもユーザーIDが取得できる場合は処理を続ける
      let targetUserId = null;
      
      if (user?.id) {
        console.log('✅ User found, userId from auth:', user.id);
        targetUserId = user.id;
        // Store user ID for future use
        safeSetSessionStorage('currentUserId', user.id);
      } else {
        console.log('❌ No user found in auth, trying fallbacks...');
        // フォールバック1: sessionStorageから取得を試す
        const sessionUserId = safeGetSessionStorage('currentUserId');
        if (sessionUserId) {
          console.log('📦 Fallback 1: userId from session:', sessionUserId);
          targetUserId = sessionUserId;
        } else {
          // フォールバック2: localStorageから取得を試す
          const localUserId = localStorage.getItem('currentUserId');
          if (localUserId) {
            console.log('📦 Fallback 2: userId from local storage:', localUserId);
            targetUserId = localUserId;
          }
        }
      }
      
      if (targetUserId) {
        setUserId(targetUserId);
        // ダイアログが開いたら設定を確認
        checkExistingSettings(targetUserId);
      } else if (!loading) {
        // ローディングが完了してもユーザーIDが取得できない場合
        console.error('❌ Unable to get user ID after loading completed');
        setErrorMessage('ユーザー認証が確認できません。ページを再読み込みしてください。');
      }
      
      // プロジェクト名をデフォルト値にリセット
      setProjectName(generateDefaultName());
    }
  }, [isOpen, user, loading, canvasName]);

  const checkExistingSettings = async (currentUserId: string) => {
    try {
      console.log('🔍 Checking existing settings for userId:', currentUserId);
      const response = await fetch(`/api/notion/settings?userId=${encodeURIComponent(currentUserId)}`);
      const data = await response.json();
      
      console.log('📊 API Response:', { response: response.ok, data });
      
      if (data.integration && data.integration.api_key) {
        console.log('✅ API key found, setting up...');
        setApiKey(data.integration.api_key);
        setHasApiKey(true);
        setConnectionStatus('success');
        // APIキーが既に設定されている場合はページ読み込みに進む
        setTimeout(() => {
          loadPages();
        }, 100);
      } else {
        console.log('❌ No API key found');
        setHasApiKey(false);
        setApiKey('');
        setConnectionStatus('idle');
      }
    } catch (error) {
      console.error('Failed to check existing settings:', error);
    }
  };

  const testConnection = async () => {
    const currentUserId = user?.id || userId || safeGetSessionStorage('currentUserId') || localStorage.getItem('currentUserId');
    if (!currentUserId) {
      setErrorMessage('ユーザー認証が確認できません。ページを再読み込みしてください。');
      return;
    }

    setIsTestingConnection(true);
    setErrorMessage('');
    
    try {
      // 最初にAPIキーを設定に保存/更新（重複しないよう改善済み）
      await fetch('/api/notion/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUserId, 
          apiKey
        }),
      });
      
      // 接続テスト
      const response = await fetch('/api/notion/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus('success');
        
        // 接続成功後、ページ一覧を読み込む
        loadPages();
      } else {
        setConnectionStatus('error');
        setErrorMessage(data.error || '接続に失敗しました');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage('接続テストでエラーが発生しました');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const loadPages = async () => {
    setIsLoadingPages(true);
    const currentUserId = user?.id || userId || safeGetSessionStorage('currentUserId') || localStorage.getItem('currentUserId');
    if (!currentUserId) {
      setErrorMessage('ユーザー認証が確認できません。ページを再読み込みしてください。');
      setIsLoadingPages(false);
      return;
    }
    console.log('Loading pages for userId:', currentUserId);
    
    try {
      const response = await fetch('/api/notion/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      
      // レスポンスが正常でない場合のエラーハンドリングを改善
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        setErrorMessage(`API接続エラー (${response.status}): ${errorText}`);
        setIsLoadingPages(false);
        return;
      }
      
      const data = await response.json();
      console.log('Pages API response:', data);
      
      if (data.success && data.pages) {
        setPages(data.pages);
        console.log('Pages loaded:', data.pages.length);
      } else {
        const errorMsg = data.error || data.message || 'ページの読み込みに失敗しました';
        setErrorMessage(errorMsg);
        console.error('Failed to load pages:', {
          error: data.error,
          message: data.message,
          fullResponse: data
        });
      }
    } catch (error) {
      console.error('Error loading pages:', error);
      setErrorMessage('ページの読み込みでエラーが発生しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoadingPages(false);
    }
  };

  // プロパティ互換性を分析する関数を追加
  const analyzePropertyCompatibility = (databases: Database[]) => {
    const fullySupported = ['title', 'text', 'number', 'checkbox', 'url', 'email', 'phone', 'date', 'select', 'multi-select', 'person', 'files', 'relation', 'formula', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by'];
    const partiallySupported = ['status'];
    const unsupported = ['button', 'id', 'expiry', 'rollup'];
    
    const analysis = {
      totalProperties: 0,
      supported: [] as any[],
      partiallySupported: [] as any[],
      unsupported: [] as any[],
      conversions: [] as string[]
    };
    
    databases.forEach(db => {
      db.properties.forEach(prop => {
        analysis.totalProperties++;
        
        if (fullySupported.includes(prop.type)) {
          analysis.supported.push({ database: db.name, property: prop.name, type: prop.type });
        } else if (partiallySupported.includes(prop.type)) {
          analysis.partiallySupported.push({
            database: db.name,
            property: prop.name,
            type: prop.type,
            convertedTo: 'select',
            note: '手動でステータスプロパティに変換が必要'
          });
          analysis.conversions.push(`${db.name}.${prop.name}: ${prop.type} → select`);
        } else if (unsupported.includes(prop.type)) {
          analysis.unsupported.push({
            database: db.name,
            property: prop.name,
            type: prop.type,
            convertedTo: 'text',
            note: 'テキストプロパティとして作成'
          });
          analysis.conversions.push(`${db.name}.${prop.name}: ${prop.type} → text`);
        }
        
        // 数式の問題をチェック
        if (prop.type === 'formula') {
          const expression = prop.formulaConfig?.expression?.trim();
          if (!expression) {
            analysis.conversions.push(`${db.name}.${prop.name}: 空の数式 → text`);
          }
        }
      });
    });
    
    return analysis;
  };
  
  // カスタム確認ダイアログを表示する関数
  const showPropertyConversionDialog = (analysis: any) => {
    return new Promise((resolve) => {
      setPropertyAnalysis(analysis);
      setShowPropertyDialog(true);
      setPropertyDialogResolve(() => resolve);
    });
  };

  const exportToNotion = async () => {
    
    if (!selectedPageId) {
      setErrorMessage('ページを選択してください');
      return;
    }
    
    // プロパティ互換性をチェックして警告を表示
    const analysis = analyzePropertyCompatibility(databases);
    
    if (analysis.conversions.length > 0) {
      const shouldContinue = await showPropertyConversionDialog(analysis);
      
      if (!shouldContinue) {
        return; // ユーザーがキャンセルした場合
      }
    }

    // プラン制限チェック
    const currentUserId = user?.id || userId || safeGetSessionStorage('currentUserId') || localStorage.getItem('currentUserId');
    try {
      const userResponse = await fetch(`/api/user?userId=${currentUserId}`);
      if (userResponse.ok) {
        const { user: userData } = await userResponse.json();
        
        // エクスポート制限チェック
        const { checkExportLimit } = await import('@/lib/planLimits');
        const limitCheck = checkExportLimit(userData);
        
        if (!limitCheck.allowed) {
          showConfirm(
            `${limitCheck.message}\n\nプロフィールページでアップグレードしますか？`,
            () => {
              window.open('/profile', '_blank');
            },
            'エクスポート制限',
            'アップグレード',
            'キャンセル'
          );
          return;
        }
      }
    } catch (error) {
      console.error('プラン制限チェックエラー:', error);
    }

    performExport();
  };

  const performExport = async () => {
    console.log('🚀 Starting export process...');
    
    setIsExporting(true);
    setErrorMessage('');
    setStep('export');
    setExportProgress(0);
    
    // プログレスバーのアニメーション
    const progressInterval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // 実際の完了まで90%で止める
        }
        return prev + Math.random() * 15; // ランダムに進行
      });
    }, 200);
    
    try {
      const currentUserId = user?.id || userId || safeGetSessionStorage('currentUserId') || localStorage.getItem('currentUserId');
      if (!currentUserId) {
        setErrorMessage('ユーザー認証が確認できません。ページを再読み込みしてください。');
        setIsExporting(false);
        return;
      }
      
      console.log('📊 Export parameters:');
      console.log('🔍 CRITICAL: Page ID debug:', {
        selectedPageId,
        type: typeof selectedPageId,
        length: selectedPageId?.length,
        isString: typeof selectedPageId === 'string',
        isNotEmpty: selectedPageId && selectedPageId.trim() !== ''
      });
      console.log('👤 User ID:', currentUserId);
      console.log('📋 Databases count:', databases.length);
      console.log('📋 Database names:', databases.map(db => db.name));
      console.log('🏷️ Database properties:', databases.map(db => ({
        name: db.name,
        id: db.id,
        properties: db.properties.map(p => ({ 
          name: p.name, 
          type: p.type,
          options: p.options // オプションもログに含める
        }))
      })));
      
      const exportPayload = {
        pageId: selectedPageId,
        databases,
        userId: currentUserId,
        apiKey: apiKey,
        workspaceName: projectName || generateDefaultName() // 空欄の場合はデフォルト名を使用
      };
      
      console.log('📤 Sending export request...');
      
      const response = await fetch('/api/notion/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify(exportPayload),
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('📋 Response data:', data);
      
      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        console.error('💥 Error details:', data);
        if (data.stack) {
          console.error('💥 Stack trace:', data.stack);
        }
      }
      
      if (data.success) {
        console.log('✅ Export successful');
        
        // プログレスバーを完了まで進める
        setExportProgress(100);
        
        // 少し待ってから結果画面に移行
        setTimeout(() => {
          // プロパティ変換情報を保存
          if (data.conversionMessage) {
            console.log('🔄 Property conversion info:', data.conversionMessage);
            setConversionMessage(data.conversionMessage);
            setShowConversionInfo(true);
          }
          
          setExportResult(data);
          setStep('result');
        }, 500);
        
        // エクスポート成功時にカウントを更新
        try {
          const updateUserId = user?.id || userId || safeGetSessionStorage('currentUserId') || localStorage.getItem('currentUserId');
          const userResponse = await fetch(`/api/user?userId=${updateUserId}`);
          if (userResponse.ok) {
            const { user: userData } = await userResponse.json();
            await fetch('/api/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: updateUserId,
                updates: { export_count: userData.export_count + 1 }
              })
            });
          }
        } catch (error) {
          console.error('エクスポートカウント更新エラー:', error);
        }
        
        // 成功時の効果音（ブラウザサポートがある場合）
        try {
          // ブラウザの通知音を再生
          if ('Audio' in window) {
            // 成功音の代わりにシステム通知を使用
            if (Notification.permission === 'granted') {
              new Notification('Database Canvas', {
                body: `${Object.keys(data.results).length}個のデータベースをNotionに作成しました！`,
                icon: '/favicon.ico'
              });
            }
          }
        } catch (e) {
          // 音効果が失敗しても処理を続行
        }
      } else {
        console.error('❌ Export failed:', data);
        
        // エラーメッセージの優先度: error > message > デフォルト
        let errorMessage = data.error || data.message || 'エクスポートに失敗しました';
        
        // 複数エラーがある場合
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          console.error('💥 Export errors:', data.errors);
          errorMessage = data.errors.join('\n');
        }
        
        // Notion APIエラーの詳細情報
        if (data.notionApiError) {
          console.error('💥 Notion API Error:', data.notionApiError);
          if (data.notionApiError.message) {
            errorMessage = `Notion APIエラー: ${data.notionApiError.message}`;
          }
        }
        
        setErrorMessage(errorMessage);
        
        // スタックトレースがある場合はコンソールに表示
        if (data.stack) {
          console.error('💥 Server stack trace:', data.stack);
        }
      }
    } catch (error) {
      console.error('💥 Export exception:', error);
      setErrorMessage('エクスポートでエラーが発生しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
      // プログレスはリセットしない（成功時は100%、エラー時もそのまま）
    }
  };

  const handleClose = () => {
    setStep('setup');
    setConnectionStatus('idle');
    setErrorMessage('');
    setSelectedPageId('');
    setPages([]);
    setExportResult(null);
    setShowPropertyDialog(false);
    setIsExporting(false);
    // ダイアログを完全に閉じる時だけプログレスをリセット
    setExportProgress(0);
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Upload className="text-blue-600" size={28} />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Notionにエクスポート
              </h3>
              <p className="text-sm text-gray-500">
                {databases.length}個のデータベースをNotionに作成します
              </p>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          {step === 'setup' && (
            <div className="space-y-6">
              {/* APIキーが設定されていない場合の促し */}
              {!hasApiKey ? (
                <div className="text-center py-12">
                  <Key className="mx-auto text-gray-400 mb-4" size={48} />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Notion APIキーが設定されていません
                  </h4>
                  <p className="text-gray-600 mb-6">
                    先に設定画面でNotion APIキーを設定してください
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => window.open('/profile', '_blank')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      設定画面を開く
                    </button>
                    <button
                      onClick={() => {
                        console.log('🔄 Re-checking settings...');
                        const currentUserId = user?.id || userId || safeGetSessionStorage('currentUserId') || localStorage.getItem('currentUserId');
                        if (currentUserId) {
                          checkExistingSettings(currentUserId);
                        } else {
                          setErrorMessage('ユーザー認証が確認できません。ページを再読み込みしてください。');
                        }
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      再確認
                    </button>
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                    <p className="text-sm text-blue-800">
                      <strong>💡 APIキーの取得方法：</strong><br/>
                      1. <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Notion Integrations</a> にアクセス<br/>
                      2. "New integration"をクリック<br/>
                      3. 名前を入力して作成<br/>
                      4. "Internal Integration Token"をコピー<br/>
                      5. 設定画面で貼り付け
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="text-green-600" size={20} />
                    <span className="text-green-800 font-medium">Notion APIキーが設定済みです</span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      プロジェクト名
                    </label>
                    <input
                      type="text"
                      placeholder="例: ECサイトデータベース 2025-06-09"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Notionで識別しやすい名前を付けてください
                    </p>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900">保存先ページを選択</h4>
                  
                  {isLoadingPages ? (
                    <div className="p-8 bg-gray-50 rounded-lg text-center">
                      <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                      <p className="text-gray-600">ページを読み込み中...</p>
                    </div>
                  ) : pages.length > 0 ? (
                    <>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {pages.map((page) => (
                          <label
                            key={page.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedPageId === page.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="page"
                              value={page.id}
                              checked={selectedPageId === page.id}
                              onChange={(e) => setSelectedPageId(e.target.value)}
                              className="text-blue-600"
                            />
                            <span className="text-sm">{page.title || "無題のページ"}</span>
                          </label>
                        ))}
                      </div>
                      
                      
                      <button
                        onClick={exportToNotion}
                        disabled={!selectedPageId}
                        className={`w-full py-3 rounded-lg font-medium transition-colors ${
                          selectedPageId
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {databases.length}個のデータベースを作成
                      </button>
                    </>
                  ) : (
                    <div className="p-8 bg-gray-50 rounded-lg text-center">
                      <Globe className="mx-auto text-gray-400 mb-3" size={32} />
                      <p className="text-gray-600 mb-2">ページが見つかりません</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Notionワークスペースにページを作成してから再試行してください
                      </p>
                      <button
                        onClick={loadPages}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        再読み込み
                      </button>
                    </div>
                  )}
                  
                  {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="text-red-600" size={16} />
                        <p className="text-red-800 text-sm">{errorMessage}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* エクスポート中ステップ */}
          {step === 'export' && (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="text-blue-600 animate-bounce" size={40} />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                データベースを作成中
              </h4>
              <p className="text-gray-600 mb-4">
                {databases.length}個のデータベースをNotionに作成しています...
              </p>
              <div className="w-48 mx-auto bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out" 
                  style={{width: `${exportProgress}%`}}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                しばらくお待ちください。ウィンドウを閉じないでください。
              </p>
            </div>
          )}

          {/* 結果ステップ */}
          {step === 'result' && exportResult && (
            <div className="space-y-4">
              {exportResult.success ? (
                <>
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Check className="text-gray-600" size={24} />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">
                      作成完了
                    </h4>
                    <p className="text-sm text-gray-600">
                      {Object.keys(exportResult.results).length}個のデータベースを作成しました
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">作成されたデータベース:</h5>
                    {Object.entries(exportResult.results).map(([dbId, result]: [string, any]) => {
                      const database = databases.find(db => db.id === dbId);
                      return (
                        <div
                          key={dbId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                              <Check className="text-gray-600" size={14} />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{database?.name}</span>
                          </div>
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Notionで開く
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="text-red-600" size={40} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      作成に失敗しました
                    </h4>
                    <p className="text-gray-600">
                      データベースの作成中にエラーが発生しました
                    </p>
                  </div>
                  
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                    <p className="text-sm text-red-800 font-medium mb-2">エラー詳細:</p>
                    <p className="text-sm text-red-700">
                      {exportResult.errors?.[0] || 'エラーが発生しました'}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-700">
                      🔧 解決方法: APIキーやページの設定を確認し、再度お試しください。
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleClose}
            disabled={step === 'export'}
            className={`px-6 py-2 rounded-lg transition-colors ${
              step === 'export'
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {step === 'result' ? '完了' : 
             step === 'export' ? '処理中...' : 'キャンセル'}
          </button>
        </div>
      </div>
      
      
      {/* プロパティ変換情報ダイアログ */}
      {showConversionInfo && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    プロパティ変換のお知らせ
                  </h3>
                  <p className="text-sm text-gray-500">
                    Notion APIの制限により一部のプロパティが変換されました
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                  {conversionMessage}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowConversionInfo(false);
                  setConversionMessage('');
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                理解しました
              </button>
            </div>
          </div>
        </div>
      )}

      {/* カスタムプロパティ変換ダイアログ */}
      {showPropertyDialog && propertyAnalysis && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* ヘッダー */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">未対応プロパティの確認</h3>
              </div>
              <p className="text-sm text-gray-600 mt-2 ml-9">
                以下のプロパティは現在サポートされておらず、自動生成できません：
              </p>
            </div>

            {/* コンテンツ */}
            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-5">
              {/* データベースごとにグループ化して表示 */}
              {(() => {
                const groupedByDatabase = {};
                
                // ステータスプロパティをグループ化
                propertyAnalysis.partiallySupported.forEach(item => {
                  if (!groupedByDatabase[item.database]) {
                    groupedByDatabase[item.database] = [];
                  }
                  groupedByDatabase[item.database].push({
                    property: item.property,
                    type: 'status',
                    originalType: 'status'
                  });
                });
                
                // 未サポートプロパティをグループ化
                propertyAnalysis.unsupported.forEach(item => {
                  if (!groupedByDatabase[item.database]) {
                    groupedByDatabase[item.database] = [];
                  }
                  const typeDescription = {
                    'button': 'button',
                    'id': 'ユニークID', 
                    'expiry': 'expiry',
                    'rollup': 'ロールアップ'
                  };
                  groupedByDatabase[item.database].push({
                    property: item.property,
                    type: item.type,
                    originalType: typeDescription[item.type] || item.type
                  });
                });
                
                return Object.entries(groupedByDatabase).map(([database, properties]) => (
                  <div key={database} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* データベース名ヘッダー */}
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900">{database}</h4>
                    </div>
                    {/* プロパティリスト */}
                    <div className="divide-y divide-gray-100">
                      {properties.map((prop, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-4 bg-white hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            <span className="text-sm text-gray-600">{prop.property}</span>
                          </div>
                          <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                            {prop.originalType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}

              {/* 情報ボックス */}
              <div className="space-y-3 mt-6">
                {propertyAnalysis.partiallySupported.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">ステータスプロパティについて</h4>
                        <p className="text-sm text-blue-800">
                          APIの制限により、<span className="font-medium">selectプロパティとして作成されます</span>。
                          より高度なステータス機能を使用したい場合は、Notionで手動でstatusプロパティに変更してください。
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {propertyAnalysis.unsupported.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">未サポートプロパティについて</h4>
                        <p className="text-sm text-blue-800">
                          これらのプロパティは<span className="font-medium">テキストプロパティとして作成されます</span>。
                          必要に応じて、Notion側で適切なプロパティタイプに手動変更してください。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPropertyDialog(false);
                  if (propertyDialogResolve) propertyDialogResolve(false);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setShowPropertyDialog(false);
                  if (propertyDialogResolve) propertyDialogResolve(true);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                続行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通知モーダル */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        onConfirm={notification.onConfirm}
        onCancel={notification.onCancel}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        confirmText={notification.confirmText}
        cancelText={notification.cancelText}
      />
    </div>
  );
}