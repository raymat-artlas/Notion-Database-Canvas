import { getEffectivePlan, PLAN_LIMITS } from './planLimits';

export interface CanvasMetadata {
  id: string;
  lastAccessedAt: string;
  lastModifiedAt: string;
  createdAt: string;
  name: string;
}

// ローカルストレージのキー
const CANVAS_METADATA_KEY = 'canvas-metadata';

// キャンバスのメタデータを取得
export function getCanvasMetadata(): Record<string, CanvasMetadata> {
  if (typeof window === 'undefined') return {};
  
  const stored = localStorage.getItem(CANVAS_METADATA_KEY);
  return stored ? JSON.parse(stored) : {};
}

// キャンバスのメタデータを保存
export function saveCanvasMetadata(metadata: Record<string, CanvasMetadata>) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(CANVAS_METADATA_KEY, JSON.stringify(metadata));
}

// キャンバスのアクセス時刻を更新
export function updateCanvasAccessTime(canvasId: string, canvasName: string) {
  const metadata = getCanvasMetadata();
  const now = new Date().toISOString();
  
  metadata[canvasId] = {
    id: canvasId,
    lastAccessedAt: now,
    lastModifiedAt: metadata[canvasId]?.lastModifiedAt || now,
    createdAt: metadata[canvasId]?.createdAt || now,
    name: canvasName
  };
  
  saveCanvasMetadata(metadata);
}

// キャンバスの編集時刻を更新
export function updateCanvasModifiedTime(canvasId: string, canvasName: string) {
  const metadata = getCanvasMetadata();
  const now = new Date().toISOString();
  
  metadata[canvasId] = {
    id: canvasId,
    lastAccessedAt: now,
    lastModifiedAt: now,
    createdAt: metadata[canvasId]?.createdAt || now,
    name: canvasName
  };
  
  saveCanvasMetadata(metadata);
}

// 期限切れのキャンバスをチェック（最終編集日から判定）
export function checkExpiredCanvases(userPlan: 'free' | 'premium'): string[] {
  const metadata = getCanvasMetadata();
  const retentionDays = PLAN_LIMITS[userPlan].retentionDays;
  
  // プレミアムプランは無期限
  if (retentionDays === Infinity) return [];
  
  const now = new Date();
  const expiredCanvases: string[] = [];
  
  Object.entries(metadata).forEach(([canvasId, data]) => {
    const lastModified = new Date(data.lastModifiedAt);
    const daysSinceModified = Math.floor((now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceModified > retentionDays) {
      expiredCanvases.push(canvasId);
    }
  });
  
  return expiredCanvases;
}

// 期限切れのキャンバスを削除
export function deleteExpiredCanvases(userPlan: 'free' | 'premium'): number {
  const expiredIds = checkExpiredCanvases(userPlan);
  const metadata = getCanvasMetadata();
  
  expiredIds.forEach(canvasId => {
    // ローカルストレージからキャンバスデータを削除
    localStorage.removeItem(`canvas-${canvasId}`);
    
    // メタデータからも削除
    delete metadata[canvasId];
  });
  
  saveCanvasMetadata(metadata);
  
  return expiredIds.length;
}

// 残り日数を取得（最終編集日から計算）
export function getDaysUntilExpiration(canvasId: string, userPlan: 'free' | 'premium'): number | null {
  const metadata = getCanvasMetadata();
  const canvasData = metadata[canvasId];
  
  if (!canvasData) return null;
  
  const retentionDays = PLAN_LIMITS[userPlan].retentionDays;
  if (retentionDays === Infinity) return null; // プレミアムは無期限
  
  const lastModified = new Date(canvasData.lastModifiedAt);
  const now = new Date();
  const daysSinceModified = Math.floor((now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, retentionDays - daysSinceModified);
}