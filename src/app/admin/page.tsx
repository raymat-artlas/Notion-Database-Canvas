'use client';

import { useState, useEffect } from 'react';
import { Shield, Key, Users, Plus, Trash2, Eye, EyeOff, Calendar, User, LogOut } from 'lucide-react';
import NotificationModal from '@/components/UI/NotificationModal';
import { useNotification } from '@/hooks/useNotification';

interface AccessCode {
  id: string;
  code: string;
  description: string;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: string;
  auth_user_id: string;
  email: string;
  plan: string;
  effective_plan: string;
  trial_expires_at: string | null;
  canvas_count: number;
  is_test_user: boolean;
  created_at: string;
}

interface PromoCode {
  id: string;
  code: string;
  description: string;
  trial_duration_days: number;
  granted_plan: string;
  max_uses: number;
  current_uses: number;
  one_time_per_user: boolean;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface WaitlistUser {
  id: string;
  email: string;
  created_at: string;
  source: string;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'codes' | 'promos' | 'users' | 'waitlist'>('codes');
  
  // データ
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistUser[]>([]);
  
  // UI状態
  const [showCodes, setShowCodes] = useState<Record<string, boolean>>({});
  const [newCode, setNewCode] = useState({ code: '', description: '', expires_at: '' });
  const [newPromo, setNewPromo] = useState({ 
    code: '', 
    description: '', 
    trial_duration_days: 30, 
    max_uses: 100, 
    expires_at: '' 
  });

  const { notification, closeNotification, showAlert, showConfirm, showError, showSuccess } = useNotification();

  // 初回認証チェック
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // データ読み込み
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/admin/auth');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const loadData = async () => {
    await Promise.all([loadAccessCodes(), loadPromoCodes(), loadUsers(), loadWaitlist()]);
  };

  const loadAccessCodes = async () => {
    try {
      const response = await fetch('/api/admin/access-codes');
      if (response.ok) {
        const data = await response.json();
        setAccessCodes(data.accessCodes || []);
      }
    } catch (error) {
      console.error('Failed to load access codes:', error);
    }
  };

  const loadPromoCodes = async () => {
    try {
      const response = await fetch('/api/admin/promo-codes');
      if (response.ok) {
        const data = await response.json();
        setPromoCodes(data.promoCodes || []);
      }
    } catch (error) {
      console.error('Failed to load promo codes:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadWaitlist = async () => {
    try {
      const response = await fetch('/api/admin/waitlist');
      if (response.ok) {
        const data = await response.json();
        setWaitlist(data.waitlist || []);
      }
    } catch (error) {
      console.error('Failed to load waitlist:', error);
    }
  };

  // 認証
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      showError('メールアドレスとパスワードを入力してください');
      return;
    }
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      if (response.ok) {
        setIsAuthenticated(true);
        setAdminEmail('');
        setAdminPassword('');
      } else {
        const error = await response.json();
        showError(error.error || 'ログインに失敗しました');
      }
    } catch (error) {
      showError('通信エラーが発生しました');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsAuthenticated(false);
    setAdminEmail('');
    setAdminPassword('');
  };

