'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Shield, Settings, LogOut, Eye, Edit2, Trash2, Copy, Calendar, Clock, ExternalLink, User, Key, BookOpen, CheckCircle, Crown, Sparkles } from 'lucide-react';
import Link from 'next/link';
import PlanLimitModal from '@/components/UI/PlanLimitModal';
import { getEffectivePlan } from '@/lib/planLimits';
import NotificationModal from '@/components/UI/NotificationModal';
import TutorialOverlay from '@/components/Tutorial/TutorialOverlay';
import { useNotification } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';
import { useTutorial, TUTORIAL_CONFIGS } from '@/hooks/useTutorial';
import type { User as UserType } from '@/lib/supabase';

// プラン表示用の関数
function getPlanDisplayInfo(userData: UserType) {
  const effectivePlan = getEffectivePlan(userData);
  
  if (effectivePlan === 'free') {
    return {
      label: 'Free',
      color: 'bg-gray-100 text-gray-800',
      icon: User
    };
  }
  
  // Premium の場合、plan_source で詳細を分ける
  switch (userData.plan_source) {
    case 'stripe':
      return {
        label: 'Premium',
        color: 'bg-purple-100 text-purple-800',
        icon: Crown
      };
    case 'promo_code':
    case 'trial_code':
      // 体験版かどうかを trial_expires_at で判定
      if (userData.trial_expires_at) {
        const expiresAt = new Date(userData.trial_expires_at);
        const now = new Date();
        if (now < expiresAt) {
          return {
            label: 'Premium体験版',
            color: 'bg-amber-100 text-amber-800',
            icon: Sparkles
          };
        }
      }
      return {
        label: 'Premium',
        color: 'bg-purple-100 text-purple-800',
        icon: Crown
      };
    case 'auto_trial':
      return {
        label: 'Premium体験版',
        color: 'bg-amber-100 text-amber-800',
        icon: Sparkles
      };
    default:
      return {
        label: 'Premium',
        color: 'bg-purple-100 text-purple-800',
        icon: Crown
      };
  }
}

