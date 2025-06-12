'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Crown, User, BarChart3, Settings, Sparkles, Zap, Shield, Tag, CheckCircle, History, Calendar } from 'lucide-react';
import NotificationModal from '@/components/UI/NotificationModal';
import NotionSettingsPanel from '@/components/Settings/NotionSettingsPanel';
import { useNotification } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getEffectivePlan } from '@/lib/planLimits';
import type { User } from '@/lib/supabase';

// プラン表示用の関数
function getPlanDisplayInfo(userData: User) {
  const effectivePlan = getEffectivePlan(userData);
  
  console.log('🏷️ getPlanDisplayInfo:', {
    effectivePlan,
    plan_source: userData.plan_source,
    trial_expires_at: userData.trial_expires_at,
    plan: userData.plan
  });
  
  if (effectivePlan === 'free') {
    console.log('🏷️ Returning Free plan');
    return {
      label: 'Free',
      color: 'bg-gray-100 text-gray-800',
      icon: User
    };
  }
  
  // Premium の場合、plan_source で詳細を分ける
  console.log('🏷️ Processing premium plan, plan_source:', userData.plan_source);
  switch (userData.plan_source) {
    case 'stripe':
      console.log('🏷️ Returning Stripe Premium');
      return {
        label: 'Premium',
        color: 'bg-purple-100 text-purple-800',
        icon: Crown
      };
    case 'promo_code':
    case 'trial_code':
      console.log('🏷️ Processing promo/trial code');
      // 体験版かどうかを trial_expires_at で判定
      if (userData.trial_expires_at) {
        const expiresAt = new Date(userData.trial_expires_at);
        const now = new Date();
        console.log('🏷️ Trial check:', {
          now: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          isValid: now < expiresAt
        });
        if (now < expiresAt) {
          console.log('🏷️ Returning Premium体験版 (trial active)');
          return {
            label: 'Premium体験版',
            color: 'bg-amber-100 text-amber-800',
            icon: Sparkles
          };
        }
      }
      console.log('🏷️ Returning Premium (trial expired or no trial)');
      return {
        label: 'Premium',
        color: 'bg-purple-100 text-purple-800',
        icon: Crown
      };
    case 'auto_trial':
      console.log('🏷️ Returning Premium体験版 (auto trial)');
      return {
        label: 'Premium体験版',
        color: 'bg-amber-100 text-amber-800',
        icon: Sparkles
      };
    default:
      console.log('🏷️ Returning Premium (default)');
      return {
        label: 'Premium',
        color: 'bg-purple-100 text-purple-800',
        icon: Crown
      };
  }
}

interface PromoHistory {
  id: string;
  code: string;
  granted_plan: string;
  trial_duration_days: number;
  expires_at: string | null;
  status: string;
  created_at: string;
  promo_codes: {
    code: string;
    description: string;
    granted_plan: string;
    trial_duration_days: number;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, userData: authUserData, loading: authLoading, isAuthenticated, refreshUser } = useAuth();
  
  // ローカルステートでuserDataを管理（即座に更新できるように）
  const [userData, setUserData] = useState<User | null>(authUserData);
  
  // authUserDataが変更されたら、ローカルステートも更新
  useEffect(() => {
    setUserData(authUserData);
  }, [authUserData]);
  
