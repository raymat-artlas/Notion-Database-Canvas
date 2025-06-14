'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { useTutorial, TUTORIAL_CONFIGS } from '@/hooks/useTutorial';
import DatabaseBox from '@/components/Database/DatabaseBox';
import ConnectionLine from '@/components/Connection/ConnectionLine';
import ToolBar from '@/components/UI/ToolBar';
import SettingsPanel from '@/components/Settings/SettingsPanel';
import DatabaseList from '@/components/DatabaseList/DatabaseList';
import NotionExportDialog from '@/components/Notion/NotionExportDialog';
import NotificationModal from '@/components/UI/NotificationModal';
import { ShareDialog } from '@/components/Canvas/ShareDialog';
import { useNotification } from '@/hooks/useNotification';
import { updateCanvasAccessTime, deleteExpiredCanvases } from '@/lib/canvasRetention';

interface CanvasInfo {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface CanvasProps {
  canvasId?: string;
  canvasInfo?: CanvasInfo | null;
  onUpdateCanvasInfo?: (info: CanvasInfo) => void;
  onSaveCanvas?: () => void;
  lastSaved?: Date | null;
  editingField?: 'name' | 'description' | null;
  editingValue?: string;
  onStartEdit?: (field: 'name' | 'description', value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}

export default function Canvas({ 
  canvasId, 
  canvasInfo, 
  onUpdateCanvasInfo, 
  onSaveCanvas, 
  lastSaved, 
  editingField, 
  editingValue, 
  onStartEdit, 
  onSaveEdit, 
  onCancelEdit 
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { user, userData } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showRelationLines, setShowRelationLines] = useState(true);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const [isNotionExportOpen, setIsNotionExportOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  
  const { notification, closeNotification, showAlert, showConfirm, showError, showSuccess, showInfo, showNotification } = useNotification();
  
  const canvasData = useCanvas(canvasId);
  const {
    databases,
    relations,
    canvasState,
    isLoading,
    addDatabase,
    updateDatabase,
    deleteDatabase,
    addRelation,
    deleteRelation,
    reorderDatabases,
    bringToFront,
    zoomIn,
    zoomOut,
    zoomAtPoint,
    resetView,
    focusDatabase,
    panCanvas,
    saveCanvasData,
    undo,
    redo,
    canUndo,
    canRedo
  } = canvasData;

  // メモ化されたデータベース接続ライン
  const relationLines = useMemo(() => {
    if (!showRelationLines) return [];
    return relations.map(relation => ({
      key: `relation-${relation.id}`,
      component: (
        <ConnectionLine
          key={`relation-${relation.id}`}
          fromDatabaseId={relation.fromDatabaseId}
          fromPropertyId={relation.fromPropertyId || ''}
          toDatabaseId={relation.toDatabaseId}
          toPropertyId={relation.toPropertyId || ''}
          type={relation.type === 'formula' ? 'formula' : 'relation'}
          databases={databases}
          canvasState={canvasState}
        />
      )
    }));
  }, [showRelationLines, relations, databases, canvasState]);

  // メモ化されたフォーミュラ依存ライン
  const formulaLines = useMemo(() => {
    if (!showRelationLines) return [];
    return databases.flatMap(database => 
      database.properties
        .filter(prop => prop.type === 'formula' && prop.formulaConfig?.referencedProperties)
        .flatMap(formulaProp => 
          formulaProp.formulaConfig!.referencedProperties
            .filter(refProp => !refProp.includes('.'))
            .map(refProp => {
              const targetProp = database.properties.find(p => p.name === refProp);
              if (targetProp) {
                return {
                  key: `formula-${formulaProp.id}-${refProp}`,
                  component: (
                    <ConnectionLine
                      key={`formula-${formulaProp.id}-${refProp}`}
                      fromDatabaseId={database.id}
                      fromPropertyId={formulaProp.id}
                      toDatabaseId={database.id}
                      toPropertyId={targetProp.id}
                      type="formula"
                      databases={databases}
                      canvasState={canvasState}
                    />
                  )
                };
              }
              return null;
            })
            .filter(Boolean) as { key: string; component: JSX.Element }[]
        )
    );
  }, [showRelationLines, databases, canvasState]);
  
  // Tutorial (disable while loading)
  const tutorial = useTutorial(TUTORIAL_CONFIGS.CANVAS_FIRST_TIME, { disabled: canvasData.isLoading });

  // メモの保存・読み込み
  useEffect(() => {
    const savedMemo = localStorage.getItem('canvas-memo');
    if (savedMemo) {
      setMemo(savedMemo);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('canvas-memo', memo);
  }, [memo]);

  const { settings, updateSettings, resetSettings } = useSettings();
  
  // キャンバスアクセス時刻の更新と期限切れチェック
  useEffect(() => {
    if (canvasId) {
      // アクセス時刻を更新
      updateCanvasAccessTime(canvasId, canvasInfo?.name || 'Untitled Canvas');
      
      // 期限切れキャンバスをチェック（無料プランの場合のみ）
      if (userData?.effective_plan === 'free') {
        const deletedCount = deleteExpiredCanvases('free');
        if (deletedCount > 0) {
          showNotification({
            type: 'warning',
            title: '期限切れキャンバスの削除',
            message: `${deletedCount}個の期限切れキャンバスが削除されました。無料プランでは30日間アクセスがないキャンバスは自動的に削除されます。`,
            confirmText: 'OK'
          });
        }
      }
    }
  }, [canvasId, canvasInfo?.name, userData?.effective_plan, showNotification]);



  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });
  const isSpaceKeyPressedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; touches: number } | null>(null);


