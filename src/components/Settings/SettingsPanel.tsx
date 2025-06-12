'use client';

import { useState } from 'react';
import { AppSettings } from '@/types/settings';
import { X, Settings, RotateCcw, HelpCircle } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onResetTutorial?: () => void;
  canvasId?: string;
  canvasName?: string;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
  onResetTutorial,
  canvasId,
  canvasName
}: SettingsPanelProps) {
  const [operationMode, setOperationMode] = useState<'mac' | 'windows' | 'mouse'>('mac');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-96 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-gray-700 dark:text-gray-300" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">キャンバス設定</h2>
              {canvasName && <p className="text-sm text-gray-500 dark:text-gray-400">{canvasName}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Zoom Sensitivity */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-900 mb-1">ズーム感度</h3>
              <p className="text-sm text-gray-600">マウスホイールでのズーム速度を調整</p>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min="0.01"
                max="0.05"
                step="0.005"
                value={settings.zoomSensitivity}
                onChange={(e) => onUpdateSettings({ zoomSensitivity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1%</span>
                <span className="font-medium">{(settings.zoomSensitivity * 100).toFixed(1)}%</span>
                <span>5%</span>
              </div>
            </div>
          </div>

          {/* Pan Sensitivity */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-900 mb-1">パン感度</h3>
              <p className="text-sm text-gray-600">ドラッグでのキャンバス移動速度を調整</p>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.panSensitivity}
                onChange={(e) => onUpdateSettings({ panSensitivity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>遅い</span>
                <span className="font-medium">{settings.panSensitivity.toFixed(1)}x</span>
                <span>速い</span>
              </div>
            </div>
          </div>

          {/* Background Pattern */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-900 mb-1">背景パターン</h3>
              <p className="text-sm text-gray-600">キャンバスの背景デザインを選択</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'none', label: '無地' },
                  { value: 'dots', label: 'ドット' },
                  { value: 'grid', label: '方眼' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onUpdateSettings({ backgroundPattern: option.value as 'none' | 'dots' | 'grid' })}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-center group ${
                      settings.backgroundPattern === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div 
                        className={`w-8 h-8 mx-auto rounded border ${
                          settings.backgroundPattern === option.value ? 'border-blue-300' : 'border-gray-300'
                        }`}
                        style={(() => {
                          switch (option.value) {
                            case 'dots':
                              return {
                                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.8) 1px, transparent 0)',
                                backgroundSize: '4px 4px'
                              };
                            case 'grid':
                              return {
                                backgroundImage: `
                                  linear-gradient(rgba(148, 163, 184, 0.5) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(148, 163, 184, 0.5) 1px, transparent 1px)
                                `,
                                backgroundSize: '4px 4px'
                              };
                            default:
                              return { backgroundColor: '#f8fafc' };
                          }
                        })()}
                      />
                      <div className="text-xs font-medium">{option.label}</div>
                    </div>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.snapToGrid}
                  onChange={(e) => onUpdateSettings({ snapToGrid: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-700">グリッドに吸着</span>
              </label>
            </div>
          </div>

          {/* Property Deletion Confirmation */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-900 mb-1">プロパティ削除設定</h3>
              <p className="text-sm text-gray-600">データベースプロパティの削除時の動作</p>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.confirmPropertyDeletion}
                  onChange={(e) => onUpdateSettings({ confirmPropertyDeletion: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <span className="text-sm text-gray-700">プロパティ削除前に確認ダイアログを表示</span>
                  <p className="text-xs text-gray-500 mt-1">
                    誤ってプロパティを削除することを防ぎます
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 操作方法 */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-900 mb-1">操作方法</h3>
              <p className="text-sm text-gray-600">キーボードショートカットの設定</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  環境設定
                </label>
                <select
                  value={operationMode}
                  onChange={(e) => setOperationMode(e.target.value as 'mac' | 'windows' | 'mouse')}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="mac">Mac</option>
                  <option value="windows">Windows</option>
                  <option value="mouse">マウス</option>
                </select>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3 text-sm text-gray-700">
                  {operationMode === 'mac' && (
                    <>
                      <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">⌘</kbd>
                        <span>+ ピンチ: ズーム</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">⌘</kbd>
                        <span>+ ドラッグ: パン</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Space</kbd>
                        <span>+ ドラッグ: パン</span>
                      </div>
                    </>
                  )}
                  {operationMode === 'windows' && (
                    <>
                      <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Ctrl</kbd>
                        <span>+ ホイール: ズーム</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Ctrl</kbd>
                        <span>+ ドラッグ: パン</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Space</kbd>
                        <span>+ ドラッグ: パン</span>
                      </div>
                    </>
                  )}
                  {operationMode === 'mouse' && (
                    <>
                      <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Cmd/Ctrl</kbd>
                        <span>+ ホイール: ズーム</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">中クリック</kbd>
                        <span>+ ドラッグ: パン</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Space</kbd>
                        <span>+ ドラッグ: パン</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
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
              {onResetTutorial && (
                <button
                  onClick={() => {
                    onResetTutorial();
                    onClose();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                >
                  <HelpCircle size={16} />
                  チュートリアルを再表示
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between">
          <button
            onClick={onResetSettings}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            デフォルトに戻す
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
}