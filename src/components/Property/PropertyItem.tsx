'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Property, PropertyType, Database } from '@/types';
import { Trash2, Type, Hash, Calendar, User, Check, Link as LinkIcon, List, Tag, GitBranch, BarChart3, FileText, Edit3, Activity, File, Mail, Phone, Calculator, Clock, UserCheck, MousePointer, Key, Timer, ChevronDown, Plus, CircleDot, CheckSquare, Users, Paperclip, AtSign, Zap, Loader, ArrowUpRight, Search, Sigma, Circle, GripVertical, Settings, X } from 'lucide-react';
import SelectOptionEditor from './SelectOptionEditor';
import MultiSelectDropdown from './MultiSelectDropdown';
import SelectDropdown from './SelectDropdown';
import ConfirmDialog from '../UI/ConfirmDialog';
import FormulaEditor from '../Formula/FormulaEditor';
import { generateId } from '@/lib/utils';

interface PropertyItemProps {
  property: Property;
  databases: Database[];
  currentDatabaseId: string;
  onUpdate: (updates: Partial<Property>) => void;
  onUpdateOtherDatabase: (id: string, updates: Partial<Database>) => void;
  onDelete: () => void;
  onDuplicate?: (property: Property) => void;
  confirmDeletion?: boolean;
  onReorder?: (dragIndex: number, dropIndex: number) => void;
  index: number;
}

const PRESET_COLORS = [
  '#666460', '#afaba3', '#a87964', '#d09b46', '#de8031',
  '#598e71', '#4a8bb2', '#9b74b7', '#c75f96', '#d95f59'
];

const propertyTypes: { value: PropertyType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'title', label: 'タイトル', icon: <Type size={14} />, color: 'text-gray-500' },
  { value: 'text', label: 'テキスト', icon: <Type size={14} />, color: 'text-gray-500' },
  { value: 'number', label: '数値', icon: <Hash size={14} />, color: 'text-gray-500' },
  { value: 'select', label: '選択', icon: <CircleDot size={14} />, color: 'text-gray-500' },
  { value: 'multi-select', label: 'マルチセレクト', icon: <List size={14} />, color: 'text-gray-500' },
  { value: 'status', label: 'ステータス', icon: <Loader size={14} />, color: 'text-gray-500' },
  { value: 'date', label: '日付', icon: <Calendar size={14} />, color: 'text-gray-500' },
  { value: 'person', label: 'ユーザー', icon: <User size={14} />, color: 'text-gray-500' },
  { value: 'files', label: 'ファイル&メディア', icon: <Paperclip size={14} />, color: 'text-gray-500' },
  { value: 'checkbox', label: 'チェックボックス', icon: <CheckSquare size={14} />, color: 'text-gray-500' },
  { value: 'url', label: 'URL', icon: <LinkIcon size={14} />, color: 'text-gray-500' },
  { value: 'email', label: 'メール', icon: <AtSign size={14} />, color: 'text-gray-500' },
  { value: 'phone', label: '電話', icon: <Phone size={14} />, color: 'text-gray-500' },
  { value: 'formula', label: '数式', icon: <Sigma size={14} />, color: 'text-gray-500' },
  { value: 'relation', label: 'リレーション', icon: <ArrowUpRight size={14} />, color: 'text-gray-500' },
  { value: 'rollup', label: 'ロールアップ', icon: <Search size={14} />, color: 'text-gray-500' },
  { value: 'created_time', label: '作成日時', icon: <Clock size={14} />, color: 'text-gray-500' },
  { value: 'created_by', label: '作成者', icon: <User size={14} />, color: 'text-gray-500' },
  { value: 'last_edited_time', label: '最終更新日時', icon: <Clock size={14} />, color: 'text-gray-500' },
  { value: 'last_edited_by', label: '最終更新者', icon: <User size={14} />, color: 'text-gray-500' },
  { value: 'button', label: 'ボタン', icon: <MousePointer size={14} />, color: 'text-gray-500' },
  { value: 'id', label: 'ID', icon: <span className="text-xs font-semibold">№</span>, color: 'text-gray-500' },
  { value: 'expiry', label: '有効期限', icon: <Circle size={14} className="stroke-dashed" />, color: 'text-gray-500' }
];

// Extract property references from formula expression
function extractReferencedProperties(expression: string): string[] {
  const regex = /prop\s*\(\s*["']([^"']+)["']\s*\)/g;
  const matches = [];
  let match;
  while ((match = regex.exec(expression)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)]; // Remove duplicates
}

