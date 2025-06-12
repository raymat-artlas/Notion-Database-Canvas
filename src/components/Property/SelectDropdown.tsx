'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SelectOption } from '@/types';
import { Settings, X, Palette, Trash2 } from 'lucide-react';

interface SelectDropdownProps {
  options: SelectOption[];
  onUpdate: (options: SelectOption[]) => void;
  onDelete?: () => void;
  confirmDeletion?: boolean;
  showDeleteConfirm?: boolean;
  setShowDeleteConfirm?: (show: boolean) => void;
  isExpanded?: boolean;
  setIsExpanded?: (expanded: boolean) => void;
}

const PRESET_COLORS = [
  '#666460', '#afaba3', '#a87964', '#d09b46', '#de8031',
  '#598e71', '#4a8bb2', '#9b74b7', '#c75f96', '#d95f59'
];

export default function SelectDropdown({ 
  options, 
  onUpdate,
  onDelete,
  confirmDeletion,
  showDeleteConfirm,
  setShowDeleteConfirm,
  isExpanded = false,
  setIsExpanded
}: SelectDropdownProps) {
  const [newOptionName, setNewOptionName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showColorPickerId, setShowColorPickerId] = useState<string | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

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

  const addOption = () => {
    if (!newOptionName.trim()) return;
    
    const newOption: SelectOption = {
      id: crypto.randomUUID(),
      name: newOptionName.trim(),
      color: PRESET_COLORS[options.length % PRESET_COLORS.length]
    };
    onUpdate([...options, newOption]);
    setNewOptionName('');
  };

  const updateOptionName = (id: string, name: string) => {
    if (!name.trim()) return;
    onUpdate(options.map(opt => opt.id === id ? { ...opt, name } : opt));
    setEditingId(null);
  };

  const deleteOption = (id: string) => {
    onUpdate(options.filter(opt => opt.id !== id));
  };

  const updateOptionColor = (id: string, color: string) => {
    onUpdate(options.map(opt => opt.id === id ? { ...opt, color } : opt));
  };

  return (
    <>
      <button
        onClick={() => setIsExpanded?.(!isExpanded)}
        className={`p-1.5 rounded-md transition-all duration-150 ${
          isExpanded
            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title="選択肢を管理"
      >
        <Settings size={14} />
      </button>

    </>
  );
}