interface Canvas {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, userData, loading, isAuthenticated, refreshUser } = useAuth();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [isLoadingCanvases, setIsLoadingCanvases] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCanvas, setNewCanvas] = useState({
    name: '',
    description: ''
  });
  const [editingCanvas, setEditingCanvas] = useState<Canvas | null>(null);
  const [hoveredCanvasId, setHoveredCanvasId] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldType, setEditingFieldType] = useState<'name' | 'description' | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [dashboardSettings, setDashboardSettings] = useState({
    theme: 'light',
    defaultGridVisible: true,
    defaultZoomSensitivity: 0.02,
    autoSaveInterval: 30,
    notionIntegration: {
      enabled: false,
      defaultWorkspace: ''
    }
  });

  // 認証チェックとリダイレクト - 初回のみ
  useEffect(() => {
    // ローディング中は何もしない
    if (loading) {
      return
    }
    
    // 認証状態が明確になった後、リダイレクト
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router]); // userを依存配列から削除

  // キャンバス一覧のキャッシュ
  const [canvasesCache, setCanvasesCache] = useState<{ data: Canvas[], timestamp: number } | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5分

  // キャンバス一覧を読み込み（キャッシュ付き）
  const loadCanvasesWithCache = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // キャッシュチェック
    if (!forceRefresh && canvasesCache && (now - canvasesCache.timestamp) < CACHE_DURATION) {
      setCanvases(canvasesCache.data);
      return;
    }
    
    await loadCanvases();
    
    // キャッシュを更新
    setCanvasesCache({ data: canvases, timestamp: now });
  }, [canvasesCache, canvases]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCanvasesWithCache();
    }
  }, [isAuthenticated, loadCanvasesWithCache]); // userを依存配列から削除

  const loadCanvases = useCallback(async () => {
    // タイムアウトを設定（30秒）
    const timeoutId = setTimeout(() => {
      setIsLoadingCanvases(false)
    }, 30000)

    try {
      setIsLoadingCanvases(true)
      // ローカルストレージからキャンバス一覧を読み込み
      const canvasesKey = getUserStorageKey('notion-canvas-list');
      const savedCanvases = localStorage.getItem(canvasesKey);
      
      if (savedCanvases) {
        const data = JSON.parse(savedCanvases);
        const sortedData = data.sort((a: Canvas, b: Canvas) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setCanvases(sortedData);
        
        // ローカルのキャンバス数をSupabaseと同期
        const userId = user?.id;
        await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            updates: { canvas_count: sortedData.length }
          })
        });
      } else {
        // ローカルに何もない場合はSupabaseからも確認
        const userId = user?.id;
        
        try {
          const response = await fetch(`/api/canvas/list?userId=${userId}`);
          if (response.ok) {
            const { canvases: supabaseCanvases } = await response.json();
            
            if (supabaseCanvases && supabaseCanvases.length > 0) {
              // Supabaseにキャンバスがある場合は復元
              setCanvases(supabaseCanvases);
              localStorage.setItem(canvasesKey, JSON.stringify(supabaseCanvases));
              
              // Supabaseのキャンバス数も更新
              await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  updates: { canvas_count: supabaseCanvases.length }
                })
              });
            } else {
              // Supabaseにも何もない場合
              setCanvases([]);
              await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  updates: { canvas_count: 0 }
                })
              });
            }
          } else {
            // Supabase読み込みエラーの場合
            setCanvases([]);
            await fetch('/api/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                updates: { canvas_count: 0 }
              })
            });
          }
        } catch (supabaseError) {
          console.error('Failed to load from Supabase:', supabaseError);
          setCanvases([]);
        }
      }
    } catch (error) {
      console.error('Failed to load canvases:', error);
      setCanvases([]);
    } finally {
      clearTimeout(timeoutId)
      setIsLoadingCanvases(false)
    }
  }, [user]);

  // ユーザー固有のキーを取得
  const getUserStorageKey = (baseKey: string) => {
    return user?.id ? `${baseKey}-${user.id}` : baseKey;
  };

  const [isCreating, setIsCreating] = useState(false);
  const [planLimitModal, setPlanLimitModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const { notification, closeNotification, showAlert, showConfirm, showError } = useNotification();

  // Tutorial (disable while loading)
  const tutorial = useTutorial(TUTORIAL_CONFIGS.DASHBOARD_FIRST_TIME, { disabled: loading });

  // 新しいキャンバスを作成
  const handleCreateCanvas = async () => {
    if (!newCanvas.name.trim()) {
      showAlert('キャンバス名を入力してください', '入力エラー');
      return;
    }

    if (isCreating) {
      return; // 既に作成中の場合は何もしない
    }

    setIsCreating(true);
    try {
      // プラン制限チェック
      if (userData) {
        const { checkCanvasLimit } = await import('@/lib/planLimits');
        
        console.log('🔍 Canvas Creation Plan Check:', {
          userData_plan: userData.plan,
          userData_effective_plan: userData.effective_plan,
          userData_canvas_count: userData.canvas_count,
          current_canvases_length: canvases.length
        });
        
        const limitCheck = checkCanvasLimit(userData);
        
        console.log('📊 Canvas Limit Check Result:', limitCheck);
        
        if (!limitCheck.allowed) {
          setPlanLimitModal({
            isOpen: true,
            title: '無料プランの制限に達しました',
            message: limitCheck.message || ''
          });
          setIsCreating(false);
          return;
        }
      }

      // ローカルストレージに直接保存
      const newCanvasData: Canvas = {
        id: crypto.randomUUID(),
        name: newCanvas.name,
        description: newCanvas.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };

      const canvasesKey = getUserStorageKey('notion-canvas-list');
      const existingCanvases = localStorage.getItem(canvasesKey);
      const canvasesList = existingCanvases ? JSON.parse(existingCanvases) : [];
      
      canvasesList.push(newCanvasData);
      localStorage.setItem(canvasesKey, JSON.stringify(canvasesList));

      // Supabaseにも空のキャンバスデータを作成
      const emptyCanvasData = {
        databases: [],
        relations: [],
        canvasState: { zoom: 1, panX: 0, panY: 0, selectedIds: [] },
        canvasInfo: {
          id: newCanvasData.id,
          name: newCanvasData.name,
          description: newCanvasData.description,
          createdAt: newCanvasData.createdAt,
          updatedAt: newCanvasData.updatedAt,
          isActive: newCanvasData.isActive
        },
        memo: ''
      };

      await fetch(`/api/canvas/${newCanvasData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, canvasData: emptyCanvasData })
      });

      // Supabaseのキャンバス数を更新
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          updates: { canvas_count: canvasesList.length }
        })
      });

      setNewCanvas({ name: '', description: '' });
      setIsCreateModalOpen(false);
      loadCanvases();
      
      // ユーザーデータを更新してプラン制限が正しく反映されるようにする
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      showError('キャンバスの作成でエラーが発生しました');
    } finally {
      setIsCreating(false);
    }
  };

  // キャンバスを更新
  const handleUpdateCanvas = async () => {
    if (!editingCanvas || !editingCanvas.name.trim()) {
      showAlert('キャンバス名を入力してください', '入力エラー');
      return;
    }

    try {
      const userId = user?.id;
      const updatedCanvas = {
        ...editingCanvas,
        updatedAt: new Date().toISOString()
      };

      // ローカルストレージを更新
      const canvasesKey = getUserStorageKey('notion-canvas-list');
      const existingCanvases = localStorage.getItem(canvasesKey);
      if (existingCanvases) {
        const canvasesList = JSON.parse(existingCanvases);
        const updatedList = canvasesList.map((canvas: Canvas) =>
          canvas.id === updatedCanvas.id ? updatedCanvas : canvas
        );
        localStorage.setItem(canvasesKey, JSON.stringify(updatedList));
      }

      // Supabaseからキャンバスデータを取得して更新
      const response = await fetch(`/api/canvas/${updatedCanvas.id}?userId=${userId}`);
      if (response.ok) {
        const { canvasData } = await response.json();
        
        // canvasInfoを更新してSupabaseに保存
        const updatedCanvasData = {
          ...canvasData,
          canvasInfo: updatedCanvas,
          updatedAt: updatedCanvas.updatedAt
        };

        await fetch(`/api/canvas/${updatedCanvas.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, canvasData: updatedCanvasData })
        });
      }

      setEditingCanvas(null);
      loadCanvases();
    } catch (error) {
      console.error('Canvas update error:', error);
      showError('キャンバスの更新でエラーが発生しました');
    }
  };

  // キャンバスを削除
  const handleDeleteCanvas = async (canvasId: string, canvasName: string) => {
    showConfirm(
      `「${canvasName}」を削除しますか？\nこの操作は取り消せません。`,
      async () => {
      try {
        // ローカルストレージから削除
        const canvasesKey = getUserStorageKey('notion-canvas-list');
        const existingCanvases = localStorage.getItem(canvasesKey);
        
        if (existingCanvases) {
          const canvasesList = JSON.parse(existingCanvases);
          const updatedList = canvasesList.filter((canvas: Canvas) => canvas.id !== canvasId);
          localStorage.setItem(canvasesKey, JSON.stringify(updatedList));
        }

        // キャンバスのデータも削除（ローカル）
        const userIdSuffix = user?.id;
        const suffix = userIdSuffix ? `-${userIdSuffix}` : '';
        localStorage.removeItem(`notion-canvas-databases-${canvasId}${suffix}`);
        localStorage.removeItem(`notion-canvas-relations-${canvasId}${suffix}`);
        localStorage.removeItem(`notion-canvas-state-${canvasId}${suffix}`);

        // Supabase Storageからも削除
        const userId = user?.id;
        await fetch(`/api/canvas/${canvasId}?userId=${userId}`, {
          method: 'DELETE'
        });

        // Supabaseのキャンバス数を更新
        const updatedCanvases = localStorage.getItem(canvasesKey);
        const canvasCount = updatedCanvases ? JSON.parse(updatedCanvases).length : 0;
        
        await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            updates: { canvas_count: canvasCount }
          })
        });

        loadCanvasesWithCache(true);
        
        // ユーザーデータを更新してプラン制限が正しく反映されるようにする
        if (refreshUser) {
          await refreshUser();
        }
      } catch (error) {
        showError('キャンバスの削除でエラーが発生しました');
      }
      },
      '削除確認',
      '削除',
      'キャンセル'
    );
  };

  // キャンバスを複製
  const handleDuplicateCanvas = async (canvas: Canvas) => {
    try {
      // プラン制限チェック
      if (userData) {
        const { checkCanvasLimit } = await import('@/lib/planLimits');
        const limitCheck = checkCanvasLimit(userData);
        
        if (!limitCheck.allowed) {
          setPlanLimitModal({
            isOpen: true,
            title: '無料プランの制限に達しました',
            message: limitCheck.message || ''
          });
          return;
        }
      }

      // 新しいキャンバスIDを生成
      const newCanvasId = crypto.randomUUID();
      
      // 元のキャンバスのデータをSupabaseから読み込み
      const userId = user?.id;
      const originalDataResponse = await fetch(`/api/canvas/${canvas.id}?userId=${userId}`);
      
      if (originalDataResponse.ok) {
        const { canvasData: originalData } = await originalDataResponse.json();
        
        // IDマッピングを作成
        const databaseIdMap = new Map();
        const propertyIdMap = new Map();
        
        // 新しいキャンバスに元のデータをコピー（IDは新しく生成）
        const copiedDatabases = originalData.databases?.map((db: any) => {
          const newDbId = crypto.randomUUID();
          databaseIdMap.set(db.id, newDbId);
          
          const copiedProperties = db.properties?.map((prop: any) => {
            const newPropId = crypto.randomUUID();
            propertyIdMap.set(prop.id, newPropId);
            
            return {
              ...prop,
              id: newPropId
            };
          }) || [];
          
          return {
            ...db,
            id: newDbId,
            properties: copiedProperties
          };
        }) || [];
          
          // リレーション設定を新しいIDにマッピング
          copiedDatabases.forEach(db => {
            db.properties.forEach((prop: any) => {
              if (prop.type === 'relation' && prop.relationConfig?.targetDatabaseId) {
                const newTargetId = databaseIdMap.get(prop.relationConfig.targetDatabaseId);
                const newLinkedPropertyId = propertyIdMap.get(prop.relationConfig.linkedPropertyId);
                
                if (newTargetId) {
                  prop.relationConfig.targetDatabaseId = newTargetId;
                  if (newLinkedPropertyId) {
                    prop.relationConfig.linkedPropertyId = newLinkedPropertyId;
                  }
                } else {
                  // ターゲットが見つからない場合はリセット
                  prop.relationConfig = {
                    targetDatabaseId: '',
                    isDualProperty: false,
                    isParent: true
                  };
                }
              }
            });
          });
          
          // リレーションも新しいIDにマッピング
          const copiedRelations = originalData.relations?.map((rel: any) => {
            const newFromDbId = databaseIdMap.get(rel.fromDatabaseId);
            const newToDbId = databaseIdMap.get(rel.toDatabaseId);
            const newFromPropId = propertyIdMap.get(rel.fromPropertyId);
            const newToPropId = propertyIdMap.get(rel.toPropertyId);
            
            if (newFromDbId && newToDbId) {
              return {
                ...rel,
                id: crypto.randomUUID(),
                fromDatabaseId: newFromDbId,
                toDatabaseId: newToDbId,
                fromPropertyId: newFromPropId,
                toPropertyId: newToPropId
              };
            }
            return null;
          }).filter(Boolean) || [];
        
        // 複製したキャンバスデータを作成
        const copiedData = {
          ...originalData,
          databases: copiedDatabases,
          relations: copiedRelations,
          canvasState: {
            zoom: 1,
            panX: 0,
            panY: 0,
            selectedIds: []
          },
          canvasInfo: {
            id: newCanvasId,
            name: `${canvas.name} (コピー)`,
            description: canvas.description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
          }
        };
        
        console.log('Copying canvas data:', { originalData, copiedData });
        
        // ローカルストレージに新しいキャンバスを追加
        const newCanvasInfo: Canvas = {
          id: newCanvasId,
          name: `${canvas.name} (コピー)`,
          description: canvas.description || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        };
        
        const canvasesKey = getUserStorageKey('notion-canvas-list');
        const existingCanvases = localStorage.getItem(canvasesKey);
        const canvasesList = existingCanvases ? JSON.parse(existingCanvases) : [];
        canvasesList.push(newCanvasInfo);
        localStorage.setItem(canvasesKey, JSON.stringify(canvasesList));
        
        // Supabase Storageに保存
        const saveResponse = await fetch(`/api/canvas/${newCanvasId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, canvasData: copiedData })
        });
        
        if (!saveResponse.ok) {
          console.error('Failed to save copied canvas data:', await saveResponse.text());
          showError('キャンバスのデータ保存に失敗しました');
        } else {
          console.log('Canvas data saved successfully');
          
          // Supabaseのキャンバス数を更新
          await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              updates: { canvas_count: canvasesList.length }
            })
          });
        }
        
        loadCanvasesWithCache(true);
        
        // ユーザーデータを更新してプラン制限が正しく反映されるようにする
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        console.error('Failed to load original canvas data:', await originalDataResponse.text());
        showError('元のキャンバスデータの読み込みに失敗しました');
      }
    } catch (error) {
      showError('キャンバスの複製でエラーが発生しました');
    }
  };

  // ログアウト（メモ化）
  const handleLogout = useCallback(async () => {
    try {
      const { signOut } = await import('@/lib/auth');
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // フォールバック
      window.location.href = '/';
    }
  }, [router]);

  // 日時フォーマット（メモ化）
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // インライン編集を開始
  const startInlineEdit = (canvasId: string, fieldType: 'name' | 'description', currentValue: string) => {
    setEditingFieldId(canvasId);
    setEditingFieldType(fieldType);
    setEditingValue(currentValue);
  };

  // インライン編集を保存
  const saveInlineEdit = async () => {
    if (!editingFieldId || !editingFieldType) return;
    
    const canvas = canvases.find(c => c.id === editingFieldId);
    if (!canvas) return;

    const updatedCanvas = {
      ...canvas,
      [editingFieldType]: editingValue
    };

    try {
      const response = await fetch('/api/canvases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCanvas)
      });

      if (response.ok) {
        loadCanvasesWithCache(true);
      }
    } catch (error) {
      console.error('Failed to update canvas:', error);
    }

    setEditingFieldId(null);
    setEditingFieldType(null);
    setEditingValue('');
  };

  // インライン編集をキャンセル
  const cancelInlineEdit = () => {
    setEditingFieldId(null);
    setEditingFieldType(null);
    setEditingValue('');
  };

  // ソートされたキャンバス（メモ化）
  const sortedCanvases = useMemo(() => {
    return [...canvases].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [canvases]);

  // プラン表示情報（メモ化）
  const planDisplayInfo = useMemo(() => {
    if (!userData) return null;
    return getPlanDisplayInfo(userData);
  }, [userData]);

  // ローディング中 - タイムアウトあり
  if (loading || isLoadingCanvases) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">
            {loading ? '認証を確認中...' : 'キャンバスを読み込み中...'}
          </p>
          {loading && (
            <p className="text-sm text-gray-500">
              長時間かかる場合はページをリロードしてください
            </p>
          )}
        </div>
      </div>
    );
  }

  // 未認証の場合は何も表示しない（useEffectでリダイレクト）
  if (!isAuthenticated) {
    console.log('🚫 Dashboard: User not authenticated, returning null')
    return null;
  }

  console.log('✅ Dashboard: Rendering main content...')

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3" data-tutorial="dashboard-header">
              <h1 className="text-xl font-semibold text-gray-900">
                Notion Database Canvas
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* プラン情報表示 */}
              {userData && (() => {
                // getEffectivePlan関数を使って正確なプラン判定を行う
                console.log('🔍 Dashboard Plan Debug:', {
                  plan: userData.plan,
                  effective_plan: userData.effective_plan,
                  plan_source: userData.plan_source,
                  trial_expires_at: userData.trial_expires_at,
                  canvas_count: userData.canvas_count
                });
                
                const effectivePlan = getEffectivePlan(userData);
                const isPremium = effectivePlan === 'premium';
                
                console.log('📊 Dashboard Plan Result:', {
                  effectivePlan,
                  isPremium
                });
                
                return (
                  <div className="hidden md:flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg" data-tutorial="plan-info">
                    {planDisplayInfo && (() => {
                      const PlanIcon = planDisplayInfo.icon;
                      return (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${planDisplayInfo.color}`}>
                          <PlanIcon size={12} />
                          {planDisplayInfo.label}
                        </div>
                      );
                    })()}
                    <div className="text-xs text-gray-600">
                      {isPremium ? (
                        <>キャンバス: {sortedCanvases.length}/無制限 | エクスポート: {userData.export_count}/無制限</>
                      ) : (
                        <>キャンバス: {sortedCanvases.length}/2 | エクスポート: {userData.export_count}/10</>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="設定"
              >
                <Settings size={16} />
                <span className="hidden sm:inline text-sm">設定</span>
              </button>
              
              <button
                onClick={() => {
                  console.log('Profile button clicked');
                  window.location.href = '/profile';
                }}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="マイページ"
              >
                <User size={16} />
                <span className="hidden sm:inline text-sm">マイページ</span>
              </button>

              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline text-sm">ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ページタイトルと新規作成 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">マイキャンバス</h1>
            <p className="text-gray-600">作成したデータベースキャンバスを管理できます</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            data-tutorial="create-button"
          >
            <Plus size={18} />
            新規作成
          </button>
        </div>

        {/* キャンバス一覧 */}
        <div data-tutorial="canvas-list">
        {sortedCanvases.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus className="text-gray-400" size={24} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">キャンバスがありません</h3>
            <p className="text-gray-600 mb-6">最初のキャンバスを作成してみましょう</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              キャンバス作成
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {sortedCanvases.map((canvas, index) => (
              <div 
                key={canvas.id} 
                className={`p-4 hover:bg-gray-50 transition-colors ${index > 0 ? 'border-t border-gray-200' : ''}`}
                onMouseEnter={() => setHoveredCanvasId(canvas.id)}
                onMouseLeave={() => setHoveredCanvasId(null)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-medium text-gray-900 truncate">
                        {canvas.name}
                      </h3>
                      {canvas.isActive && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                          アクティブ
                        </span>
                      )}
                    </div>
                    
                    {canvas.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {canvas.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>作成: {formatDate(canvas.createdAt)}</span>
                      <span>更新: {formatDate(canvas.updatedAt)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-4">
                    <Link
                      href={`/canvas/${canvas.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                      <Eye size={14} />
                      開く
                    </Link>
                    
                    <button
                      onClick={() => setEditingCanvas(canvas)}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                      title="編集"
                    >
                      <Edit2 size={14} />
                    </button>
                    
                    <button
                      onClick={() => handleDuplicateCanvas(canvas)}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                      title="複製"
                    >
                      <Copy size={14} />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteCanvas(canvas.id, canvas.name)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {/* 新規作成モーダル */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md">
            <div className="p-8 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">新しいキャンバス作成</h3>
              <p className="text-gray-600 mt-2">データベーススキーマの設計を始めましょう</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  キャンバス名 *
                </label>
                <input
                  type="text"
                  placeholder="例: ECサイトデータベース"
                  value={newCanvas.name}
                  onChange={(e) => setNewCanvas(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  説明（任意）
                </label>
                <textarea
                  placeholder="このキャンバスの目的や内容を記述"
                  value={newCanvas.description}
                  onChange={(e) => setNewCanvas(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder-gray-400 resize-none"
                />
              </div>
            </div>
            
            <div className="p-8 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewCanvas({ name: '', description: '' });
                }}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateCanvas}
                disabled={isCreating}
                className={`px-8 py-3 rounded-lg transition-all font-medium ${
                  isCreating 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isCreating ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 編集モーダル */}
      {editingCanvas && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">キャンバスを編集</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  キャンバス名 *
                </label>
                <input
                  type="text"
                  value={editingCanvas.name}
                  onChange={(e) => setEditingCanvas(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明（任意）
                </label>
                <textarea
                  value={editingCanvas.description || ''}
                  onChange={(e) => setEditingCanvas(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setEditingCanvas(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateCanvas}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg border border-gray-200 shadow-2xl w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">設定</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-gray-600 text-sm">
                ダッシュボード全体の設定です。これらの設定は新しく作成されるキャンバスのデフォルト値として使用されます。
              </p>
              

              {/* デフォルトキャンバス設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  新規キャンバスのデフォルト設定
                </label>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dashboardSettings.defaultGridVisible}
                      onChange={(e) => setDashboardSettings(prev => ({ ...prev, defaultGridVisible: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700">グリッドを表示</span>
                  </label>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      ズーム感度: {(dashboardSettings.defaultZoomSensitivity * 100).toFixed(1)}%
                    </label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.05"
                      step="0.005"
                      value={dashboardSettings.defaultZoomSensitivity}
                      onChange={(e) => setDashboardSettings(prev => ({ ...prev, defaultZoomSensitivity: parseFloat(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 自動保存設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  自動保存間隔
                </label>
                <select
                  value={dashboardSettings.autoSaveInterval}
                  onChange={(e) => setDashboardSettings(prev => ({ ...prev, autoSaveInterval: parseInt(e.target.value) }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value={10}>10秒</option>
                  <option value={30}>30秒</option>
                  <option value={60}>1分</option>
                  <option value={180}>3分</option>
                  <option value={300}>5分</option>
                </select>
              </div>

              {/* チュートリアル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ヘルプ・チュートリアル
                </label>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    基本的な操作方法をもう一度確認したい場合は、チュートリアルを再表示できます。
                  </p>
                  <button
                    onClick={() => {
                      console.log('Tutorial restart button clicked');
                      tutorial.restartTutorial();
                      setIsSettingsOpen(false);
                      console.log('Tutorial restarted, settings closed');
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                      <circle cx="12" cy="17" r=".5"/>
                    </svg>
                    チュートリアルを再表示
                  </button>
                </div>
              </div>

              {/* Notion連携設定 */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gray-900 rounded-lg">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.906c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046 1.121-.56 1.121-1.167V6.354c0-.606-.233-.933-.746-.887l-15.177.887c-.56.047-.935.467-.935 1.027zm13.748.327c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">Notion連携設定</h3>
                </div>

                <div className="space-y-4">
                  {/* 連携状態 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Key size={16} className="text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">APIキー設定</p>
                        <p className="text-xs text-gray-600 mb-3">
                          NotionデータベースへエクスポートするにはAPIキーが必要です
                        </p>
                        <input
                          type="password"
                          placeholder="secret_..."
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* セットアップガイド */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <BookOpen size={16} />
                        セットアップガイド
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
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
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                          2
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">APIキーをコピー</p>
                          <p className="text-xs text-gray-600">
                            作成したインテグレーションのシークレットキーをコピーして上記フィールドに貼り付けます
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                          3
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">ページにアクセス権限を付与</p>
                          <p className="text-xs text-gray-600">
                            エクスポート先のNotionページでインテグレーションを招待します
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 注意事項 */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800">
                      <span className="font-medium">注意:</span> APIキーは暗号化されてブラウザに保存されます。共有端末での使用は推奨しません。
                    </p>
                  </div>
                </div>
              </div>

            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      {/* プラン制限モーダル */}
      <PlanLimitModal
        isOpen={planLimitModal.isOpen}
        onClose={() => setPlanLimitModal(prev => ({ ...prev, isOpen: false }))}
        title={planLimitModal.title}
        message={planLimitModal.message}
        onUpgrade={() => {
          window.open('/profile', '_blank');
          setPlanLimitModal(prev => ({ ...prev, isOpen: false }));
        }}
      />
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
      {/* チュートリアル */}
      <TutorialOverlay
        isActive={tutorial.isActive}
        currentStep={tutorial.currentStepData}
        currentStepIndex={tutorial.currentStep}
        totalSteps={tutorial.totalSteps}
        isFirstStep={tutorial.isFirstStep}
        isLastStep={tutorial.isLastStep}
        onNext={tutorial.nextStep}
        onPrev={tutorial.prevStep}
        onSkip={tutorial.skipTutorial}
        onComplete={tutorial.completeTutorial}
        skippable={TUTORIAL_CONFIGS.DASHBOARD_FIRST_TIME.skippable}
      />
    </div>
  );
}