  // デバッグ用: userDataの変更を監視
  useEffect(() => {
    if (userData) {
      console.log('📊 Profile Page - userData updated:', {
        effective_plan: userData.effective_plan,
        plan_source: userData.plan_source,
        active_trial_code: userData.active_trial_code,
        trial_expires_at: userData.trial_expires_at
      });
    }
  }, [userData]);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoHistory, setPromoHistory] = useState<PromoHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { notification, closeNotification, showAlert, showError, showSuccess } = useNotification();

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // ローディング状態の管理
  useEffect(() => {
    if (!authLoading) {
      setLoading(false);
      if (isAuthenticated) {
        loadPromoHistory();
        // デバッグ用: Supabaseから直接データを確認
        debugUserData();
      }
    }
  }, [authLoading, isAuthenticated]);

  // デバッグ用: Supabaseから直接ユーザーデータを確認
  const debugUserData = async () => {
    if (!authUser) return;
    
    try {
      console.log('🔍 Debug: Checking user data directly from Supabase...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Debug: Direct API user data:', data);
      } else {
        console.error('🔍 Debug: Failed to fetch user data:', response.status);
      }
    } catch (error) {
      console.error('🔍 Debug: Error fetching user data:', error);
    }
  };

  // プロモーションコード履歴を読み込み
  const loadPromoHistory = async () => {
    if (!authUser) return;
    
    try {
      setLoadingHistory(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/promo-codes/history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPromoHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load promo history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // プロモーションコード詳細取得用
  const [activePromoDetail, setActivePromoDetail] = useState<any>(null);

  // active_promo_code_idが変わったら詳細を取得
  useEffect(() => {
    const fetchPromoDetail = async () => {
      if (userData?.active_promo_code_id) {
        const { data, error } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('id', userData.active_promo_code_id)
          .single();
        if (!error) setActivePromoDetail(data);
        else setActivePromoDetail(null);
      } else {
        setActivePromoDetail(null);
      }
    };
    fetchPromoDetail();
  }, [userData?.active_promo_code_id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={16} />
            ダッシュボードに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto mb-3"></div>
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : userData && authUser ? (() => {
          // getEffectivePlan関数を使って正確なプラン判定を行う
          const effectivePlan = getEffectivePlan(userData);
          const isPremium = effectivePlan === 'premium';
          
          return (
          <div className="space-y-6">
            {/* アカウント情報 */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="text-gray-600" size={18} />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">アカウント</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">メールアドレス</p>
                    <p className="text-sm text-gray-500">{authUser.email}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">プラン</p>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const planInfo = getPlanDisplayInfo(userData);
                        const PlanIcon = planInfo.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${planInfo.color}`}>
                            <PlanIcon size={12} />
                            {planInfo.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        console.log('🔄 Manual refresh triggered');
                        
                        // 直接APIを叩いてテスト
                        try {
                          const response = await fetch('/api/user', {
                            headers: {
                              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                            }
                          });
                          const result = await response.json();
                          console.log('🔍 Direct API call result:');
                          console.log(result);
                          
                          if (result.userData) {
                            console.log('🔍 API userData.effective_plan:', result.userData.effective_plan);
                            console.log('🔍 API userData.plan_source:', result.userData.plan_source);
                            console.log('🔍 API userData.trial_expires_at:', result.userData.trial_expires_at);
                            console.log('🔍 API userData.active_trial_code:', result.userData.active_trial_code);
                          }
                        } catch (error) {
                          console.error('🔍 Direct API call error:', error);
                        }
                        
                        refreshUser(true);
                      }}
                      className="text-xs text-gray-600 hover:text-gray-800 border border-gray-300 px-2 py-1 rounded"
                    >
                      データ更新
                    </button>
                    {!isPremium && (
                      <button
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        onClick={() => showAlert('アップグレード機能は準備中です', 'お知らせ')}
                      >
                        アップグレード
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* プロモーションコード入力 */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Tag className="text-gray-600" size={18} />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">プロモーションコード</h2>
                </div>
              </div>
              <div className="p-6">
                {(isPremium && userData.plan_source === 'promo_code') || userData.active_promo_code_id ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          プロモーションコード適用中
                        </p>
                        {userData.trial_expires_at && (
                          <p className="text-sm text-green-700 mt-1">
                            有効期限: {new Date(userData.trial_expires_at).toLocaleDateString('ja-JP')}
                          </p>
                        )}
                        {activePromoDetail && (
                          <p className="text-sm text-green-700 mt-1">
                            適用コード: {activePromoDetail.code}（{activePromoDetail.description}）
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      プロモーションコードをお持ちの場合は、こちらから入力してください。
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="例: PROMO-XXXXXX"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isApplyingPromo}
                      />
                      <button
                        onClick={async () => {
                          if (!promoCode.trim()) {
                            showAlert('プロモーションコードを入力してください');
                            return;
                          }
                          
                          setIsApplyingPromo(true);
                          try {
                            // Get the current session to extract JWT token
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.access_token) {
                              showError('認証が必要です。ログインし直してください。');
                              return;
                            }

                            const response = await fetch('/api/promo-codes/validate', {
                              method: 'POST',
                              headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`
                              },
                              body: JSON.stringify({ code: promoCode })
                            });
                            
                            const data = await response.json();
                            
                            if (response.ok && data.success) {
                              showSuccess(data.message);
                              setPromoCode('');
                              
                              // APIから返された更新済みのユーザーデータで即座に更新
                              if (data.userData) {
                                console.log('📊 Updating local userData with API response:', data.userData);
                                setUserData(data.userData);
                              }
                              
                              // 履歴も即座に更新
                              loadPromoHistory();
                              
                              // 念のため、少し待ってから全体を再読み込み
                              setTimeout(async () => {
                                try {
                                  console.log('🔄 Refreshing user data after promo code application...');
                                  await refreshUser();
                                  console.log('✅ User data refreshed successfully');
                                } catch (refreshError) {
                                  console.error('User refresh error:', refreshError);
                                }
                              }, 1000);
                            } else {
                              showError(data.error || 'プロモーションコードの適用に失敗しました');
                            }
                          } catch (error) {
                            console.error('Promo code application error:', error);
                            showError('エラーが発生しました');
                          } finally {
                            setIsApplyingPromo(false);
                          }
                        }}
                        disabled={isApplyingPromo || !promoCode.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                      >
                        {isApplyingPromo ? '適用中...' : '適用'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* プロモーションコード履歴 */}
            {promoHistory.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <History className="text-gray-600" size={18} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">プロモーションコード履歴</h2>
                  </div>
                </div>
                <div className="p-6">
                  {loadingHistory ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">読み込み中...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {promoHistory.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-sm font-medium">
                                  {item.code}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  item.status === 'active' 
                                    ? 'bg-green-100 text-green-700'
                                    : item.status === 'expired'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.status === 'active' ? 'アクティブ' : 
                                   item.status === 'expired' ? '期限切れ' : '無効'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                {item.promo_codes?.description || 'プロモーションコード'}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  適用日: {new Date(item.created_at).toLocaleDateString('ja-JP')}
                                </span>
                                {item.trial_duration_days > 0 && (
                                  <span>
                                    {item.trial_duration_days}日間体験
                                  </span>
                                )}
                                {item.expires_at && (
                                  <span>
                                    期限: {new Date(item.expires_at).toLocaleDateString('ja-JP')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 使用状況 */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="text-gray-600" size={18} />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">使用状況</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">キャンバス</span>
                      <span className="text-sm text-gray-500">
                        {userData.canvas_count} / {isPremium ? '無制限' : '3'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          isPremium 
                            ? 'bg-purple-600' 
                            : userData.canvas_count >= 3 
                              ? 'bg-red-500' 
                              : 'bg-blue-600'
                        }`}
                        style={{
                          width: isPremium 
                            ? '100%' 
                            : `${Math.min((userData.canvas_count / 3) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">今月のエクスポート</span>
                      <span className="text-sm text-gray-500">
                        {userData.export_count} / {isPremium ? '無制限' : '10'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          isPremium 
                            ? 'bg-purple-600' 
                            : userData.export_count >= 10 
                              ? 'bg-red-500' 
                              : 'bg-green-600'
                        }`}
                        style={{
                          width: isPremium 
                            ? '100%' 
                            : `${Math.min((userData.export_count / 10) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notion連携設定 */}
            {authUser && (
              <NotionSettingsPanel userId={authUser.id} />
            )}

            {/* プレミアムプロモーション（無料プランのみ） */}
            {userData.effective_plan === 'free' && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Crown className="text-purple-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Premiumプランにアップグレード</h3>
                    <ul className="text-sm text-gray-600 space-y-1 mb-4">
                      <li>• 無制限のキャンバス作成</li>
                      <li>• 無制限のNotionエクスポート</li>
                      <li>• 優先サポート</li>
                    </ul>
                    <button
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      onClick={() => showAlert('アップグレード機能は準備中です', 'お知らせ')}
                    >
                      詳細を見る
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })() : (
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <p className="text-red-600">ユーザー情報の読み込みに失敗しました</p>
          </div>
        )}
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