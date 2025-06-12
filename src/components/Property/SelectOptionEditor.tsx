'use client';

import { useState } from 'react';
import { SelectOption } from '@/types';
import { Plus, Trash2, Palette, Edit3, ChevronDown, ChevronUp } from 'lucide-react';

interface SelectOptionEditorProps {
  options: SelectOption[];
  onUpdate: (options: SelectOption[]) => void;
  multiSelect?: boolean;
  selectedValues?: string[];
  onSelectValue?: (valueId: string) => void;
}

const PRESET_COLORS = [
  '#666460', '#afaba3', '#a87964', '#d09b46', '#de8031',
  '#598e71', '#4a8bb2', '#9b74b7', '#c75f96', '#d95f59'
];

export default function SelectOptionEditor({ options, onUpdate, multiSelect = false, selectedValues = [], onSelectValue }: SelectOptionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true); // デフォルトで展開
  const [newOptionName, setNewOptionName] = useState('');

  const addOption = () => {
    if (!newOptionName.trim()) return;
    
    const newOption: SelectOption = {
      id: crypto.randomUUID(),
      name: newOptionName.trim(),
      color: PRESET_COLORS[options.length % PRESET_COLORS.length]
    };
    onUpdate([...options, newOption]);
    setNewOptionName(''); // 入力フィールドをクリア
  };

  const updateOption = (id: string, updates: Partial<SelectOption>) => {
    onUpdate(options.map(opt => opt.id === id ? { ...opt, ...updates } : opt));
  };

  const deleteOption = (id: string) => {
    onUpdate(options.filter(opt => opt.id !== id));
  };

  return (
    <div className="mt-3 border border-gray-200 rounded-lg bg-white">
      {/* ヘッダー */}
      <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-gray-600" />
            <span className="text-sm font-semibold text-gray-800">
              {multiSelect ? 'マルチセレクト' : 'セレクト'}オプション
            </span>
            <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">
              {options.length}個
            </span>
          </div>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3">
          {/* オプション一覧 */}
          {options.length > 0 && (
            <div className="space-y-2 mb-3">
              {options.map(option => (
                <OptionItem
                  key={option.id}
                  option={option}
                  onUpdate={(updates) => updateOption(option.id, updates)}
                  onDelete={() => deleteOption(option.id)}
                  isSelected={selectedValues.includes(option.id)}
                  onSelect={multiSelect && onSelectValue ? () => onSelectValue(option.id) : undefined}
                />
              ))}
            </div>
          )}
          
          {/* 新しいオプション追加 */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addOption()}
                placeholder="新しいオプション名を入力..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={addOption}
                disabled={!newOptionName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Plus size={14} />
                追加
              </button>
            </div>
          </div>
          
          {options.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Palette size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">まだオプションがありません</p>
              <p className="text-xs text-gray-400">上の入力欄から最初のオプションを追加してください</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface OptionItemProps {
  option: SelectOption;
  onUpdate: (updates: Partial<SelectOption>) => void;
  onDelete: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

function OptionItem({ option, onUpdate, onDelete, isSelected = false, onSelect }: OptionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isSelected 
          ? 'bg-blue-50 border-blue-300 hover:border-blue-400' 
          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect}
    >
      {/* カラーピッカー */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(!showColorPicker);
          }}
          className="w-8 h-8 rounded-lg border-2 border-white shadow-sm hover:scale-105 transition-transform flex items-center justify-center"
          style={{ backgroundColor: option.color }}
          title="色を変更"
        >
          <Palette size={12} className="text-white opacity-0 hover:opacity-100 transition-opacity" />
        </button>
        
        {showColorPicker && (
          <div className="absolute top-10 left-0 z-50 bg-white rounded-lg shadow-xl border p-4 min-w-[200px]">
            <div className="mb-2">
              <span className="text-xs font-medium text-gray-700">色を選択</span>
            </div>
            <div className="grid grid-cols-5 gap-2 max-w-[220px]">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({ color });
                    setShowColorPicker(false);
                  }}
                  className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
                    option.color === color ? 'border-gray-800' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(false);
              }}
              className="mt-3 w-full px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              閉じる
            </button>
          </div>
        )}
      </div>

      {/* オプション名 */}
      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={option.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsEditing(false);
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2">
            <span
              className="flex-1 text-sm font-medium text-gray-800 px-3 py-2 rounded-lg cursor-pointer hover:bg-white transition-colors"
              onClick={() => setIsEditing(true)}
              title="クリックして編集"
            >
              {option.name}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
              title="編集"
            >
              <Edit3 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* 削除ボタン */}
      <button
        onClick={onDelete}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="削除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}