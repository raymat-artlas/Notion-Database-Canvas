'use client';

import { useState, useRef } from 'react';
import { Database } from '@/types';
import { Database as DatabaseIcon, Layers, GripVertical } from 'lucide-react';

interface DatabaseListProps {
  databases: Database[];
  onFocusDatabase: (database: Database) => void;
  onReorderDatabases?: (databases: Database[]) => void;
}

export default function DatabaseList({ databases, onFocusDatabase, onReorderDatabases }: DatabaseListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggedItemRef = useRef<HTMLButtonElement | null>(null);
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image
    if (draggedItemRef.current) {
      const dragImage = draggedItemRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.transform = 'rotate(2deg)';
      dragImage.style.opacity = '0.8';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newDatabases = [...databases];
    const draggedItem = newDatabases[draggedIndex];
    
    // Remove dragged item
    newDatabases.splice(draggedIndex, 1);
    
    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newDatabases.splice(insertIndex, 0, draggedItem);
    
    // Call the reorder callback if provided
    if (onReorderDatabases) {
      onReorderDatabases(newDatabases);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (databases.length === 0) {
    return (
      <div className="fixed left-6 top-24 w-48 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-md shadow-sm p-2 z-50 max-h-[calc(100vh-120px)] overflow-y-auto">
        <div className="text-center py-4 text-gray-400">
          <p className="text-xs">データベースなし</p>
        </div>
      </div>
    );
  }


  return (
    <div className="fixed left-6 top-24 w-48 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-md shadow-sm p-2 z-50 max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="space-y-0.5">
        {databases.map((database, index) => (
          <button
            key={database.id}
            ref={index === draggedIndex ? draggedItemRef : null}
            onClick={() => onFocusDatabase(database)}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, index)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded transition-all group ${
              draggedIndex === index ? 'opacity-50' : ''
            } ${
              dragOverIndex === index && draggedIndex !== index ? 'border-t-2 border-blue-500' : ''
            } hover:bg-white/70`}
          >
            <GripVertical 
              size={12} 
              className="text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
            />
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0" 
              style={{ backgroundColor: database.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600 truncate group-hover:text-gray-900">
                {database.name}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}