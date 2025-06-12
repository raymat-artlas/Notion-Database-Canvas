'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '@/types';
import { Trash2, Plus, GripVertical, FileText, Edit3, Type, Hash, Calendar, User, Check, Link as LinkIcon, List, Tag, GitBranch, BarChart3, Activity, File, Mail, Phone, Calculator, Clock, UserCheck, MousePointer, Key, Timer, Palette, CircleDot, CheckSquare, Paperclip, AtSign, Zap, Loader, ArrowUpRight, Search, Sigma, Circle, ChevronRight, ChevronDown } from 'lucide-react';
import PropertyItem from '@/components/Property/PropertyItem';
import { generateId } from '@/lib/utils';

interface DatabaseBoxProps {
  database: Database;
  allDatabases: Database[];
  onUpdate: (updates: Partial<Database>) => void;
  onUpdateOtherDatabase: (id: string, updates: Partial<Database>) => void;
  onDelete: () => void;
  onConnect: (fromId: string, toId: string) => void;
  snapToGrid?: boolean;
  confirmPropertyDeletion?: boolean;
}

const colorOptions = [
  { value: '#666460', label: '暗灰色' },
  { value: '#afaba3', label: '薄灰色' },
  { value: '#a87964', label: '茶色' },
  { value: '#d09b46', label: '黄金色' },
  { value: '#de8031', label: 'オレンジ' },
  { value: '#598e71', label: '緑' },
  { value: '#4a8bb2', label: '青' },
  { value: '#9b74b7', label: '紫' },
  { value: '#c75f96', label: 'ピンク' },
  { value: '#d95f59', label: '赤' }
];

