'use client';

import { useState, useRef, useEffect } from 'react';
import { Database as DatabaseType, Property, Relation } from '@/types';
import DatabaseBox from '@/components/Database/DatabaseBox';

/**
 * DemoCanvas - Interactive canvas demo using real DatabaseBox components
 * 
 * Canvas Data Locations:
 * - /data/canvases.json - Registry of saved canvases
 * - /data/canvas-485d9d08-b83c-4324-8929-b2351cbb23cf.json - Full canvas with 3 databases and relations
 * - /data/test-canvas-save.json - Simple test canvas
 * 
 * Pass useRealData={true} to load actual saved canvas data instead of demo data
 */

// Create realistic demo data using actual types
const createDemoDatabase = (
  id: string,
  name: string,
  x: number,
  y: number,
  color: string,
  properties: Omit<Property, 'id' | 'order'>[]
): DatabaseType => ({
  id,
  name,
  x,
  y,
  color,
  properties: properties.map((prop, index) => ({
    ...prop,
    id: `${id}_prop_${index}`,
    order: index
  })),
  createdAt: new Date(),
  updatedAt: new Date()
});

const DEMO_DATABASES: DatabaseType[] = [
  createDemoDatabase('db1', 'プロジェクト', 150, 180, '#4a8bb2', [
    { name: 'プロジェクト名', type: 'title', required: true },
    { name: 'ステータス', type: 'status', required: false, options: [
      { id: 'status1', name: '進行中', color: '#10b981' },
      { id: 'status2', name: '完了', color: '#3b82f6' }
    ]},
    { name: 'チーム', type: 'relation', required: false, relationConfig: {
      targetDatabaseId: 'db2',
      relationName: 'チーム',
      isDualProperty: true
    }},
    { name: '進捗率', type: 'formula', required: false, formulaConfig: {
      expression: 'if(prop("ステータス") == "完了", 100, 50)',
      referencedProperties: ['ステータス']
    }}
  ]),
  
  createDemoDatabase('db2', 'チーム', 550, 150, '#598e71', [
    { name: '氏名', type: 'title', required: true },
    { name: '役職', type: 'select', required: false, options: [
      { id: 'role1', name: 'PM', color: '#8b5cf6' },
      { id: 'role2', name: 'エンジニア', color: '#06b6d4' }
    ]},
    { name: 'プロジェクト', type: 'relation', required: false, relationConfig: {
      targetDatabaseId: 'db1',
      relationName: 'プロジェクト',
      isDualProperty: true
    }}
  ]),
  
  createDemoDatabase('db3', 'タスク', 950, 190, '#d09b46', [
    { name: 'タスク名', type: 'title', required: true },
    { name: '担当者', type: 'relation', required: false, relationConfig: {
      targetDatabaseId: 'db2',
      relationName: '担当者',
      isDualProperty: false
    }},
    { name: '完了率', type: 'formula', required: false, formulaConfig: {
      expression: 'round(prop("進捗") * 100, 1)',
      referencedProperties: ['進捗']
    }}
  ])
];

const DEMO_RELATIONS: Relation[] = [
  {
    id: 'r1',
    fromDatabaseId: 'db1',
    toDatabaseId: 'db2', 
    type: 'dual',
    fromPropertyName: 'チーム',
    toPropertyName: 'プロジェクト',
    fromPropertyId: 'db1_prop_2',
    toPropertyId: 'db2_prop_2'
  },
  {
    id: 'r2', 
    fromDatabaseId: 'db3',
    toDatabaseId: 'db2',
    type: 'single',
    fromPropertyName: '担当者',
    toPropertyName: '氏名',
    fromPropertyId: 'db3_prop_1',
    toPropertyId: 'db2_prop_0'
  },
  {
    id: 'r3',
    fromDatabaseId: 'db1', 
    toDatabaseId: 'db1',
    type: 'formula',
    fromPropertyName: '進捗率',
    toPropertyName: 'ステータス',
    fromPropertyId: 'db1_prop_3',
    toPropertyId: 'db1_prop_1'
  },
  {
    id: 'r4',
    fromDatabaseId: 'db3', 
    toDatabaseId: 'db3',
    type: 'formula',
    fromPropertyName: '完了率',
    toPropertyName: 'タスク名',
    fromPropertyId: 'db3_prop_2',
    toPropertyId: 'db3_prop_0'
  }
];

