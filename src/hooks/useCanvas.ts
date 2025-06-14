import { useState, useCallback, useEffect, useRef } from 'react';
import { Database, Property, Relation, CanvasState } from '@/types';
import { generateRelationLines } from './useRelationLines';
import { generateId } from '@/lib/utils';
import { useAuth } from './useAuth';
import { updateCanvasModifiedTime } from '@/lib/canvasRetention';

interface HistoryState {
  databases: Database[];
  relations: Relation[];
}

export const useCanvas = (canvasId?: string) => {
  const { user } = useAuth();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    selectedIds: []
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // History management
  const history = useRef<HistoryState[]>([]);
  const historyIndex = useRef<number>(-1);
  const isApplyingHistory = useRef<boolean>(false);
  const maxHistorySize = 50;


  // 状態が変更されたときに履歴に追加（デバウンス付き）
  useEffect(() => {
    if (isApplyingHistory.current) return;
    
    const timeoutId = setTimeout(() => {
      pushToHistory();
    }, 500); // 500ms後に履歴に追加
    
    return () => clearTimeout(timeoutId);
  }, [databases, relations]); // canvasStateを除外

  // 履歴に現在の状態を追加
  const pushToHistory = useCallback(() => {
    if (isApplyingHistory.current) return;
    
    const currentState: HistoryState = {
      databases: JSON.parse(JSON.stringify(databases)),
      relations: JSON.parse(JSON.stringify(relations))
    };
    
    // 現在のインデックスより後の履歴を削除
    history.current = history.current.slice(0, historyIndex.current + 1);
    
    // 新しい状態を追加
    history.current.push(currentState);
    
    // 履歴の最大サイズを超えた場合、古い履歴を削除
    if (history.current.length > maxHistorySize) {
      history.current.shift();
    } else {
      historyIndex.current++;
    }
  }, [databases, relations]);

  // Undo機能
  const undo = useCallback(() => {
    if (historyIndex.current > 0) {
      isApplyingHistory.current = true;
      historyIndex.current--;
      const previousState = history.current[historyIndex.current];
      
      // 日付オブジェクトを復元
      const restoredDatabases = previousState.databases.map((db: any) => ({
        ...db,
        createdAt: new Date(db.createdAt),
        updatedAt: new Date(db.updatedAt)
      }));
      
      setDatabases(restoredDatabases);
      setRelations(previousState.relations);
      
      setTimeout(() => {
        isApplyingHistory.current = false;
      }, 100);
    }
  }, []);

  // Redo機能
  const redo = useCallback(() => {
    if (historyIndex.current < history.current.length - 1) {
      isApplyingHistory.current = true;
      historyIndex.current++;
      const nextState = history.current[historyIndex.current];
      
      // 日付オブジェクトを復元
      const restoredDatabases = nextState.databases.map((db: any) => ({
        ...db,
        createdAt: new Date(db.createdAt),
        updatedAt: new Date(db.updatedAt)
      }));
      
      setDatabases(restoredDatabases);
      setRelations(nextState.relations);
      
      setTimeout(() => {
        isApplyingHistory.current = false;
      }, 100);
    }
  }, []);


  // Supabase Storageにデータを保存
  const saveToSupabase = useCallback(async () => {
    if (!canvasId || !user?.id) return;

    try {
      // ローカルからキャンバス情報を取得
      const canvasesKey = `notion-canvas-list-${user.id}`;
      const savedCanvases = localStorage.getItem(canvasesKey);
      let canvasInfo = null;
      
      if (savedCanvases) {
        const canvasesList = JSON.parse(savedCanvases);
        canvasInfo = canvasesList.find((c: any) => c.id === canvasId);
      }

      const canvasData = {
        databases,
        relations,
        canvasState,
        canvasInfo: canvasInfo || null,
        memo: localStorage.getItem('canvas-memo') || ''
      };

      
      const response = await fetch(`/api/canvas/${canvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, canvasData })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Canvas saved to Supabase:', result.message);
      } else {
        // レスポンスがJSONかどうか確認
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('Failed to save to Supabase:', response.status, errorData);
        } else {
          const errorText = await response.text();
          console.error('Failed to save to Supabase:', response.status, errorText);
        }
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }
  }, [canvasId, databases, relations, canvasState, user?.id]);

  // 初期データ読み込み（ローカル優先）
  useEffect(() => {
    let isMounted = true;
    
    // ユーザー固有のキーを取得（キャンバスID付き）
    const getUserStorageKey = (baseKey: string) => {
      const userId = user?.id;
      const userSuffix = userId ? `-${userId}` : '-guest';
      const canvasSuffix = canvasId ? `-${canvasId}` : '';
      return `${baseKey}${canvasSuffix}${userSuffix}`;
    };

    // LocalStorageから読み込み（ユーザー別）
    const loadFromLocalStorage = () => {
      try {
        const databasesKey = getUserStorageKey('notion-canvas-databases');
        const relationsKey = getUserStorageKey('notion-canvas-relations');
        const stateKey = getUserStorageKey('notion-canvas-state');
        
        const savedDatabases = localStorage.getItem(databasesKey);
        const savedRelations = localStorage.getItem(relationsKey);
        const savedCanvasState = localStorage.getItem(stateKey);

        console.log('Loading from localStorage:', { 
          databasesKey,
          relationsKey,
          stateKey,
          hasDatabases: !!savedDatabases,
          hasRelations: !!savedRelations,
          hasState: !!savedCanvasState
        });

        if (savedDatabases) {
          const parsedDatabases = JSON.parse(savedDatabases);
          const restoredDatabases = parsedDatabases.map((db: any) => ({
            ...db,
            createdAt: new Date(db.createdAt),
            updatedAt: new Date(db.updatedAt)
          }));
          setDatabases(restoredDatabases);
          console.log('Loaded databases:', restoredDatabases.length);
        }

        if (savedRelations) {
          const parsedRelations = JSON.parse(savedRelations);
          setRelations(parsedRelations);
          console.log('Loaded relations:', parsedRelations.length);
        }

        if (savedCanvasState) {
          const parsedState = JSON.parse(savedCanvasState);
          setCanvasState(parsedState);
          console.log('Loaded canvas state:', parsedState);
        }
      } catch (error) {
        console.error('Failed to load data from localStorage:', error);
      }
    };


    // Supabase Storageからデータを読み込み（復旧用・ローカルデータがない場合のみ）
    const loadFromSupabase = async () => {
      if (!canvasId || !user?.id) return;

      // ローカルにデータがある場合はSupabaseからの読み込みをスキップ
      const localDatabases = localStorage.getItem(getUserStorageKey('notion-canvas-databases'));
      if (localDatabases && JSON.parse(localDatabases).length > 0) {
        console.log('Local data exists, skipping Supabase load');
        return;
      }

      try {
        console.log('Fetching canvas data from Supabase...');
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`/api/canvas/${canvasId}?userId=${user.id}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const { canvasData } = await response.json();
          
          console.log('Successfully loaded from Supabase:', {
            hasDatabases: !!canvasData.databases,
            hasRelations: !!canvasData.relations,
            hasCanvasState: !!canvasData.canvasState
          });
          
          // データを復元（ローカルにデータがない場合のみ）
          if (canvasData.databases) {
            const restoredDatabases = canvasData.databases.map((db: any) => ({
              ...db,
              createdAt: new Date(db.createdAt),
              updatedAt: new Date(db.updatedAt)
            }));
            setDatabases(restoredDatabases);
            console.log('Restored databases from Supabase:', restoredDatabases.length);
          }
          
          if (canvasData.relations) {
            setRelations(canvasData.relations);
            console.log('Restored relations from Supabase:', canvasData.relations.length);
          }
          
          if (canvasData.canvasState) {
            setCanvasState(canvasData.canvasState);
            console.log('Restored canvas state from Supabase');
          }
          
          // Note: We don't save to localStorage here immediately since the state updates are async
          // The normal auto-save mechanism will handle this
        } else {
          console.error('Failed to load from Supabase:', response.status, response.statusText);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Supabase request timed out');
        } else {
          console.error('Failed to load from Supabase:', error);
        }
      }
    };
    
    const initializeCanvas = async () => {
      if (!isMounted) return;
      
      console.log('Initializing canvas...', { canvasId, userId: user?.id });
      setIsLoading(true);
      
      try {
        // 常にローカルから読み込み（キャンバスIDの有無に関わらず）
        loadFromLocalStorage();
        
        // Supabaseからは復旧用として読み込み（ローカルにデータがない場合のみ）
        if (canvasId && user?.id) {
          console.log('Loading from Supabase as fallback...');
          await loadFromSupabase();
        }
      } catch (error) {
        console.error('Failed to initialize canvas:', error);
      } finally {
        if (isMounted) {
          console.log('Canvas initialization completed');
          setIsLoading(false);
        }
      }
    };

    // Only initialize if we have user data or no canvas ID is needed
    if (user?.id || !canvasId) {
      initializeCanvas();
    } else if (!user && canvasId) {
      // If we need a canvas ID but don't have user, keep loading until auth completes
      console.log('Waiting for user authentication...');
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (isMounted && !user) {
          console.log('Authentication timeout, stopping loading...');
          setIsLoading(false);
        }
      }, 5000); // 5 second timeout
      
      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, [canvasId, user?.id]); // Removed function dependencies to prevent infinite loops

  // LocalStorageに保存（ユーザー別）
  const saveToLocalStorage = useCallback(() => {
    // ユーザー固有のキーを取得（キャンバスID付き）
    const getUserStorageKey = (baseKey: string) => {
      const userId = user?.id;
      const userSuffix = userId ? `-${userId}` : '-guest';
      const canvasSuffix = canvasId ? `-${canvasId}` : '';
      return `${baseKey}${canvasSuffix}${userSuffix}`;
    };
    
    try {
      const databasesKey = getUserStorageKey('notion-canvas-databases');
      const relationsKey = getUserStorageKey('notion-canvas-relations');
      const stateKey = getUserStorageKey('notion-canvas-state');
      
      // データベースは常に保存（空の場合も）
      localStorage.setItem(databasesKey, JSON.stringify(databases));
      localStorage.setItem(relationsKey, JSON.stringify(relations));
      localStorage.setItem(stateKey, JSON.stringify(canvasState));
      
      // キャンバスの編集時刻を更新
      if (canvasId) {
        updateCanvasModifiedTime(canvasId, 'Canvas');
      }
      
      console.log('Saved to localStorage:', { 
        databases: databases.length, 
        relations: relations.length,
        canvasId 
      });
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [databases, relations, canvasState, canvasId, user?.id]);

  // キャンバスデータを保存（ローカル優先）
  const saveCanvasData = useCallback(async () => {
    // 常にローカルに保存
    saveToLocalStorage();
    
    // 手動保存の場合のみSupabaseに保存
    // 自動保存は1分間隔で行う
  }, [databases, relations, canvasState]);


  // ローカル自動保存（デバウンス付き）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToLocalStorage();
    }, 500); // 500ms後にローカル保存

    return () => clearTimeout(timeoutId);
  }, [databases, relations, canvasState]);

  // 手動保存イベントリスナー（Supabaseに保存）
  useEffect(() => {
    const handleSave = async () => {
      saveToLocalStorage(); // まずローカルに保存
      if (canvasId) {
        await saveToSupabase(); // 手動保存時はSupabaseにも保存
      }
    };

    window.addEventListener('save-canvas', handleSave);
    return () => window.removeEventListener('save-canvas', handleSave);
  }, [canvasId, databases, relations, canvasState]);

  // 1分ごとのSupabase同期
  useEffect(() => {
    if (!canvasId) return;

    const syncInterval = setInterval(async () => {
      if (databases.length > 0) { // データがある場合のみ同期
        console.log('Auto-syncing to Supabase...');
        await saveToSupabase();
      }
    }, 60000); // 60秒 = 1分

    return () => clearInterval(syncInterval);
  }, [canvasId, databases, relations, canvasState]);


  const addDatabase = useCallback((x?: number, y?: number) => {
    let centerX: number;
    let centerY: number;
    
    if (x !== undefined && y !== undefined) {
      centerX = x;
      centerY = y;
    } else {
      // 画面中央を基準にランダムな位置を生成
      const databaseWidth = 320; // データベースの幅
      const databaseHeight = 200; // データベースの推定高さ
      const randomRange = 300; // 中央からの最大距離
      
      // 画面中央を計算（キャンバスの変換を考慮）
      const screenCenterX = (window.innerWidth / 2 - canvasState.panX) / canvasState.zoom;
      const screenCenterY = (window.innerHeight / 2 - canvasState.panY) / canvasState.zoom;
      
      // 中央からランダムな距離と角度で位置を決定
      const randomDistance = Math.random() * randomRange;
      const randomAngle = Math.random() * 2 * Math.PI;
      
      centerX = screenCenterX + Math.cos(randomAngle) * randomDistance;
      centerY = screenCenterY + Math.sin(randomAngle) * randomDistance;
    }
    
    // Use functional update to get the latest databases count
    setDatabases(prev => {
      // データベースの番号を計算
      const databaseCount = prev.length + 1;
      
      // ランダムな色を選択
      const colorOptions = [
        '#666460', '#afaba3', '#a87964', '#d09b46', '#de8031',
        '#598e71', '#4a8bb2', '#9b74b7', '#c75f96', '#d95f59'
      ];
      const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      
      const newDatabase: Database = {
        id: generateId('db'),
        name: `データベース${databaseCount}`,
        x: centerX,
        y: centerY,
        color: randomColor,
        properties: [{
          id: generateId('prop'),
          name: 'タイトル',
          type: 'title',
          required: true,
          order: 0
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return [...prev, newDatabase];
    });
  }, [canvasState.panX, canvasState.panY, canvasState.zoom]);

  const updateDatabase = useCallback((id: string, updates: Partial<Database>) => {
    setDatabases(prev => prev.map(db =>
      db.id === id ? { ...db, ...updates, updatedAt: new Date() } : db
    ));
  }, []);

  const deleteDatabase = useCallback((id: string) => {
    setDatabases(prev => prev.filter(db => db.id !== id));
    setRelations(prev => prev.filter(rel =>
      rel.fromDatabaseId !== id && rel.toDatabaseId !== id
    ));
  }, []);

  const addRelation = useCallback((fromId: string, toId: string) => {
    const newRelation: Relation = {
      id: generateId('rel'),
      fromDatabaseId: fromId,
      toDatabaseId: toId,
      type: 'single',
      fromPropertyName: 'Related',
      toPropertyName: 'Related'
    };
    setRelations(prev => [...prev, newRelation]);
  }, []);

  const deleteRelation = useCallback((id: string) => {
    setRelations(prev => prev.filter(rel => rel.id !== id));
  }, []);

  const reorderDatabases = useCallback((newDatabases: Database[]) => {
    setDatabases(newDatabases);
  }, []);

  // Auto-generate relations based on relation properties
  useEffect(() => {
    const autoRelations = generateRelationLines(databases);
    setRelations(autoRelations);
  }, [databases]);

  const zoomIn = useCallback((sensitivity = 0.1) => {
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * (1 + sensitivity), 2.5)
    }));
  }, []);

  const zoomOut = useCallback((sensitivity = 0.1) => {
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom * (1 - sensitivity), 0.5)
    }));
  }, []);

  const resetView = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      zoom: 1,
      panX: 0,
      panY: 0
    }));
  }, []);

  const focusDatabase = useCallback((database: Database) => {
    // データベースを画面中央に配置
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const databaseCenterX = database.x + 160; // データベース幅の半分
    const databaseCenterY = database.y + 100; // データベース高さの半分

    setCanvasState(prev => ({
      ...prev,
      zoom: 1,
      panX: centerX - databaseCenterX,
      panY: centerY - databaseCenterY
    }));
  }, []);

  const panCanvas = useCallback((deltaX: number, deltaY: number) => {
    setCanvasState(prev => ({
      ...prev,
      panX: prev.panX + deltaX,
      panY: prev.panY + deltaY
    }));
  }, []);

  const zoomAtPoint = useCallback((sensitivity: number, mouseX: number, mouseY: number, isZoomIn: boolean) => {
    console.log('zoomAtPoint called with:', { sensitivity, mouseX, mouseY, isZoomIn });
    setCanvasState(prev => {
      const factor = isZoomIn ? (1 + sensitivity) : (1 - sensitivity);
      const newZoom = isZoomIn 
        ? Math.min(prev.zoom * factor, 2.5)
        : Math.max(prev.zoom * factor, 0.5);
      const zoomRatio = newZoom / prev.zoom;
      const newPanX = mouseX - (mouseX - prev.panX) * zoomRatio;
      const newPanY = mouseY - (mouseY - prev.panY) * zoomRatio;
      
      console.log('Zoom state change:', {
        prevZoom: prev.zoom,
        newZoom,
        factor,
        sensitivity
      });
      
      return {
        ...prev,
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY
      };
    });
  }, []);

  const clearCanvas = useCallback(() => {
    // ユーザー固有のキーを取得（キャンバスID付き）
    const getUserStorageKey = (baseKey: string) => {
      const userId = user?.id;
      const userSuffix = userId ? `-${userId}` : '-guest';
      const canvasSuffix = canvasId ? `-${canvasId}` : '';
      return `${baseKey}${canvasSuffix}${userSuffix}`;
    };
    
    setDatabases([]);
    setRelations([]);
    setCanvasState({
      zoom: 1,
      panX: 0,
      panY: 0,
      selectedIds: []
    });
    // LocalStorageもクリア（ユーザー別・キャンバス別）
    localStorage.removeItem(getUserStorageKey('notion-canvas-databases'));
    localStorage.removeItem(getUserStorageKey('notion-canvas-relations'));
    localStorage.removeItem(getUserStorageKey('notion-canvas-state'));
  }, [canvasId, user?.id]);

  return {
    databases,
    relations,
    canvasState,
    isLoading,
    addDatabase,
    updateDatabase,
    deleteDatabase,
    addRelation,
    deleteRelation,
    reorderDatabases,
    setCanvasState,
    zoomIn,
    zoomOut,
    zoomAtPoint,
    resetView,
    focusDatabase,
    panCanvas,
    clearCanvas,
    saveCanvasData,
    undo,
    redo,
    canUndo: historyIndex.current > 0,
    canRedo: historyIndex.current < history.current.length - 1,
    setDatabases,
    setRelations
  };
};