  // アクセスコード作成
  const handleCreateCode = async () => {
    if (!newCode.code || !newCode.description) {
      showAlert('コードと説明を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/admin/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCode,
          max_uses: 1,
          one_time_per_user: false
        })
      });

      if (response.ok) {
        setNewCode({ code: '', description: '', expires_at: '' });
        showSuccess('アクセスコードを作成しました');
        loadAccessCodes();
      } else {
        const error = await response.json();
        showError('作成に失敗しました: ' + error.error);
      }
    } catch (error) {
      showError('エラーが発生しました');
    }
  };

  // アクセスコード削除
  const deleteCode = async (id: string) => {
    showConfirm('このコードを削除しますか？', async () => {
      try {
        const response = await fetch(`/api/admin/access-codes?id=${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          showSuccess('削除しました');
          loadAccessCodes();
        } else {
          showError('削除に失敗しました');
        }
      } catch (error) {
        showError('エラーが発生しました');
      }
    });
  };


  // プロモーションコード作成
  const handleCreatePromo = async () => {
    if (!newPromo.code || !newPromo.description) {
      showAlert('コードと説明を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPromo,
          one_time_per_user: true,
          granted_plan: 'premium'
        })
      });

      if (response.ok) {
        setNewPromo({ code: '', description: '', trial_duration_days: 30, max_uses: 100, expires_at: '' });
        showSuccess('プロモーションコードを作成しました');
        loadPromoCodes();
      } else {
        const error = await response.json();
        showError('作成に失敗しました: ' + error.error);
      }
    } catch (error) {
      showError('エラーが発生しました');
    }
  };

  // プロモーションコード削除
  const deletePromo = async (id: string) => {
    showConfirm('このプロモーションコードを削除しますか？', async () => {
      try {
        const response = await fetch(`/api/admin/promo-codes?id=${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          showSuccess('削除しました');
          loadPromoCodes();
        } else {
          showError('削除に失敗しました');
        }
      } catch (error) {
        showError('エラーが発生しました');
      }
    });
  };

  // ランダムコード生成
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setNewCode(prev => ({ ...prev, code: `BETA-${code}` }));
  };

  const generatePromo = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setNewPromo(prev => ({ ...prev, code: `PROMO-${code}` }));
  };

  // コード表示切り替え
  const toggleCodeVisibility = (id: string) => {
    setShowCodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 認証チェック中の画面
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // 認証前画面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <div className="text-center mb-8">
            <Shield className="mx-auto mb-4 text-gray-700" size={48} />
            <h1 className="text-2xl font-bold text-gray-900">管理者ログイン</h1>
            <p className="text-gray-600 mt-2">Database Canvas 管理</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="メールアドレス"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <input
              type="password"
              placeholder="管理者パスワード"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 font-medium"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  // メイン画面
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-gray-700" size={24} />
              <h1 className="text-xl font-bold text-gray-900">Database Canvas 管理</h1>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              <LogOut size={16} />
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('codes')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'codes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Key size={16} />
                アクセスコード ({accessCodes.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'promos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                プロモーションコード ({promoCodes.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={16} />
                ユーザー ({users.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('waitlist')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'waitlist'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                ウェイトリスト ({waitlist.length})
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* コンテンツ */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* アクセスコードタブ */}
        {activeTab === 'codes' && (
          <div className="space-y-6">
            {/* 作成フォーム */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">新規アクセスコード作成</h2>
                <button
                  onClick={generateCode}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                >
                  自動生成
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="BETA-XXXXXXXX"
                  value={newCode.code}
                  onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="説明（例: 田中太郎さん用）"
                  value={newCode.description}
                  onChange={(e) => setNewCode(prev => ({ ...prev, description: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={newCode.expires_at}
                  onChange={(e) => setNewCode(prev => ({ ...prev, expires_at: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                onClick={handleCreateCode}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                <Plus size={16} className="inline mr-2" />
                作成
              </button>
            </div>

            {/* コード一覧 */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">アクセスコード一覧</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {accessCodes.map((code) => (
                  <div key={code.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {showCodes[code.id] ? code.code : '••••••••'}
                            </span>
                            <button
                              onClick={() => toggleCodeVisibility(code.id)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              {showCodes[code.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            code.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {code.is_active ? 'アクティブ' : '無効'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1">{code.description}</div>
                        <div className="text-xs text-gray-500">
                          使用: {code.current_uses}回 | 
                          作成: {new Date(code.created_at).toLocaleDateString()}
                          {code.expires_at && (
                            <> | 期限: {new Date(code.expires_at).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCode(code.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* プロモーションコードタブ */}
        {activeTab === 'promos' && (
          <div className="space-y-6">
            {/* 作成フォーム */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">新規プロモーションコード作成</h2>
                <button
                  onClick={generatePromo}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                >
                  自動生成
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    プロモーションコード *
                  </label>
                  <input
                    type="text"
                    placeholder="PROMO-XXXXXX"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    英数字とハイフンのみ（例: PROMO-2024）
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    説明 *
                  </label>
                  <input
                    type="text"
                    placeholder="リリース記念30日無料体験"
                    value={newPromo.description}
                    onChange={(e) => setNewPromo(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    プロモーションの内容を簡潔に説明
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    体験期間（日数）
                  </label>
                  <input
                    type="number"
                    placeholder="30"
                    min="1"
                    max="365"
                    value={newPromo.trial_duration_days}
                    onChange={(e) => setNewPromo(prev => ({ ...prev, trial_duration_days: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    プレミアム体験期間（1-365日）
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大使用回数
                  </label>
                  <input
                    type="number"
                    placeholder="100"
                    min="1"
                    value={newPromo.max_uses}
                    onChange={(e) => setNewPromo(prev => ({ ...prev, max_uses: parseInt(e.target.value) || 100 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    このコードを使用できる総回数
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    有効期限（任意）
                  </label>
                  <input
                    type="date"
                    value={newPromo.expires_at}
                    onChange={(e) => setNewPromo(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    未設定の場合は無期限で有効
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    プレビュー
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium">
                        {newPromo.code || 'PROMO-XXXXXX'}
                      </span>
                      <span className="text-gray-500">
                        {newPromo.trial_duration_days}日間体験
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {newPromo.description || '説明文がここに表示されます'}
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleCreatePromo}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium"
              >
                <Plus size={16} className="inline mr-2" />
                プロモーションコード作成
              </button>
            </div>

            {/* プロモーションコード一覧 */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">プロモーションコード一覧</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {promoCodes.map((code) => (
                  <div key={code.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {showCodes[code.id] ? code.code : '••••••••'}
                            </span>
                            <button
                              onClick={() => toggleCodeVisibility(code.id)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              {showCodes[code.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            code.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {code.is_active ? 'アクティブ' : '無効'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1">{code.description}</div>
                        <div className="text-xs text-gray-500">
                          使用: {code.current_uses}/{code.max_uses} | 
                          体験期間: {code.trial_duration_days}日 | 
                          作成: {new Date(code.created_at).toLocaleDateString()}
                          {code.expires_at && (
                            <> | 期限: {new Date(code.expires_at).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deletePromo(code.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ユーザータブ */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">ユーザー管理</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {users.map((user) => (
                <div key={user.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium">{user.email}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.effective_plan === 'premium' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.effective_plan === 'premium' ? '有料' : '無料'}
                        </span>
                        {user.is_test_user && (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                            テストユーザー
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        キャンバス: {user.canvas_count} | 
                        登録: {new Date(user.created_at).toLocaleDateString()}
                        {user.trial_expires_at && (
                          <> | 体験期限: {new Date(user.trial_expires_at).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ウェイトリストタブ */}
        {activeTab === 'waitlist' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">ウェイトリスト</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {waitlist.map((item) => (
                <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium mb-1">{item.email}</div>
                      <div className="text-xs text-gray-500">
                        登録: {new Date(item.created_at).toLocaleDateString()} | 
                        ソース: {item.source}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

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