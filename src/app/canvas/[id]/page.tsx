'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Canvas from '@/components/Canvas/Canvas';
import TutorialOverlay from '@/components/Tutorial/TutorialOverlay';
import { ArrowLeft, Save, Home } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTutorial, TUTORIAL_CONFIGS } from '@/hooks/useTutorial';

interface CanvasInfo {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const canvasId = params.id as string;
  const [canvasInfo, setCanvasInfo] = useState<CanvasInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'description' | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Tutorial (disable while loading)
  const tutorial = useTutorial(TUTORIAL_CONFIGS.CANVAS_FIRST_TIME, { disabled: isLoading });

  // 認証確認とキャンバス情報の読み込み
  useEffect(() => {
    if (authLoading) return; // 認証チェック中は待機
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user) {
      loadCanvasInfo();
    }
  }, [canvasId, authLoading, isAuthenticated, user]);

  // ユーザー固有のキーを取得
  const getUserStorageKey = (baseKey: string) => {
    return user?.id ? `${baseKey}-${user.id}` : baseKey;
  };

  const loadCanvasInfo = async () => {
    try {
      // ローカルストレージからキャンバス一覧を読み込み
      const canvasesKey = getUserStorageKey('notion-canvas-list');
      const savedCanvases = localStorage.getItem(canvasesKey);
      
      if (savedCanvases) {
        const canvases = JSON.parse(savedCanvases);
        const canvas = canvases.find((c: CanvasInfo) => c.id === canvasId);
        
        if (canvas) {
          setCanvasInfo(canvas);
        } else {
          // キャンバスが見つからない場合はダッシュボードにリダイレクト
          router.push('/dashboard');
        }
      } else {
        // キャンバス一覧がない場合はダッシュボードにリダイレクト
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to load canvas info:', error);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // 手動保存
  const handleSave = () => {
    // Canvas コンポーネントに保存イベントを送信
    window.dispatchEvent(new CustomEvent('save-canvas'));
    setLastSaved(new Date());
  };

  // インライン編集を開始
  const startInlineEdit = (fieldType: 'name' | 'description', currentValue: string) => {
    setEditingField(fieldType);
    setEditingValue(currentValue);
  };

  // インライン編集を保存
  const saveInlineEdit = async () => {
    if (!editingField || !canvasInfo) return;
    
    const updatedCanvas = {
      ...canvasInfo,
      [editingField]: editingValue
    };

    try {
      const response = await fetch('/api/canvases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCanvas)
      });

      if (response.ok) {
        setCanvasInfo(updatedCanvas);
      }
    } catch (error) {
      console.error('Failed to update canvas:', error);
    }

    setEditingField(null);
    setEditingValue('');
  };

  // インライン編集をキャンセル
  const cancelInlineEdit = () => {
    setEditingField(null);
    setEditingValue('');
  };

  // 認証チェック中または読み込み中
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? '認証確認中...' : 'キャンバスを読み込み中...'}
          </p>
        </div>
      </div>
    );
  }

  // 未認証の場合は何も表示しない（useEffectでリダイレクト）
  if (!isAuthenticated) {
    return null;
  }

  if (!canvasInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">キャンバスが見つかりません</h2>
          <p className="text-gray-600 mb-4">指定されたキャンバスは存在しないか、削除された可能性があります。</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Home size={16} />
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* キャンバス */}
      <Canvas 
        canvasId={canvasId} 
        canvasInfo={canvasInfo}
        onUpdateCanvasInfo={setCanvasInfo}
        onSaveCanvas={handleSave}
        lastSaved={lastSaved}
        editingField={editingField}
        editingValue={editingValue}
        onStartEdit={startInlineEdit}
        onSaveEdit={saveInlineEdit}
        onCancelEdit={cancelInlineEdit}
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
        skippable={TUTORIAL_CONFIGS.CANVAS_FIRST_TIME.skippable}
      />
    </div>
  );
}