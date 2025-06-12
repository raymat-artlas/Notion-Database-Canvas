import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Notion設定の型定義
export interface NotionSettings {
  apiKey: string;
  defaultPageId?: string;
  enabled: boolean;
}

// グローバルセッションストア（実際の実装ではRedisやDBを使用）
declare global {
  var notionSessionStore: Map<string, NotionSettings> | undefined;
}

if (!globalThis.notionSessionStore) {
  globalThis.notionSessionStore = new Map<string, NotionSettings>();
}

export const sessionStore = globalThis.notionSessionStore;

// セッションからNotion APIキーを取得
export function getNotionApiKey(): string | null {
  const cookieStore = cookies();
  const sessionId = cookieStore.get('notion-session')?.value;
  
  if (sessionId && sessionStore.has(sessionId)) {
    return sessionStore.get(sessionId)!.apiKey;
  }
  
  // 環境変数からデフォルトのAPIキーを取得（オプション）
  return process.env.NOTION_API_KEY || null;
}

// セッションから設定を取得
export function getNotionSettings(): NotionSettings | null {
  const cookieStore = cookies();
  const sessionId = cookieStore.get('notion-session')?.value;
  
  if (sessionId && sessionStore.has(sessionId)) {
    return sessionStore.get(sessionId)!;
  }
  
  return null;
}