export default function DemoCanvas({ useRealData = false }: { useRealData?: boolean }) {
  const [databases, setDatabases] = useState<DatabaseType[]>(DEMO_DATABASES);
  const [relations] = useState<Relation[]>(DEMO_RELATIONS);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load real canvas data if requested
  const [realDataLoaded, setRealDataLoaded] = useState(false);
  
  const loadRealCanvasData = async () => {
    if (useRealData && !realDataLoaded) {
      try {
        const response = await fetch('/data/canvas-485d9d08-b83c-4324-8929-b2351cbb23cf.json');
        const canvasData = await response.json();
        
        // Adjust positions to fit in demo canvas
        const adjustedDatabases = canvasData.databases.map((db: any) => ({
          ...db,
          x: Math.max(20, (db.x + 400) * 0.3), // Normalize and scale positions
          y: Math.max(20, (db.y + 200) * 0.3),
          createdAt: new Date(db.createdAt),
          updatedAt: new Date(db.updatedAt)
        }));
        
        setDatabases(adjustedDatabases);
        setRealDataLoaded(true);
      } catch (error) {
        console.log('Could not load real canvas data, using demo data');
      }
    }
  };

  // Load real data on component mount if requested
  useEffect(() => {
    loadRealCanvasData();
  }, [useRealData]);

  // Handle database updates (for demo purposes, just update position)
  const handleDatabaseUpdate = (id: string, updates: Partial<DatabaseType>) => {
    setDatabases(prev => prev.map(db => 
      db.id === id ? { ...db, ...updates } : db
    ));
  };

  // Force re-render of connections when databases change
  const [connectionKey, setConnectionKey] = useState(0);
  useEffect(() => {
    setConnectionKey(prev => prev + 1);
  }, [databases]);

  // No-op handlers for demo mode (read-only)
  const handleDatabaseDelete = () => {};
  const handleConnect = () => {};
  const handleUpdateOtherDatabase = () => {};

  return (
    <div ref={canvasRef} className="relative w-full h-[400px] bg-gradient-to-br from-gray-50 to-white rounded-xl overflow-hidden shadow-lg border border-gray-200">
      {/* Grid background */}
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />
      
      {/* Connection lines using proper positioning calculation */}
      <svg key={connectionKey} className="absolute inset-0 w-full h-full pointer-events-none connections-svg" style={{ zIndex: 1 }}>
        {relations.map(relation => {
          const fromDb = databases.find(db => db.id === relation.fromDatabaseId);
          const toDb = databases.find(db => db.id === relation.toDatabaseId);
          
          if (!fromDb || !toDb) return null;
          
          // Find property positions within databases
          const fromIndex = fromDb.properties.findIndex(p => p.id === relation.fromPropertyId);
          const toIndex = toDb.properties.findIndex(p => p.id === relation.toPropertyId);
          
          if (fromIndex === -1 || toIndex === -1) return null;
          
          // Database dimensions from real ConnectionLine.tsx
          const databaseWidth = 320;
          const headerHeight = 57;
          const propertyHeight = 64;
          const connectionMargin = 8;
          
          // Scale factor applied to DatabaseBox components
          const scale = 0.7;
          
          // Calculate scaled dimensions
          const scaledDbWidth = databaseWidth * scale;
          const scaledHeaderHeight = headerHeight * scale;
          const scaledPropertyHeight = propertyHeight * scale;
          
          // DatabaseBox positioning: databases have scale(0.7) applied via CSS transform
          // SVG coordinates need to match the actual rendered positions
          const fromDbScreenX = fromDb.x * scale;
          const fromDbScreenY = fromDb.y * scale;
          const toDbScreenX = toDb.x * scale; 
          const toDbScreenY = toDb.y * scale;
          
          // Calculate property Y positions - exact center of each property row
          const fromPropertyCenterY = fromDbScreenY + scaledHeaderHeight + (fromIndex * scaledPropertyHeight) + (scaledPropertyHeight / 2);
          const toPropertyCenterY = toDbScreenY + scaledHeaderHeight + (toIndex * scaledPropertyHeight) + (scaledPropertyHeight / 2);
          
          // Use same connection margin as real ConnectionLine // Small margin from property edge
          
          const fromConnectionPoints = [
            { x: fromDbScreenX - connectionMargin * scale, y: fromPropertyCenterY, side: 'left' },
            { x: fromDbScreenX + scaledDbWidth + connectionMargin * scale, y: fromPropertyCenterY, side: 'right' }
          ];
          
          const toConnectionPoints = [
            { x: toDbScreenX - connectionMargin * scale, y: toPropertyCenterY, side: 'left' },
            { x: toDbScreenX + scaledDbWidth + connectionMargin * scale, y: toPropertyCenterY, side: 'right' }
          ];
          
          // Find optimal connection points
          let optimalFromPoint, optimalToPoint;
          
          if (fromDb.id === toDb.id) {
            // Same database: use left side for self-connections
            optimalFromPoint = fromConnectionPoints[0];
            optimalToPoint = toConnectionPoints[0];
          } else {
            // Different databases: find shortest distance between left/right points
            let minDistance = Infinity;
            optimalFromPoint = fromConnectionPoints[0];
            optimalToPoint = toConnectionPoints[0];
            
            fromConnectionPoints.forEach(fromPoint => {
              toConnectionPoints.forEach(toPoint => {
                const distance = Math.sqrt(
                  Math.pow(toPoint.x - fromPoint.x, 2) + 
                  Math.pow(toPoint.y - fromPoint.y, 2)
                );
                
                if (distance < minDistance) {
                  minDistance = distance;
                  optimalFromPoint = fromPoint;
                  optimalToPoint = toPoint;
                }
              });
            });
          }
          
          const fromPos = { x: optimalFromPoint.x, y: optimalFromPoint.y };
          const toPos = { x: optimalToPoint.x, y: optimalToPoint.y };
          
          // Create smooth curved path based on connection positions (from real ConnectionLine.tsx)
          let pathData;
          const isSameDatabase = fromDb.id === toDb.id;
          const isFormula = relation.type === 'formula';
          
          if (isSameDatabase) {
            // Same database: create a small side curve
            const distance = Math.sqrt(Math.pow(toPos.x - fromPos.x, 2) + Math.pow(toPos.y - fromPos.y, 2));
            const curveOffset = Math.max(distance * 0.2, 20); // Reduced offset for smaller curve
            const midY = (fromPos.y + toPos.y) / 2;
            
            // If connecting on the left side, curve slightly more to the left
            const controlX = Math.min(fromPos.x, toPos.x) - curveOffset;
            pathData = `M ${fromPos.x} ${fromPos.y} Q ${controlX} ${midY} ${toPos.x} ${toPos.y}`;
          } else {
            // Cross-database: smooth bezier curve
            const distance = Math.sqrt(Math.pow(toPos.x - fromPos.x, 2) + Math.pow(toPos.y - fromPos.y, 2));
            const controlPointOffset = Math.min(Math.max(distance * 0.3, 50), 150);
            
            // Determine control point directions based on relative positions
            const isHorizontalConnection = Math.abs(toPos.x - fromPos.x) > Math.abs(toPos.y - fromPos.y);
            
            let fromControlX = fromPos.x;
            let fromControlY = fromPos.y;
            let toControlX = toPos.x;
            let toControlY = toPos.y;
            
            if (isHorizontalConnection) {
              // Horizontal connections - extend control points horizontally
              if (fromPos.x < toPos.x) {
                fromControlX = fromPos.x + controlPointOffset;
                toControlX = toPos.x - controlPointOffset;
              } else {
                fromControlX = fromPos.x - controlPointOffset;
                toControlX = toPos.x + controlPointOffset;
              }
            } else {
              // Vertical connections - extend control points vertically
              if (fromPos.y < toPos.y) {
                fromControlY = fromPos.y + controlPointOffset;
                toControlY = toPos.y - controlPointOffset;
              } else {
                fromControlY = fromPos.y - controlPointOffset;
                toControlY = toPos.y + controlPointOffset;
              }
            }
            
            pathData = `M ${fromPos.x} ${fromPos.y} C ${fromControlX} ${fromControlY}, ${toControlX} ${toControlY}, ${toPos.x} ${toPos.y}`;
          }
          
          // Colors based on type (from real ConnectionLine.tsx)
          const isHovering = false; // No hover in demo
          const strokeColor = isFormula 
            ? (isHovering ? '#6b7280' : '#d1d5db')
            : (isHovering ? '#9ca3af' : '#d1d5db');
          
          const dotColor = isFormula 
            ? (isHovering ? '#374151' : '#6b7280')
            : (isHovering ? '#6b7280' : '#9ca3af');
          
          return (
            <g key={relation.id}>
              {/* Invisible wider path for easier hovering */}
              <path
                d={pathData}
                stroke="transparent"
                strokeWidth="10"
                fill="none"
              />
              
              {/* Visible line */}
              <path
                d={pathData}
                stroke={strokeColor}
                strokeWidth={isHovering ? "2" : "1.5"}
                fill="none"
                strokeDasharray={isFormula ? "4 2" : "none"}
                className="transition-all pointer-events-none"
              />
              
              {/* Connection dots */}
              <circle
                cx={fromPos.x}
                cy={fromPos.y}
                r={isHovering ? "4" : "3"}
                fill="white"
                stroke={dotColor}
                strokeWidth={isHovering ? "2" : "1.5"}
                className="transition-all pointer-events-none"
              />
              <circle
                cx={toPos.x}
                cy={toPos.y}
                r={isHovering ? "4" : "3"}
                fill="white"
                stroke={dotColor}
                strokeWidth={isHovering ? "2" : "1.5"}
                className="transition-all pointer-events-none"
              />
            </g>
          );
        })}
      </svg>
      
      {/* Databases using real DatabaseBox component */}
      {databases.map(database => (
        <div key={database.id} className="relative">
          <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left' }}>
            <DatabaseBox
              database={database}
              allDatabases={databases}
              onUpdate={(updates) => handleDatabaseUpdate(database.id, updates)}
              onUpdateOtherDatabase={handleUpdateOtherDatabase}
              onDelete={handleDatabaseDelete}
              onConnect={handleConnect}
              snapToGrid={false}
              confirmPropertyDeletion={false}
            />
          </div>
        </div>
      ))}
      
      {/* Connection dots for each property (invisible, just for positioning reference) */}
      <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left' }}>
        {databases.map(database => 
          database.properties.map((property, index) => {
            const headerHeight = 57;
            const propertyHeight = 64;
            const databaseWidth = 320;
            const connectionMargin = 8;
            
            // Calculate the exact center of the property row
            const propertyY = database.y + headerHeight + index * propertyHeight + propertyHeight / 2;
          
          return (
            <div key={`${database.id}-${property.id}`}>
              {/* Left connection point */}
              <div
                className="absolute w-2 h-2 opacity-0 rounded-full z-10 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: database.x,
                  top: propertyY
                }}
                data-property-id={property.id}
                data-property-name={property.name}
                data-connection-side="left"
                data-connection-type={property.type === 'formula' ? 'formula' : 'relation'}
              />
              
              {/* Right connection point */}
              <div
                className="absolute w-2 h-2 opacity-0 rounded-full z-10 transform translate-x-1/2 -translate-y-1/2"
                style={{
                  left: database.x + databaseWidth,
                  top: propertyY
                }}
                data-property-id={property.id}
                data-property-name={property.name}
                data-connection-side="right"
                data-connection-type={property.type === 'formula' ? 'formula' : 'relation'}
              />
            </div>
          );
        })
        )}
      </div>
      
      {/* Interactive hint */}
      <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm border border-gray-200 pointer-events-none">
        <p className="text-xs text-gray-600">💡 本物のキャンバス体験</p>
      </div>
      
      {/* Brand watermark */}
      <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm border border-gray-200 pointer-events-none">
        <p className="text-xs text-gray-500">Database Canvas</p>
      </div>
    </div>
  );
}