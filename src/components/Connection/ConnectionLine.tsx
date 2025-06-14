'use client';

import { useState, useEffect } from 'react';
import { Database, Property, CanvasState } from '@/types';

interface ConnectionLineProps {
  fromDatabaseId: string;
  fromPropertyId: string;
  toDatabaseId: string;
  toPropertyId: string;
  type: 'relation' | 'formula';
  databases: Database[];
  canvasState: CanvasState;
}

export default function ConnectionLine({ 
  fromDatabaseId, 
  fromPropertyId, 
  toDatabaseId, 
  toPropertyId, 
  type,
  databases,
  canvasState 
}: ConnectionLineProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [fromPos, setFromPos] = useState<{ x: number; y: number } | null>(null);
  const [toPos, setToPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const updatePositions = () => {
      // Try DOM-based approach first for precise positioning
      const connectionType = type === 'formula' ? 'formula' : 'relation';
      const svg = document.querySelector('.connections-svg');
      
      if (svg) {
        // Try to find optimal connection points from all available dots
        const fromDots = document.querySelectorAll(`[data-property-id="${fromPropertyId}"][data-connection-type="${connectionType}"]`);
        const toDots = document.querySelectorAll(`[data-property-id="${toPropertyId}"][data-connection-type="${connectionType}"]`);
        
        if (fromDots.length > 0 && toDots.length > 0) {
          const svgRect = svg.getBoundingClientRect();
          let bestFromPos = null;
          let bestToPos = null;
          
          // For same database connections, count existing connections on each side
          if (fromDatabaseId === toDatabaseId) {
            // Count connections on left and right sides of the database
            const allConnections = document.querySelectorAll(`[data-connection-type="${connectionType}"]`);
            let leftConnections = 0;
            let rightConnections = 0;
            
            allConnections.forEach(dot => {
              const side = dot.getAttribute('data-connection-side');
              if (side === 'left') leftConnections++;
              if (side === 'right') rightConnections++;
            });
            
            // Choose the side with fewer connections
            const preferredSide = leftConnections <= rightConnections ? 'left' : 'right';
            
            const fromPreferredDot = Array.from(fromDots).find(dot => 
              dot.getAttribute('data-connection-side') === preferredSide
            );
            const toPreferredDot = Array.from(toDots).find(dot => 
              dot.getAttribute('data-connection-side') === preferredSide
            );
            
            if (fromPreferredDot && toPreferredDot) {
              const fromRect = fromPreferredDot.getBoundingClientRect();
              const toRect = toPreferredDot.getBoundingClientRect();
              
              bestFromPos = { 
                x: fromRect.left + fromRect.width / 2 - svgRect.left,
                y: fromRect.top + fromRect.height / 2 - svgRect.top
              };
              bestToPos = { 
                x: toRect.left + toRect.width / 2 - svgRect.left,
                y: toRect.top + toRect.height / 2 - svgRect.top
              };
            }
          }
          
          // For different databases or if same-database logic failed, find shortest distance between left/right points only
          if (!bestFromPos || !bestToPos) {
            let minDistance = Infinity;
            
            // Only consider left and right connection points
            const leftRightFromDots = Array.from(fromDots).filter(dot => {
              const side = dot.getAttribute('data-connection-side');
              return side === 'left' || side === 'right';
            });
            
            const leftRightToDots = Array.from(toDots).filter(dot => {
              const side = dot.getAttribute('data-connection-side');
              return side === 'left' || side === 'right';
            });
            
            leftRightFromDots.forEach(fromDot => {
              leftRightToDots.forEach(toDot => {
                const fromRect = fromDot.getBoundingClientRect();
                const toRect = toDot.getBoundingClientRect();
                
                const fromX = fromRect.left + fromRect.width / 2 - svgRect.left;
                const fromY = fromRect.top + fromRect.height / 2 - svgRect.top;
                const toX = toRect.left + toRect.width / 2 - svgRect.left;
                const toY = toRect.top + toRect.height / 2 - svgRect.top;
                
                const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
                
                if (distance < minDistance) {
                  minDistance = distance;
                  bestFromPos = { x: fromX, y: fromY };
                  bestToPos = { x: toX, y: toY };
                }
              });
            });
          }
          
          if (bestFromPos && bestToPos) {
            // Adjust for canvas transformation (already applied to the SVG container)
            const adjustedFromPos = {
              x: (bestFromPos.x - canvasState.panX) / canvasState.zoom,
              y: (bestFromPos.y - canvasState.panY) / canvasState.zoom
            };
            const adjustedToPos = {
              x: (bestToPos.x - canvasState.panX) / canvasState.zoom,
              y: (bestToPos.y - canvasState.panY) / canvasState.zoom
            };
            setFromPos(adjustedFromPos);
            setToPos(adjustedToPos);
            return;
          }
        }
      }
      
      // Fallback to mathematical calculation if DOM approach fails
      const fromDb = databases.find(db => db.id === fromDatabaseId);
      const toDb = databases.find(db => db.id === toDatabaseId);
      
      if (!fromDb || !toDb) return;
      
      // Find property positions within databases
      const fromProperty = fromDb.properties.find(p => p.id === fromPropertyId);
      const toProperty = toDb.properties.find(p => p.id === toPropertyId);
      
      if (!fromProperty || !toProperty) return;
      
      const fromPropertyIndex = fromDb.properties.findIndex(p => p.id === fromPropertyId);
      const toPropertyIndex = toDb.properties.findIndex(p => p.id === toPropertyId);
      
      // Database dimensions and layout constants
      const databaseWidth = 320;
      const headerHeight = 57;
      const propertyHeight = 64;
      const connectionMargin = 8;
      
      // Calculate property Y positions
      const fromPropertyY = fromDb.y + headerHeight + (fromPropertyIndex >= 0 ? fromPropertyIndex * propertyHeight + propertyHeight / 2 : propertyHeight / 2);
      const toPropertyY = toDb.y + headerHeight + (toPropertyIndex >= 0 ? toPropertyIndex * propertyHeight + propertyHeight / 2 : propertyHeight / 2);
      
      // Define connection points for each database (left and right only)
      const fromConnectionPoints = [
        { x: fromDb.x - connectionMargin, y: fromPropertyY, side: 'left' },
        { x: fromDb.x + databaseWidth + connectionMargin, y: fromPropertyY, side: 'right' }
      ];
      
      const toConnectionPoints = [
        { x: toDb.x - connectionMargin, y: toPropertyY, side: 'left' },
        { x: toDb.x + databaseWidth + connectionMargin, y: toPropertyY, side: 'right' }
      ];
      
      // Find optimal connection points
      let minDistance = Infinity;
      let optimalFromPoint = fromConnectionPoints[0];
      let optimalToPoint = toConnectionPoints[0];
      
      // For same database connections, prefer the side with fewer existing connections
      if (fromDatabaseId === toDatabaseId) {
        // Count existing connections to determine which side has fewer
        // For now, default to left side (could be enhanced to count actual connections)
        optimalFromPoint = fromConnectionPoints[0]; // left side
        optimalToPoint = toConnectionPoints[0]; // left side
      } else {
        // For different databases, find shortest distance between left/right points
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
      
      // No need to apply canvas transformations here as the SVG is already transformed
      setFromPos({ x: optimalFromPoint.x, y: optimalFromPoint.y });
      setToPos({ x: optimalToPoint.x, y: optimalToPoint.y });
    };

    // Update positions initially and on changes
    updatePositions();
    
    // Update on canvas state changes
    const handleUpdate = () => updatePositions();
    
    // Listen for relevant changes
    window.addEventListener('resize', handleUpdate);
    
    // Use a more conservative update approach to avoid performance issues
    const intervalId = setInterval(updatePositions, 100);
    
    return () => {
      window.removeEventListener('resize', handleUpdate);
      clearInterval(intervalId);
    };
  }, [fromPropertyId, toPropertyId, fromDatabaseId, toDatabaseId, canvasState, databases]);

  if (!fromPos || !toPos) return null;

  const isSameDatabase = fromDatabaseId === toDatabaseId;
  const isFormula = type === 'formula';

  // Create smooth curved path based on connection positions
  let pathData;
  if (isSameDatabase) {
    // Same database: create a small side curve
    const distance = Math.sqrt(Math.pow(toPos.x - fromPos.x, 2) + Math.pow(toPos.y - fromPos.y, 2));
    const curveOffset = Math.max(distance * 0.2, 20); // Reduced offset for smaller curve
    const midY = (fromPos.y + toPos.y) / 2;
    
    // Determine which side the connection points are on
    const fromDb = databases.find(db => db.id === fromDatabaseId);
    if (fromDb) {
      // If connecting on the left side, curve slightly more to the left
      const controlX = Math.min(fromPos.x, toPos.x) - curveOffset;
      pathData = `M ${fromPos.x} ${fromPos.y} Q ${controlX} ${midY} ${toPos.x} ${toPos.y}`;
    } else {
      // Fallback if database not found
      const controlX = Math.min(fromPos.x, toPos.x) - curveOffset;
      pathData = `M ${fromPos.x} ${fromPos.y} Q ${controlX} ${midY} ${toPos.x} ${toPos.y}`;
    }
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

  // Colors based on type
  const strokeColor = isFormula 
    ? (isHovering ? '#6b7280' : '#d1d5db')
    : (isHovering ? '#9ca3af' : '#d1d5db');
  
  const dotColor = isFormula 
    ? (isHovering ? '#374151' : '#6b7280')
    : (isHovering ? '#6b7280' : '#9ca3af');

  return (
    <g 
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
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
      
      {/* Label */}
      {isHovering && (
        <g>
          {(() => {
            const labelX = (fromPos.x + toPos.x) / 2;
            const labelY = (fromPos.y + toPos.y) / 2;
            
            return (
              <>
                <rect
                  x={labelX - 30}
                  y={labelY - 10}
                  width="60"
                  height="20"
                  fill="white"
                  stroke="#d1d5db"
                  strokeWidth="1"
                  rx="4"
                />
                <text
                  x={labelX}
                  y={labelY + 4}
                  textAnchor="middle"
                  className="text-xs fill-gray-700 font-medium pointer-events-none"
                >
                  {isFormula ? 'formula' : 'relation'}
                </text>
              </>
            );
          })()}
        </g>
      )}
    </g>
  );
}