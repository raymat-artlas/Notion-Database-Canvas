'use client';

import { useState } from 'react';
import { Database, Property } from '@/types';
import { Sigma, ArrowUpRight, X } from 'lucide-react';

interface FormulaEditorProps {
  property: Property;
  databases: Database[];
  currentDatabaseId: string;
  onUpdate: (updates: Partial<Property>) => void;
}

export default function FormulaEditor({ property, databases, currentDatabaseId, onUpdate }: FormulaEditorProps) {
  const currentDatabase = databases.find(db => db.id === currentDatabaseId);

  // Extract referenced properties
  const extractReferencedProperties = (expr: string): string[] => {
    const regex = /prop\s*\(\s*["']([^"']+)["']\s*\)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(expr)) !== null) {
      matches.push(match[1]);
    }
    return [...new Set(matches)];
  };

  // Handle text change
  const handleTextChange = (value: string) => {
    const referencedProperties = extractReferencedProperties(value);
    onUpdate({
      formulaConfig: {
        expression: value,
        referencedProperties
      }
    });
  };

  // Insert property reference
  const insertProperty = (propertyName: string) => {
    const currentExpression = property.formulaConfig?.expression || '';
    const newExpression = currentExpression + `prop("${propertyName}")`;
    handleTextChange(newExpression);
  };

  // Remove property reference
  const removePropertyReference = (propertyName: string) => {
    const currentExpression = property.formulaConfig?.expression || '';
    // Remove all occurrences of prop("propertyName")
    const escapedName = propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`prop\\s*\\(\\s*["']${escapedName}["']\\s*\\)`, 'g');
    const newExpression = currentExpression.replace(regex, '');
    handleTextChange(newExpression);
  };

  // Get referenceable properties from current database
  const currentDbProperties = currentDatabase?.properties.filter(p => 
    p.id !== property.id && [
      'title', 'text', 'number', 'select', 'multi-select', 'date', 'checkbox',
      'person', 'files', 'url', 'email', 'phone', 'formula', 'rollup',
      'created_time', 'created_by', 'last_edited_time', 'last_edited_by'
    ].includes(p.type)
  ) || [];

  // Get relation properties and their target properties
  const relationProperties = currentDatabase?.properties.filter(p => 
    p.type === 'relation' && p.relationConfig?.targetDatabaseId
  ) || [];

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <h4 className="text-xs font-medium mb-2 text-gray-700 flex items-center gap-2">
        <Sigma size={14} className="text-gray-600" />
        数式エディター
      </h4>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            数式
          </label>
          <textarea
            value={property.formulaConfig?.expression || ''}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder='例: prop("価格") * prop("数量")'
            className="w-full text-sm font-mono border border-gray-300 rounded px-3 py-2 bg-white focus:border-gray-500 focus:outline-none resize-none"
            rows={3}
          />
        </div>
        
        {/* Current Database Properties */}
        {currentDbProperties.length > 0 && (
          <div>
            <p className="text-xs text-gray-600 mb-2">このデータベースのプロパティ:</p>
            <div className="flex flex-wrap gap-1">
              {currentDbProperties.map(prop => (
                <button
                  key={prop.id}
                  onClick={() => insertProperty(prop.name)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  {prop.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Relation Properties */}
        {relationProperties.map(relationProp => {
          const targetDb = databases.find(db => db.id === relationProp.relationConfig?.targetDatabaseId);
          if (!targetDb) return null;

          const targetProperties = targetDb.properties.filter(p => [
            'title', 'text', 'number', 'select', 'multi-select', 'date', 'checkbox',
            'person', 'files', 'url', 'email', 'phone', 'formula', 'rollup',
            'created_time', 'created_by', 'last_edited_time', 'last_edited_by'
          ].includes(p.type));

          return (
            <div key={relationProp.id}>
              <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                <ArrowUpRight size={12} />
                {targetDb.name} のプロパティ:
              </p>
              <div className="flex flex-wrap gap-1">
                {targetProperties.map(prop => (
                  <button
                    key={prop.id}
                    onClick={() => insertProperty(`${relationProp.name}.${prop.name}`)}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    {prop.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        
        {/* Referenced Properties Display */}
        {property.formulaConfig?.referencedProperties && property.formulaConfig.referencedProperties.length > 0 && (
          <div className="bg-white border border-gray-200 rounded p-2">
            <p className="text-xs text-gray-600 mb-1">参照中のプロパティ:</p>
            <div className="flex flex-wrap gap-1">
              {property.formulaConfig.referencedProperties.map((propName, idx) => (
                <span 
                  key={idx} 
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded group hover:bg-blue-200 transition-colors"
                >
                  {propName}
                  <button
                    onClick={() => removePropertyReference(propName)}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title={`"${propName}" の参照を削除`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}