export default function DatabaseBox({
  database,
  allDatabases,
  onUpdate,
  onUpdateOtherDatabase,
  onDelete,
  onConnect,
  snapToGrid = false,
  confirmPropertyDeletion = true
}: DatabaseBoxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPropertyTypeSelector, setShowPropertyTypeSelector] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // ⌘キー（Mac）またはCtrlキー（Windows/Linux）が押されている場合は、Canvas上のパン処理を優先
    if (e.metaKey || e.ctrlKey) {
      return; // 何もせずに、イベントをCanvasに伝播させる
    }
    
    // Only allow dragging if the target is the drag handle or header area
    const target = e.target as HTMLElement;
    const isDragHandle = target.closest('.drag-handle') || target.closest('.database-header');
    
    if (isDragHandle) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - database.x,
        y: e.clientY - database.y
      });
    }
  };

  // Track if component is mounted for portal rendering
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        onUpdate({
          x: snapToGridPoint(newX),
          y: snapToGridPoint(newY)
        });
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Close property selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is outside property type selector
      if (showPropertyTypeSelector) {
        // Check if click is on the trigger button or inside the dropdown
        const isInsideTrigger = selectorRef.current && selectorRef.current.contains(target);
        const isInsideDropdown = target.closest('[data-property-selector]');
        
        if (!isInsideTrigger && !isInsideDropdown) {
          console.log('Clicking outside property selector, closing');
          setShowPropertyTypeSelector(false);
        }
      }
      
      // Check if click is outside color picker
      if (showColorPicker) {
        const isInsideTrigger = colorPickerRef.current && colorPickerRef.current.contains(target);
        const isInsideDropdown = target.closest('[data-color-picker]');
        
        if (!isInsideTrigger && !isInsideDropdown) {
          setShowColorPicker(false);
        }
      }
    };

    // Add slight delay to allow the click event to complete
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPropertyTypeSelector, showColorPicker]);

  // Snap to grid utility function
  const snapToGridPoint = (value: number) => {
    if (!snapToGrid) return value;
    const gridSize = 20; // Match background dot pattern size
    return Math.round(value / gridSize) * gridSize;
  };

  const propertyTypes = [
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

  const addProperty = (propertyType = 'text') => {
    console.log('addProperty called with:', propertyType);
    console.log('Current properties:', database.properties);
    
    const propertyTypeInfo = propertyTypes.find(pt => pt.value === propertyType);
    const newProperty = {
      id: generateId('prop'),
      name: propertyTypeInfo?.label || 'テキスト',
      type: propertyType as any,
      required: false,
      order: database.properties.length,
      ...(propertyType === 'select' || propertyType === 'multi-select' || propertyType === 'status' ? {
        options: [{
          id: generateId(),
          name: propertyType === 'status' ? 'Not started' : 'Option 1',
          color: propertyType === 'status' ? '#94a3b8' : '#3b82f6'
        }]
      } : {}),
      ...(propertyType === 'multi-select' ? {
        selectedValues: []
      } : {})
    };
    
    console.log('New property:', newProperty);
    console.log('Calling onUpdate with properties:', [...database.properties, newProperty]);
    
    onUpdate({
      properties: [...database.properties, newProperty]
    });
    setShowPropertyTypeSelector(false);
  };

  const updateProperty = (propertyId: string, updates: any) => {
    onUpdate({
      properties: database.properties.map(prop =>
        prop.id === propertyId ? { ...prop, ...updates } : prop
      )
    });
  };

  const reorderProperties = (dragIndex: number, dropIndex: number) => {
    const newProperties = [...database.properties];
    const [draggedProperty] = newProperties.splice(dragIndex, 1);
    newProperties.splice(dropIndex, 0, draggedProperty);
    
    // Update order values
    const updatedProperties = newProperties.map((prop, idx) => ({
      ...prop,
      order: idx
    }));
    
    onUpdate({ properties: updatedProperties });
  };

  const deleteProperty = (propertyId: string) => {
    const propertyToDelete = database.properties.find(prop => prop.id === propertyId);
    
    // If deleting a parent relation property, also delete the child property
    if (propertyToDelete?.type === 'relation' && 
        propertyToDelete.relationConfig?.isParent !== false && 
        propertyToDelete.relationConfig?.linkedPropertyId) {
      
      const targetDatabaseId = propertyToDelete.relationConfig.targetDatabaseId;
      const linkedPropertyId = propertyToDelete.relationConfig.linkedPropertyId;
      
      // Remove the child property from the target database
      const targetDb = allDatabases.find(db => db.id === targetDatabaseId);
      if (targetDb) {
        const updatedProperties = targetDb.properties.filter(
          prop => prop.id !== linkedPropertyId
        );
        onUpdateOtherDatabase(targetDatabaseId, { properties: updatedProperties });
      }
    }
    
    // Remove the property from current database
    onUpdate({
      properties: database.properties.filter(prop => prop.id !== propertyId)
    });
  };

  const duplicateProperty = (property: any) => {
    // コピーの命名ロジック：「のコピー」が既についている場合は除去してから番号をつける
    let baseName = property.name;
    if (baseName.endsWith(' のコピー')) {
      baseName = baseName.replace(' のコピー', '');
    }
    
    // 同じベース名で始まるプロパティの数を数える
    const existingCopies = database.properties.filter(p => 
      p.name.startsWith(baseName) && (
        p.name === baseName ||
        p.name === `${baseName} のコピー` ||
        p.name.match(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} のコピー \\d+$`)
      )
    ).length;
    
    let copyName;
    if (existingCopies === 1) {
      // 初回コピーの場合
      copyName = `${baseName} のコピー`;
    } else {
      // 2回目以降のコピーの場合
      copyName = `${baseName} のコピー ${existingCopies}`;
    }
    
    const duplicatedProperty = {
      ...property,
      id: generateId('prop'),
      name: copyName,
      order: database.properties.length,
      // リレーションプロパティの場合は設定をクリア
      ...(property.type === 'relation' ? {
        relationConfig: {
          targetDatabaseId: '',
          isDualProperty: false,
          isParent: true
        }
      } : {})
    };
    
    onUpdate({
      properties: [...database.properties, duplicatedProperty]
    });
  };

  return (
    <div
      ref={boxRef}
      className="absolute bg-white dark:bg-gray-800 border-2 rounded-lg shadow-sm min-w-80 max-w-80 transition-shadow hover:shadow-md overflow-visible z-50"
      style={{
        left: database.x,
        top: database.y,
        borderColor: database.color,
      }}
      onMouseDown={(e) => {
        // ⌘キー（Mac）またはCtrlキー（Windows/Linux）が押されている場合はイベントを伝播
        if (e.metaKey || e.ctrlKey) {
          return;
        }
        handleMouseDown(e);
      }}
    >
      {/* Drag Handle at the top */}
      <div className="drag-handle flex justify-center py-1 cursor-grab active:cursor-grabbing hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg">
        <GripVertical size={16} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
      </div>
      
      <div 
        className="database-header p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={database.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              className="font-semibold text-lg bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 flex-1 min-w-0"
              autoFocus
              placeholder="Database name..."
            />
          ) : (
            <h3
              className="font-semibold text-lg cursor-pointer hover:opacity-75 transition-colors flex items-center gap-2 flex-1 min-w-0 truncate"
              style={{ color: database.color }}
              onClick={() => setIsEditing(true)}
            >
              {database.name}
              {database.isCollapsed && database.properties.length > 0 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">
                  {database.properties.length}
                </span>
              )}
            </h3>
          )}
        </div>
        
        <div className="flex gap-1 flex-shrink-0">
          <div className="relative">
            <button
              ref={colorPickerRef}
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-700"
              title="色を変更"
            >
              <Palette size={16} />
            </button>
            
            {/* Color Picker Dropdown - Rendered as Portal */}
            {showColorPicker && isMounted && createPortal(
              <div
                data-color-picker
                className="fixed bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-[99999] min-w-[220px]"
                style={{
                  top: colorPickerRef.current ? colorPickerRef.current.getBoundingClientRect().bottom + 8 : 0,
                  left: colorPickerRef.current ? colorPickerRef.current.getBoundingClientRect().right - 220 : 0
                }}
              >
                <h4 className="text-sm font-medium text-gray-700 mb-3">色を選択</h4>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Color selected:', color.value);
                        onUpdate({ color: color.value });
                        setShowColorPicker(false);
                      }}
                      className={`w-7 h-7 rounded-lg transition-all duration-200 hover:scale-105 flex items-center justify-center text-sm font-semibold border ${
                        database.color === color.value 
                          ? 'border-gray-800 border-2 bg-gray-100' 
                          : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
                      }`}
                      style={{ color: color.value }}
                      title={color.label}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}
          </div>
          
          <button
            onClick={() => onUpdate({ isCollapsed: !database.isCollapsed })}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-700"
            title={database.isCollapsed ? "展開" : "折りたたみ"}
          >
            {database.isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          
          <button
            onClick={() => setShowMemo(!showMemo)}
            className={`p-1.5 hover:bg-gray-100 rounded transition-colors ${
              database.memo ? 'text-blue-600 hover:text-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}
            title="メモ"
          >
            <FileText size={16} />
          </button>
          <div className="relative" ref={selectorRef}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Property add button clicked');
                setShowPropertyTypeSelector(!showPropertyTypeSelector);
              }}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-700"
              title="プロパティを追加"
            >
              <Plus size={16} />
            </button>
            
            {showPropertyTypeSelector && isMounted && createPortal(
              <div 
                data-property-selector
                className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[99999] min-w-[280px]"
                style={{
                  top: selectorRef.current ? selectorRef.current.getBoundingClientRect().bottom + 4 : 0,
                  left: selectorRef.current ? selectorRef.current.getBoundingClientRect().right - 280 : 0
                }}
              >
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">プロパティタイプを選択</h3>
                  <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                    {propertyTypes.map(type => (
                      <button
                        key={type.value}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Adding property:', type.value);
                          addProperty(type.value);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 rounded-md transition-colors text-left"
                      >
                        <span className={type.color}>{type.icon}</span>
                        <span className="text-gray-700">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-red-600"
            title="Delete Database"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* メモセクション */}
      {!database.isCollapsed && showMemo && (
        <div className="border-t border-gray-100 p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">メモ</span>
            <button
              onClick={() => setIsEditingMemo(!isEditingMemo)}
              className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-500 hover:text-gray-700"
              title="メモを編集"
            >
              <Edit3 size={12} />
            </button>
          </div>
          
          {isEditingMemo ? (
            <textarea
              value={database.memo || ''}
              onChange={(e) => onUpdate({ memo: e.target.value })}
              onBlur={() => setIsEditingMemo(false)}
              placeholder="データベースの説明やメモを入力..."
              className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <div
              onClick={() => setIsEditingMemo(true)}
              className="w-full p-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg min-h-[60px] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {database.memo || 'データベースの説明やメモを入力...'}
            </div>
          )}
        </div>
      )}

      {!database.isCollapsed && (
        <div className="border-t border-gray-100"
          style={{ 
            borderBottomLeftRadius: 'inherit',
            borderBottomRightRadius: 'inherit',
            overflow: 'hidden'
          }}>
          {database.properties
            .sort((a, b) => a.order - b.order)
            .map((property, idx) => (
            <PropertyItem
              key={property.id}
              property={property}
              databases={allDatabases} // Pass all databases for relation creation
              currentDatabaseId={database.id}
              onUpdate={(updates) => updateProperty(property.id, updates)}
              onUpdateOtherDatabase={onUpdateOtherDatabase}
              onDelete={() => deleteProperty(property.id)}
              onDuplicate={duplicateProperty}
              confirmDeletion={confirmPropertyDeletion}
              onReorder={reorderProperties}
              index={idx}
            />
          ))}
          {database.properties.length === 0 && (
            <div className="text-center py-8 text-gray-400 px-3">
              <Plus size={20} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">Click + to add your first property</p>
            </div>
          )}
        </div>
      )}
      
      {/* Connection ports for dynamic relation lines */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top port */}
        <div 
          className="absolute w-3 h-3 bg-gray-300 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer"
          style={{ 
            left: '50%', 
            top: '-6px', 
            transform: 'translateX(-50%)',
            borderColor: database.color
          }}
        />
        
        {/* Right port */}
        <div 
          className="absolute w-3 h-3 bg-gray-300 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer"
          style={{ 
            right: '-6px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            borderColor: database.color
          }}
        />
        
        {/* Bottom port */}
        <div 
          className="absolute w-3 h-3 bg-gray-300 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer"
          style={{ 
            left: '50%', 
            bottom: '-6px', 
            transform: 'translateX(-50%)',
            borderColor: database.color
          }}
        />
        
        {/* Left port */}
        <div 
          className="absolute w-3 h-3 bg-gray-300 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer"
          style={{ 
            left: '-6px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            borderColor: database.color
          }}
        />
      </div>
    </div>
  );
}