export default function PropertyItem({ property, databases, currentDatabaseId, onUpdate, onUpdateOtherDatabase, onDelete, onDuplicate, confirmDeletion = true, onReorder, index }: PropertyItemProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showColorPickerId, setShowColorPickerId] = useState<string | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingOptionName, setEditingOptionName] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showColorPickerId && !target.closest('.color-picker')) {
        setShowColorPickerId(null);
      }
    };

    if (showColorPickerId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPickerId]);

  const updateOptionColor = (optionId: string, color: string) => {
    const updatedOptions = property.options?.map(opt => 
      opt.id === optionId ? { ...opt, color } : opt
    ) || [];
    onUpdate({ options: updatedOptions });
  };

  const updateOptionName = (optionId: string, name: string) => {
    if (!name.trim()) return;
    const updatedOptions = property.options?.map(opt => 
      opt.id === optionId ? { ...opt, name: name.trim() } : opt
    ) || [];
    onUpdate({ options: updatedOptions });
    setEditingOptionId(null);
  };

  const startEditingOption = (optionId: string, currentName: string) => {
    setEditingOptionId(optionId);
    setEditingOptionName(currentName);
  };

  const currentType = propertyTypes.find(type => type.value === property.type);
  const hasOptions = property.type === 'select' || property.type === 'multi-select' || property.type === 'status';
  const isConfigurable = hasOptions || property.type === 'relation' || property.type === 'rollup' || property.type === 'formula';

  // Check if this property has connections
  const hasRelationConnections = property.type === 'relation';
  
  // Formula connections - left side (output) for formula properties that reference something
  const hasFormulaOutputConnections = 
    property.type === 'formula' && property.formulaConfig?.referencedProperties?.length;
  
  // Formula connections - right side (input) for properties referenced by formulas
  const hasFormulaInputConnections = 
    databases.some(db => 
      db.properties.some(prop => 
        prop.type === 'formula' && 
        prop.formulaConfig?.referencedProperties?.some(ref => 
          ref === property.name || ref.endsWith(`.${property.name}`)
        )
      )
    );

  const handleTypeChange = (newType: PropertyType) => {
    const updates: Partial<Property> = { type: newType };
    
    if (newType === 'select' || newType === 'multi-select' || newType === 'status') {
      if (!property.options) {
        updates.options = [
          {
            id: generateId(),
            name: newType === 'status' ? 'Not started' : 'Option 1',
            color: newType === 'status' ? '#94a3b8' : '#3b82f6'
          }
        ];
      }
    } else {
      updates.options = undefined;
      updates.relationConfig = undefined;
      updates.rollupConfig = undefined;
    }
    
    onUpdate(updates);
  };

  const handleRelationChange = (targetDatabaseId: string) => {
    const prevTargetId = property.relationConfig?.targetDatabaseId;
    const isDualProperty = property.relationConfig?.isDualProperty;

    // Remove previous relation if it exists and was dual
    if (prevTargetId && isDualProperty && property.relationConfig?.linkedPropertyId) {
      const targetDb = databases.find(db => db.id === prevTargetId);
      if (targetDb) {
        const updatedProperties = targetDb.properties.filter(
          prop => prop.id !== property.relationConfig?.linkedPropertyId
        );
        onUpdateOtherDatabase(prevTargetId, { properties: updatedProperties });
      }
    }

    // If targetDatabaseId is empty, just clear the relation
    if (!targetDatabaseId) {
      onUpdate({ 
        relationConfig: {
          targetDatabaseId: '',
          isDualProperty: false,
          isParent: true
        }
      });
      return;
    }

    // Always create dual property when selecting a target database
    const relationConfig = {
      targetDatabaseId,
      isDualProperty: true, // Always enable dual property
      isParent: true // This side is always the parent (the one creating the relation)
    };

    onUpdate({ relationConfig });

    // Automatically create corresponding property on target database
    createChildRelationProperty(targetDatabaseId);
  };

  const createChildRelationProperty = (targetDatabaseId: string) => {
    const targetDb = databases.find(db => db.id === targetDatabaseId);
    if (!targetDb) {
      console.error('Target database not found:', targetDatabaseId);
      return;
    }

    const currentDb = databases.find(db => db.id === currentDatabaseId);
    if (!currentDb) {
      console.error('Current database not found:', currentDatabaseId);
      return;
    }

    // Check if a child property already exists to avoid duplicates
    const existingChildProperty = targetDb.properties.find(prop => 
      prop.type === 'relation' && 
      prop.relationConfig?.targetDatabaseId === currentDatabaseId &&
      prop.relationConfig?.linkedPropertyId === property.id
    );

    if (existingChildProperty) {
      // Update current property with existing child property ID
      onUpdate({
        relationConfig: {
          ...property.relationConfig,
          targetDatabaseId,
          isDualProperty: true,
          isParent: true,
          linkedPropertyId: existingChildProperty.id
        }
      });
      return;
    }

    // Create child property ID
    const childPropertyId = generateId();

    // Update current property with linked property ID
    onUpdate({
      relationConfig: {
        ...property.relationConfig,
        targetDatabaseId,
        isDualProperty: true,
        isParent: true,
        linkedPropertyId: childPropertyId
      }
    });

    // Create child property with better naming
    const childProperty = {
      id: childPropertyId,
      name: currentDb.name, // Use parent database name as child property name
      type: 'relation' as PropertyType,
      required: false,
      order: targetDb.properties.length,
      relationConfig: {
        targetDatabaseId: currentDatabaseId,
        isDualProperty: true,
        isParent: false,
        linkedPropertyId: property.id
      }
    };

    // Add child property to target database
    console.log('Adding child property to target database:', {
      targetDatabaseName: targetDb.name,
      childPropertyName: childProperty.name,
      currentProperties: targetDb.properties.length
    });
    
    onUpdateOtherDatabase(targetDatabaseId, {
      properties: [...targetDb.properties, childProperty]
    });
  };

  const handleDualPropertyToggle = (isDualProperty: boolean) => {
    const targetDatabaseId = property.relationConfig?.targetDatabaseId;
    
    if (!targetDatabaseId) {
      onUpdate({
        relationConfig: {
          ...property.relationConfig,
          isDualProperty
        }
      });
      return;
    }

    if (isDualProperty) {
      // Create child property
      createChildRelationProperty(targetDatabaseId);
    } else {
      // Remove child property if it exists
      if (property.relationConfig?.linkedPropertyId) {
        const targetDb = databases.find(db => db.id === targetDatabaseId);
        if (targetDb) {
          const updatedProperties = targetDb.properties.filter(
            prop => prop.id !== property.relationConfig?.linkedPropertyId
          );
          onUpdateOtherDatabase(targetDatabaseId, { properties: updatedProperties });
        }
      }

      // Update current property
      onUpdate({
        relationConfig: {
          ...property.relationConfig,
          isDualProperty: false,
          linkedPropertyId: undefined
        }
      });
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    e.dataTransfer.setData('dragIndex', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'));
    if (onReorder && dragIndex !== index) {
      onReorder(dragIndex, index);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className={`bg-white border-b border-gray-100 last:border-b-0 transition-all relative ${
        isDragging ? 'opacity-50' : ''
      } ${dragOver ? 'border-t-2 border-t-blue-500' : ''}`}
      draggable={true}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center gap-3 px-3 py-3 relative">
        {/* Hidden connection points for relations around the property - invisible but present for line drawing */}
        {hasRelationConnections && (
          <>
            <div 
              className="absolute right-0 top-1/2 w-2 h-2 opacity-0 rounded-full z-10 transform translate-x-1/2 -translate-y-1/2"
              data-property-id={property.id}
              data-property-name={property.name}
              data-connection-type="relation"
              data-connection-side="right"
            />
            <div 
              className="absolute left-0 top-1/2 w-2 h-2 opacity-0 rounded-full z-10 transform -translate-x-1/2 -translate-y-1/2"
              data-property-id={property.id}
              data-property-name={property.name}
              data-connection-type="relation"
              data-connection-side="left"
            />
          </>
        )}
        
        {/* Hidden connection points for formula outputs around the property - invisible but present for line drawing */}
        {hasFormulaOutputConnections && (
          <>
            <div 
              className="absolute right-0 top-1/2 w-2 h-2 opacity-0 rounded-full z-10 transform translate-x-1/2 -translate-y-1/2"
              data-property-id={property.id}
              data-property-name={property.name}
              data-connection-type="formula"
              data-connection-side="right"
            />
            <div 
              className="absolute left-0 top-1/2 w-2 h-2 opacity-0 rounded-full z-10 transform -translate-x-1/2 -translate-y-1/2"
              data-property-id={property.id}
              data-property-name={property.name}
              data-connection-type="formula"
              data-connection-side="left"
            />
          </>
        )}
        
        {/* Hidden connection points for formula inputs around the property - invisible but present for line drawing */}
        {hasFormulaInputConnections && !hasFormulaOutputConnections && (
          <>
            <div 
              className="absolute right-0 top-1/2 w-2 h-2 opacity-0 rounded-full z-10 transform translate-x-1/2 -translate-y-1/2"
              data-property-id={property.id}
              data-property-name={property.name}
              data-connection-type="formula"
              data-connection-side="right"
            />
            <div 
              className="absolute left-0 top-1/2 w-2 h-2 opacity-0 rounded-full z-10 transform -translate-x-1/2 -translate-y-1/2"
              data-property-id={property.id}
              data-property-name={property.name}
              data-connection-type="formula"
              data-connection-side="left"
            />
          </>
        )}
        <div className="cursor-move text-gray-400 hover:text-gray-600">
          <GripVertical size={14} />
        </div>
        
        <div 
          className={`flex items-center gap-1 p-1 rounded hover:bg-gray-100 transition-colors cursor-help ${currentType?.color || 'text-gray-500'}`}
          title={currentType?.label}
        >
          {currentType?.icon}
        </div>
        
        <div className="flex-1">
          {isEditingName ? (
            <input
              type="text"
              value={property.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              className="w-full text-sm font-medium bg-transparent border-none outline-none focus:outline-none"
              autoFocus
            />
          ) : (
            <div>
              <span
                className="text-sm font-medium cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => setIsEditingName(true)}
                title="プロパティ名を編集"
              >
                {property.name}
              </span>
              
              {/* マルチセレクトの選択された値を表示 */}
              {property.type === 'multi-select' && property.options && (
                <div className="flex items-center gap-1 ml-2">
                  {property.selectedValues && property.selectedValues.length > 0 ? (
                    <>
                      {property.selectedValues.slice(0, 2).map(valueId => {
                        const option = property.options?.find(opt => opt.id === valueId);
                        if (!option) return null;
                        return (
                          <span
                            key={valueId}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{
                              backgroundColor: option.color + '20',
                              color: option.color
                            }}
                          >
                            {option.name}
                          </span>
                        );
                      })}
                      {property.selectedValues.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{property.selectedValues.length - 2}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">未選択</span>
                  )}
                </div>
              )}
              
            </div>
          )}
        </div>

        {/* 設定ボタン - セレクト・マルチセレクト用 */}
        {property.type === 'select' && (
          <SelectDropdown
            options={property.options || []}
            onUpdate={(options) => onUpdate({ options })}
            onDelete={property.type !== 'title' ? onDelete : undefined}
            confirmDeletion={confirmDeletion}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
          />
        )}
        
        {property.type === 'multi-select' && (
          <MultiSelectDropdown
            options={property.options || []}
            onUpdate={(options) => onUpdate({ options })}
            onDelete={property.type !== 'title' ? onDelete : undefined}
            confirmDeletion={confirmDeletion}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
          />
        )}

        {/* 設定ボタン - タイトル以外のプロパティ用 */}
        {property.type !== 'title' && property.type !== 'multi-select' && property.type !== 'select' && 
         !(property.type === 'relation' && property.relationConfig?.isParent === false) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-md transition-all duration-150 relative ${
              property.type === 'relation' && !property.relationConfig?.targetDatabaseId
                ? 'text-red-600 bg-red-50 hover:bg-red-100'
                : isExpanded
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title={property.type === 'relation' && !property.relationConfig?.targetDatabaseId ? '接続先を設定してください' : '設定'}
          >
            {property.type === 'relation' && !property.relationConfig?.targetDatabaseId && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            )}
            <Settings size={14} />
          </button>
        )}

        {/* メモボタン */}
        <button
          onClick={() => setShowMemo(!showMemo)}
          className={`p-1.5 rounded-md transition-all duration-150 ${
            property.memo 
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title="メモ"
        >
          <FileText size={14} />
        </button>
      </div>

      {/* プロパティメモセクション */}
      {showMemo && (
        <div className="px-2.5 pb-2.5">
          <div className="border-t border-gray-100 pt-2.5">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={12} className="text-gray-600" />
              <span className="text-xs font-medium text-gray-700">プロパティメモ</span>
              <button
                onClick={() => setIsEditingMemo(!isEditingMemo)}
                className="p-0.5 hover:bg-gray-200 rounded transition-colors text-gray-500 hover:text-gray-700"
                title="メモを編集"
              >
                <Edit3 size={10} />
              </button>
            </div>
            
            {isEditingMemo ? (
              <textarea
                value={property.memo || ''}
                onChange={(e) => onUpdate({ memo: e.target.value })}
                onBlur={() => setIsEditingMemo(false)}
                placeholder="このプロパティの説明やメモを入力..."
                className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                autoFocus
              />
            ) : (
              <div
                onClick={() => setIsEditingMemo(true)}
                className="w-full p-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg min-h-[40px] cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {property.memo || 'このプロパティの説明やメモを入力...'}
              </div>
            )}
          </div>
        </div>
      )}



      {isExpanded && hasOptions && (
        <div className="px-2.5 pb-2.5">
          {property.type === 'status' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-2">
                ステータスプロパティはNotionのデフォルト設定を使用します
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">Not started</span>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-200 text-blue-700">In progress</span>
                <span className="px-2 py-1 text-xs rounded-full bg-green-200 text-green-700">Complete</span>
              </div>
            </div>
          ) : property.type === 'multi-select' || property.type === 'select' ? (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <h4 className="text-xs font-medium mb-3 text-gray-700">
                選択肢を管理
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    新しい選択肢を追加
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="選択肢名を入力..."
                      className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input?.value.trim()) {
                          const newOption = {
                            id: generateId(),
                            name: input.value.trim(),
                            color: ['#666460', '#afaba3', '#a87964', '#d09b46', '#de8031', '#598e71', '#4a8bb2', '#9b74b7', '#c75f96', '#d95f59'][(property.options?.length || 0) % 10]
                          };
                          onUpdate({ options: [...(property.options || []), newOption] });
                          input.value = '';
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      追加
                    </button>
                  </div>
                </div>

                {(property.options?.length || 0) > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {property.options?.map(option => (
                      <div key={option.id} className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setColorPickerPosition({ x: rect.left + 20, y: rect.top });
                              setShowColorPickerId(showColorPickerId === option.id ? null : option.id);
                            }}
                            className="w-4 h-4 rounded cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 flex-shrink-0"
                            style={{ backgroundColor: option.color }}
                            title="クリックして色を変更"
                          />
                        </div>
                        {editingOptionId === option.id ? (
                          <input
                            type="text"
                            value={editingOptionName}
                            onChange={(e) => setEditingOptionName(e.target.value)}
                            onBlur={() => updateOptionName(option.id, editingOptionName)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateOptionName(option.id, editingOptionName);
                              }
                              if (e.key === 'Escape') {
                                setEditingOptionId(null);
                              }
                            }}
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="flex-1 text-xs text-gray-700 cursor-pointer hover:text-gray-900"
                            onClick={() => startEditingOption(option.id, option.name)}
                          >
                            {option.name}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            const updatedOptions = property.options?.filter(opt => opt.id !== option.id) || [];
                            onUpdate({ options: updatedOptions });
                          }}
                          className="p-0.5 text-gray-400 hover:text-red-500 flex-shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* アクションボタン */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => {
                      if (onDuplicate) {
                        onDuplicate(property);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                  >
                    <Plus size={12} />
                    複製
                  </button>
                </div>
                
                {property.type !== 'title' && (
                  <button
                    onClick={() => {
                      if (confirmDeletion) {
                        setShowDeleteConfirm(true);
                      } else {
                        onDelete();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                    プロパティを削除
                  </button>
                )}
              </div>
            </div>
          ) : (
            <SelectOptionEditor
              options={property.options || []}
              onUpdate={(options) => onUpdate({ options })}
              multiSelect={property.type === 'multi-select'}
            />
          )}
        </div>
      )}

      {/* Status Property Configuration */}
      {isExpanded && property.type === 'status' && (
        <div className="px-3 pb-3">
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Loader size={16} className="text-gray-600" />
              ステータス設定
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  ステータスオプション
                </label>
                <div className="space-y-2">
                  {(property.options || []).map((option, index) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-gray-300 cursor-pointer"
                        style={{ backgroundColor: option.color }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setColorPickerPosition({ x: rect.left, y: rect.bottom + 5 });
                          setShowColorPickerId(option.id);
                        }}
                      />
                      <input
                        type="text"
                        value={option.name}
                        onChange={(e) => {
                          const newOptions = [...(property.options || [])];
                          newOptions[index] = { ...option, name: e.target.value };
                          onUpdate({ options: newOptions });
                        }}
                        className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                        placeholder="ステータス名"
                      />
                      <button
                        onClick={() => {
                          const newOptions = (property.options || []).filter((_, i) => i !== index);
                          onUpdate({ options: newOptions });
                        }}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      const newOption = {
                        id: generateId(),
                        name: 'New Status',
                        color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
                      };
                      onUpdate({ options: [...(property.options || []), newOption] });
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-600 border border-dashed border-gray-300 rounded hover:border-gray-400 hover:text-gray-700"
                  >
                    <Plus size={12} />
                    ステータス追加
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* アクションボタン */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  if (onDuplicate) {
                    const duplicatedProperty = {
                      ...property,
                      id: generateId(),
                      name: `${property.name} のコピー`,
                      order: property.order + 0.5
                    };
                    onDuplicate(duplicatedProperty);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
              >
                <Plus size={12} />
                複製
              </button>
            </div>
            
            {property.type !== 'title' && (
              <button
                onClick={() => {
                  if (confirmDeletion) {
                    setShowDeleteConfirm(true);
                  } else {
                    onDelete();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 size={14} />
                プロパティを削除
              </button>
            )}
          </div>
        </div>
      )}

      {/* Date Property Configuration */}
      {isExpanded && property.type === 'date' && (
        <div className="px-3 pb-3">
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-gray-600" />
              日付設定
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  日付形式
                </label>
                <select
                  value={property.dateConfig?.format || 'date'}
                  onChange={(e) => onUpdate({
                    dateConfig: {
                      ...property.dateConfig,
                      format: e.target.value as any
                    }
                  })}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="date">日付のみ</option>
                  <option value="datetime">日付と時刻</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={property.dateConfig?.includeTime || false}
                    onChange={(e) => onUpdate({
                      dateConfig: {
                        ...property.dateConfig,
                        includeTime: e.target.checked
                      }
                    })}
                    className="rounded"
                  />
                  時刻も含める
                </label>
              </div>
            </div>
          </div>
          
          {/* アクションボタン */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  if (onDuplicate) {
                    const duplicatedProperty = {
                      ...property,
                      id: generateId(),
                      name: `${property.name} のコピー`,
                      order: property.order + 0.5
                    };
                    onDuplicate(duplicatedProperty);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
              >
                <Plus size={12} />
                複製
              </button>
            </div>
            
            {property.type !== 'title' && (
              <button
                onClick={() => {
                  if (confirmDeletion) {
                    setShowDeleteConfirm(true);
                  } else {
                    onDelete();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 size={14} />
                プロパティを削除
              </button>
            )}
          </div>
        </div>
      )}

      {/* Number Property Configuration */}
      {isExpanded && property.type === 'number' && (
        <div className="px-3 pb-3">
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Hash size={16} className="text-gray-600" />
              数値設定
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  数値形式
                </label>
                <select
                  value={property.numberConfig?.format || 'number'}
                  onChange={(e) => onUpdate({
                    numberConfig: {
                      ...property.numberConfig,
                      format: e.target.value as any
                    }
                  })}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="number">数値</option>
                  <option value="currency">通貨</option>
                  <option value="percent">パーセント</option>
                </select>
              </div>
              
              {property.numberConfig?.format === 'currency' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    通貨
                  </label>
                  <select
                    value={property.numberConfig?.currency || 'JPY'}
                    onChange={(e) => onUpdate({
                      numberConfig: {
                        ...property.numberConfig,
                        currency: e.target.value
                      }
                    })}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="JPY">日本円 (¥)</option>
                    <option value="USD">米ドル ($)</option>
                    <option value="EUR">ユーロ (€)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          
          {/* アクションボタン */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  if (onDuplicate) {
                    const duplicatedProperty = {
                      ...property,
                      id: generateId(),
                      name: `${property.name} のコピー`,
                      order: property.order + 0.5
                    };
                    onDuplicate(duplicatedProperty);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
              >
                <Plus size={12} />
                複製
              </button>
            </div>
            
            {property.type !== 'title' && (
              <button
                onClick={() => {
                  if (confirmDeletion) {
                    setShowDeleteConfirm(true);
                  } else {
                    onDelete();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 size={14} />
                プロパティを削除
              </button>
            )}
          </div>
        </div>
      )}

      {/* Basic Properties Configuration (text, url, email, phone, etc.) */}
      {isExpanded && ['text', 'url', 'email', 'phone', 'checkbox', 'files', 'person'].includes(property.type) && (
        <div className="px-3 pb-3">
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              {property.type === 'text' && <Type size={16} className="text-gray-600" />}
              {property.type === 'url' && <LinkIcon size={16} className="text-gray-600" />}
              {property.type === 'email' && <AtSign size={16} className="text-gray-600" />}
              {property.type === 'phone' && <Phone size={16} className="text-gray-600" />}
              {property.type === 'checkbox' && <CheckSquare size={16} className="text-gray-600" />}
              {property.type === 'files' && <Paperclip size={16} className="text-gray-600" />}
              {property.type === 'person' && <User size={16} className="text-gray-600" />}
              {property.type === 'text' && 'テキスト設定'}
              {property.type === 'url' && 'URL設定'}
              {property.type === 'email' && 'メール設定'}
              {property.type === 'phone' && '電話設定'}
              {property.type === 'checkbox' && 'チェックボックス設定'}
              {property.type === 'files' && 'ファイル設定'}
              {property.type === 'person' && 'ユーザー設定'}
            </h4>
            
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <p className="text-xs text-blue-600">
                  この{property.type === 'text' ? 'テキスト' : 
                          property.type === 'url' ? 'URL' :
                          property.type === 'email' ? 'メール' :
                          property.type === 'phone' ? '電話番号' :
                          property.type === 'checkbox' ? 'チェックボックス' :
                          property.type === 'files' ? 'ファイル' :
                          property.type === 'person' ? 'ユーザー' : property.type}プロパティは基本設定で動作します。
                </p>
              </div>
            </div>
          </div>
          
          {/* アクションボタン */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  if (onDuplicate) {
                    const duplicatedProperty = {
                      ...property,
                      id: generateId(),
                      name: `${property.name} のコピー`,
                      order: property.order + 0.5
                    };
                    onDuplicate(duplicatedProperty);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
              >
                <Plus size={12} />
                複製
              </button>
            </div>
            
            {property.type !== 'title' && (
              <button
                onClick={() => {
                  if (confirmDeletion) {
                    setShowDeleteConfirm(true);
                  } else {
                    onDelete();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 size={14} />
                プロパティを削除
              </button>
            )}
          </div>
        </div>
      )}

      {isExpanded && property.type === 'relation' && property.relationConfig?.isParent !== false && (
        <div className="px-3 pb-3">
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <h4 className="text-xs font-medium mb-2 text-gray-700">
              リレーション設定
            </h4>

            {/* 未接続の警告文 */}
            {!property.relationConfig?.targetDatabaseId && databases.filter(db => db.id !== currentDatabaseId).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                <p className="text-xs text-yellow-800">
                  接続先データベースを選択してください
                </p>
              </div>
            )}
            
            {databases.filter(db => db.id !== currentDatabaseId).length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500">
                  他のデータベースがありません
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    接続先データベース
                  </label>
                  <select
                    value={property.relationConfig?.targetDatabaseId || ''}
                    onChange={(e) => handleRelationChange(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">接続するデータベースを選択...</option>
                    {databases.filter(db => db.id !== currentDatabaseId).map(db => (
                      <option key={db.id} value={db.id}>
                        {db.name}
                      </option>
                    ))}
                  </select>
                  {property.relationConfig?.targetDatabaseId && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      ✓ {databases.find(db => db.id === property.relationConfig?.targetDatabaseId)?.name} に接続済み
                    </p>
                  )}
                </div>
                
                <div className="text-xs text-gray-600 mt-2">
                  <p>双方向リレーション（自動）</p>
                </div>
              </div>
            )}
            
            {/* アクションボタン */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => {
                    if (onDuplicate) {
                      const duplicatedProperty = {
                        ...property,
                        id: generateId(),
                        name: `${property.name} のコピー`,
                        order: property.order + 0.5
                      };
                      onDuplicate(duplicatedProperty);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                >
                  <Plus size={12} />
                  複製
                </button>
              </div>
              
              {property.type !== 'title' && (
                <button
                  onClick={() => {
                    if (confirmDeletion) {
                      setShowDeleteConfirm(true);
                    } else {
                      onDelete();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={14} />
                  プロパティを削除
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isExpanded && property.type === 'rollup' && (
        <div className="px-3 pb-3">
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <BarChart3 size={16} className="text-gray-600" />
              ロールアップ設定
            </h4>
            
            {/* Get relation properties from current database */}
            {(() => {
              // Find all properties of the current database that are relation type
              const currentDatabase = databases.find(db => db.id === currentDatabaseId) || { properties: [] };
              const relationProperties = currentDatabase.properties?.filter(prop => prop.type === 'relation') || [];
              
              if (relationProperties.length === 0) {
                return (
                  <div className="text-center py-6 space-y-3">
                    <div className="text-gray-400">
                      <BarChart3 size={32} className="mx-auto mb-2" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">No relation properties found</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Create a relation property first to use rollups
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                      <p className="text-xs text-blue-800">
                        💡 <strong>Tip:</strong> Rollups aggregate data from related databases. First create a relation property, then you can create rollups based on it.
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      リレーションプロパティ
                    </label>
                    <select
                      value={property.rollupConfig?.relationPropertyId || ''}
                      onChange={(e) => onUpdate({
                        rollupConfig: {
                          ...property.rollupConfig,
                          relationPropertyId: e.target.value,
                          targetPropertyId: property.rollupConfig?.targetPropertyId || '',
                          aggregation: property.rollupConfig?.aggregation || 'count'
                        }
                      })}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">リレーションプロパティを選択...</option>
                      {relationProperties.map(prop => (
                        <option key={prop.id} value={prop.id}>
                          🔗 {prop.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      集計方法
                    </label>
                    <select
                      value={property.rollupConfig?.aggregation || 'count'}
                      onChange={(e) => onUpdate({
                        rollupConfig: {
                          ...property.rollupConfig,
                          relationPropertyId: property.rollupConfig?.relationPropertyId || '',
                          targetPropertyId: property.rollupConfig?.targetPropertyId || '',
                          aggregation: e.target.value as any
                        }
                      })}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="count">📊 Count (number of related items)</option>
                      <option value="sum">➕ Sum (add up numbers)</option>
                      <option value="average">📈 Average (mean value)</option>
                      <option value="min">📉 Minimum (lowest value)</option>
                      <option value="max">📊 Maximum (highest value)</option>
                      <option value="earliest">📅 Earliest (first date)</option>
                      <option value="latest">📅 Latest (most recent date)</option>
                    </select>
                  </div>

                  {property.rollupConfig?.relationPropertyId && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-xs font-medium text-blue-700 mb-1">プレビュー:</p>
                      <p className="text-xs text-blue-600">
                        <strong>{relationProperties.find(p => p.id === property.rollupConfig?.relationPropertyId)?.name}</strong> を通じて関連するレコードの <strong>{property.rollupConfig.aggregation}</strong> を計算します。
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          
          {/* アクションボタン */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  if (onDuplicate) {
                    const duplicatedProperty = {
                      ...property,
                      id: generateId(),
                      name: `${property.name} のコピー`,
                      order: property.order + 0.5
                    };
                    onDuplicate(duplicatedProperty);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
              >
                <Plus size={12} />
                複製
              </button>
            </div>
            
            {property.type !== 'title' && (
              <button
                onClick={() => {
                  if (confirmDeletion) {
                    setShowDeleteConfirm(true);
                  } else {
                    onDelete();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 size={14} />
                プロパティを削除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ - ここで移動 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
        title="プロパティを削除"
        message={`「${property.name}」プロパティを削除しますか？この操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        type="danger"
      />


      {isExpanded && property.type === 'formula' && (
        <div className="px-3 pb-3">
          <FormulaEditor
            property={property}
            databases={databases}
            currentDatabaseId={currentDatabaseId}
            onUpdate={onUpdate}
          />
          
          {/* アクションボタン */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  if (onDuplicate) {
                    onDuplicate(property);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
              >
                <Plus size={12} />
                複製
              </button>
            </div>
            
            {property.type !== 'title' && (
              <button
                onClick={() => {
                  if (confirmDeletion) {
                    setShowDeleteConfirm(true);
                  } else {
                    onDelete();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 size={14} />
                プロパティを削除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 基本プロパティの設定パネル（select、multi-select、relation、rollup、formula以外） */}
      {isExpanded && !hasOptions && property.type !== 'relation' && property.type !== 'rollup' && property.type !== 'formula' && property.type !== 'status' && (
        <div className="px-3 pb-3">
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <h4 className="text-xs font-medium mb-3 text-gray-700 flex items-center gap-2">
              {currentType?.icon}
              {currentType?.label} 設定
            </h4>
            
            <div className="space-y-3">
              {/* プロパティタイプ変更 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  プロパティタイプ
                </label>
                <select
                  value={property.type}
                  onChange={(e) => handleTypeChange(e.target.value as PropertyType)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 focus:outline-none"
                >
                  {propertyTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>


              {/* アクションボタン */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    if (onDuplicate) {
                      const duplicatedProperty = {
                        ...property,
                        id: generateId(),
                        name: `${property.name} のコピー`,
                        order: property.order + 0.5
                      };
                      onDuplicate(duplicatedProperty);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                >
                  <Plus size={12} />
                  複製
                </button>
                
                {property.type !== 'title' && (
                  <button
                    onClick={() => {
                      if (confirmDeletion) {
                        setShowDeleteConfirm(true);
                      } else {
                        onDelete();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors border border-red-200"
                  >
                    <Trash2 size={12} />
                    削除
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="プロパティの削除"
        message={`「${property.name}」を削除しますか？`}
        confirmLabel="削除"
        cancelLabel="キャンセル"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />

      {/* カラーピッカー */}
      {showColorPickerId && typeof window !== 'undefined' && createPortal(
        <div className="fixed z-[9999] bg-white rounded-lg shadow-xl border p-3 min-w-[180px] color-picker"
          style={{
            left: `${colorPickerPosition.x}px`,
            top: `${colorPickerPosition.y}px`
          }}
        >
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-700">色を選択</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={(e) => {
                  e.stopPropagation();
                  updateOptionColor(showColorPickerId, color);
                  setShowColorPickerId(null);
                }}
                className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                  property.options?.find(opt => opt.id === showColorPickerId)?.color === color ? 'border-gray-800' : 'border-gray-200'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}