  // Handle mouse events for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.metaKey || e.ctrlKey)) || (e.button === 0 && isSpaceKeyPressedRef.current)) { 
      // Middle mouse, Cmd/Ctrl+Left mouse, or Space+Left mouse
      e.preventDefault();
      e.stopPropagation();
      isPanningRef.current = true;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanningRef.current) {
      const deltaX = (e.clientX - lastPanPointRef.current.x) * settings.panSensitivity;
      const deltaY = (e.clientY - lastPanPointRef.current.y) * settings.panSensitivity;
      
      panCanvas(deltaX, deltaY);
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [panCanvas, settings.panSensitivity]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // Handle keyboard events for space key panning and undo/redo
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Undo: Cmd/Ctrl + Z
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    
    // Redo: Cmd/Ctrl + Shift + Z
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      redo();
      return;
    }
    
    // Space key for panning
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      isSpaceKeyPressedRef.current = true;
    }
  }, [undo, redo]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      isSpaceKeyPressedRef.current = false;
      isPanningRef.current = false; // Stop panning when space is released
    }
  }, []);

  // Touch events disabled for trackpad conflict resolution
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Disabled to prevent conflicts with trackpad zoom
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Disabled to prevent conflicts with trackpad zoom
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Disabled to prevent conflicts with trackpad zoom
  }, []);

  // Add event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleMouseMove, handleMouseUp, handleKeyDown, handleKeyUp]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">キャンバスを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <ToolBar 
        onAddDatabase={addDatabase}
        zoom={canvasState.zoom}
        onZoomIn={() => zoomIn(settings.zoomSensitivity)}
        onZoomOut={() => zoomOut(settings.zoomSensitivity)}
        onResetView={resetView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSave={onSaveCanvas || saveCanvasData}
        onToggleMemo={() => setIsMemoOpen(!isMemoOpen)}
        onExportToNotion={() => setIsNotionExportOpen(true)}
        onShareCanvas={() => setIsShareDialogOpen(true)}
        showRelationLines={showRelationLines}
        onToggleRelationLines={() => setShowRelationLines(!showRelationLines)}
        canvasInfo={canvasInfo}
        lastSaved={lastSaved}
        editingField={editingField}
        editingValue={editingValue}
        onStartEdit={onStartEdit}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        userPlan={userData?.effective_plan || 'free'}
        dataTutorial="toolbar"
        isVisible={isToolbarVisible}
        onToggleVisibility={() => setIsToolbarVisible(!isToolbarVisible)}
      />
      
      <div
        ref={canvasRef}
        id="canvas-viewport"
        className="canvas-container w-full h-full relative select-none bg-gray-100 dark:bg-gray-900"
        data-tutorial="canvas-area"
        style={{
          cursor: isPanningRef.current ? 'grabbing' : (isSpaceKeyPressedRef.current ? 'grab' : 'default')
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={(e) => {
          e.preventDefault();
          if (e.metaKey || e.ctrlKey) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;
              const isZoomIn = e.deltaY < 0;
              zoomAtPoint(settings.zoomSensitivity, mouseX, mouseY, isZoomIn);
            }
          }
        }}
      >
        {/* Background Pattern */}
        {settings.backgroundPattern !== 'none' && (
          <div 
            className="absolute inset-0 opacity-50"
            style={(() => {
              switch (settings.backgroundPattern) {
                case 'dots':
                  return {
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.4) 1px, transparent 0)`,
                    backgroundSize: '20px 20px'
                  };
                case 'grid':
                  return {
                    backgroundImage: `
                      linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  };
                default:
                  return {};
              }
            })()}
          />
        )}
        
        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${canvasState.panX}px, ${canvasState.panY}px) scale(${canvasState.zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Connection lines SVG - render BEFORE databases so they appear behind */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <g style={{ pointerEvents: 'auto' }}>
              {/* Relation connections */}
              {relationLines.map(line => line.component)}
              
              {/* Formula dependency connections (same-database only) */}
              {formulaLines.map(line => line.component)}
            </g>
          </svg>

          {/* Database boxes - render AFTER SVG so they appear on top */}
          {databases.map(database => (
            <DatabaseBox
              key={database.id}
              database={database}
              allDatabases={databases}
              onUpdate={(updates) => updateDatabase(database.id, updates)}
              onUpdateOtherDatabase={(id, updates) => updateDatabase(id, updates)}
              onDelete={() => deleteDatabase(database.id)}
              onConnect={addRelation}
              onBringToFront={() => bringToFront(database.id)}
              snapToGrid={settings.snapToGrid}
              confirmPropertyDeletion={settings.confirmPropertyDeletion}
              layerOrder={canvasState?.layerOrder || []}
            />
          ))}
        </div>
        
        {databases.length === 0 && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-600 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-2">無限キャンバス</h2>
              <p className="text-sm mb-4">「追加」をクリックして最初のデータベースを作成</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Cmd/Ctrl + マウスホイール: ズーム</p>
                <p>Cmd + ドラッグ / 中クリック / Space+クリック: パン</p>
                <p>データベースはどこにでも配置できます</p>
              </div>
            </div>
          </div>
        )}
        </div>
        
      {/* データベース一覧パネル */}
      <DatabaseList 
        databases={databases}
        onFocusDatabase={focusDatabase}
        onReorderDatabases={reorderDatabases}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onResetSettings={resetSettings}
        onResetTutorial={tutorial.restartTutorial}
        canvasId={canvasId}
        canvasName={databases.length > 0 ? `${databases.length}個のデータベース` : '空のキャンバス'}
      />

      {/* メモパネル */}
      {isMemoOpen && (
        <div className="fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">メモ</h3>
            <button
              onClick={() => setIsMemoOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* メモ入力エリア */}
          <div className="flex-1 p-4">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="ここにメモを入力してください..."
              className="w-full h-full resize-none border border-gray-200 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            />
          </div>
          
          {/* フッター */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              メモは自動的に保存されます
            </p>
          </div>
        </div>
      )}
      
      {/* Notionエクスポートダイアログ */}
      <NotionExportDialog
        isOpen={isNotionExportOpen}
        onClose={() => setIsNotionExportOpen(false)}
        databases={databases}
        canvasName={canvasInfo?.name}
      />
      
      {/* 共有ダイアログ */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        canvasId={canvasId || ''}
        canvasName={canvasInfo?.name}
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
    </div>
  );
}