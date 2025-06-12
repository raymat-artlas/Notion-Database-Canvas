'use client';

import { Save, Plus, ZoomIn, ZoomOut, Settings, FileText, ArrowLeft, Upload, EyeOff, Eye, Share2, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface CanvasInfo {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface ToolBarProps {
  onAddDatabase: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onOpenSettings: () => void;
  onSave: () => void;
  onToggleMemo: () => void;
  onExportToNotion?: () => void;
  onShareCanvas?: () => void;
  showRelationLines: boolean;
  onToggleRelationLines: () => void;
  canvasInfo?: CanvasInfo | null;
  lastSaved?: Date | null;
  editingField?: 'name' | 'description' | null;
  editingValue?: string;
  onStartEdit?: (field: 'name' | 'description', value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  userPlan?: string;
  dataTutorial?: string;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

export default function ToolBar({ 
  onAddDatabase, 
  zoom, 
  onZoomIn, 
  onZoomOut, 
  onResetView,
  onOpenSettings,
  onSave,
  onToggleMemo,
  onExportToNotion,
  onShareCanvas,
  showRelationLines,
  onToggleRelationLines,
  canvasInfo,
  lastSaved,
  editingField,
  editingValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  userPlan,
  dataTutorial,
  isVisible = true,
  onToggleVisibility
}: ToolBarProps) {
  return (
    <>
      {/* メインツールバー */}
      <div 
        className={`fixed top-4 left-6 z-50 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 w-fit transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        data-tutorial={dataTutorial}
      >
      <div className="flex items-center gap-3">
        {/* ダッシュボードへ戻る */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          title="ダッシュボードに戻る">
          <ArrowLeft size={16} />
          <span>ダッシュボード</span>
        </Link>
        
        
        {/* Add Database Button */}
        <button
          onClick={onAddDatabase}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg transition-colors"
          title="データベースを追加"
          data-tutorial="add-database-button"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">データベース追加</span>
        </button>

        <div className="w-px h-6 bg-gray-200" />

        {/* View Controls */}
        <button
          onClick={onToggleRelationLines}
          className={`p-2 rounded-lg transition-colors ${
            showRelationLines 
              ? 'bg-gray-900 text-white hover:bg-black' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title={showRelationLines ? 'リレーション線を非表示' : 'リレーション線を表示'}
        >
          {showRelationLines ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>

        <div className="w-px h-6 bg-gray-200" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="ズームアウト"
          >
            <ZoomOut size={16} />
          </button>
          
          <button
            onClick={onResetView}
            className="px-3 py-1 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-xs font-mono min-w-16 text-center"
            title="表示をリセット"
          >
            {Math.round(zoom * 100)}%
          </button>
          
          <button
            onClick={onZoomIn}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="ズームイン"
          >
            <ZoomIn size={16} />
          </button>
        </div>
        
        <div className="w-px h-6 bg-gray-200" />
        
        {/* 設定・保存 */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="設定"
          >
            <Settings size={16} />
          </button>
          
          <button
            onClick={onToggleMemo}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="メモ"
          >
            <FileText size={16} />
          </button>
          
          <button
            onClick={onSave}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="保存"
            data-tutorial="save-button"
          >
            <Save size={16} />
          </button>
          
          {onExportToNotion && (
            <button
              onClick={onExportToNotion}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title="Notionにエクスポート"
            >
              <Upload size={16} />
            </button>
          )}
          
          {false && onShareCanvas && (
            <button
              onClick={onShareCanvas}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title="キャンバスを共有"
            >
              <Share2 size={16} />
            </button>
          )}
        </div>
        
        <div className="w-px h-6 bg-gray-200" />
        
        {/* キャンバス情報 */}
        {canvasInfo && (
          <div className="flex items-center gap-2">
            <div data-tutorial="canvas-title">
              {editingField === 'name' ? (
                <input
                  type="text"
                  value={editingValue || ''}
                  onChange={(e) => onStartEdit?.('name', e.target.value)}
                  onBlur={onSaveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveEdit?.();
                    if (e.key === 'Escape') onCancelEdit?.();
                  }}
                  className="text-base font-semibold bg-gray-100 px-2 py-0.5 rounded outline-none w-48"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-base font-semibold text-gray-900 cursor-text hover:bg-gray-100 px-2 py-0.5 rounded"
                  onClick={() => onStartEdit?.('name', canvasInfo.name)}
                >
                  {canvasInfo.name}
                </h2>
              )}
            </div>
            {canvasInfo.description && (
              <div className="text-xs text-gray-500">
                {editingField === 'description' ? (
                  <input
                    type="text"
                    value={editingValue || ''}
                    onChange={(e) => onStartEdit?.('description', e.target.value)}
                    onBlur={onSaveEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveEdit?.();
                      if (e.key === 'Escape') onCancelEdit?.();
                    }}
                    className="text-xs bg-gray-100 px-2 py-0.5 rounded outline-none w-40"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="cursor-text hover:bg-gray-100 px-2 py-0.5 rounded"
                    onClick={() => onStartEdit?.('description', canvasInfo.description || '')}
                  >
                    {canvasInfo.description}
                  </span>
                )}
              </div>
            )}
            {lastSaved && (
              <div className="text-xs text-gray-400">
                最終保存: {lastSaved.toLocaleTimeString('ja-JP', { 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </>
  );
}