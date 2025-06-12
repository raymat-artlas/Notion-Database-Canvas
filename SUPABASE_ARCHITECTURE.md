# Supabase Architecture - Simplified Overview

## 概要
Database Canvasアプリケーションのデータ管理にSupabaseを使用しています。

## データベース構造

### 1. 主要テーブル

#### `access_passwords` (認証・ユーザー管理)
- **目的**: ユーザー認証とNotionインテグレーション設定
- **フィールド**:
  - `user_id`: ユーザー識別子
  - `password`: アクセスパスワード  
  - `label`: ユーザー表示名
  - `notion_api_key`: Notion APIキー
  - `notion_workspace_name`: Notionワークスペース名
  - `is_active`: アクティブ状態
  - `usage_count`: ログイン回数
  - `expires_at`: 有効期限

#### `users` (プラン管理・使用状況)
- **目的**: ユーザープランと使用量トラッキング
- **フィールド**:
  - `user_id`: access_passwordsとの連携キー
  - `plan`: 'free' | 'premium'
  - `canvas_count`: キャンバス作成数
  - `export_count`: エクスポート回数
  - `export_reset_date`: エクスポート回数リセット日

#### `access_codes` (アクセスコード管理)
- **目的**: 新規ユーザー登録用のアクセスコード
- **フィールド**:
  - `code`: アクセスコード
  - `granted_plan`: 付与されるプラン
  - `max_uses`: 最大使用回数
  - `is_active`: 有効状態

#### `code_usage_history` (コード使用履歴)
- **目的**: アクセスコード使用履歴の記録
- **フィールド**:
  - `user_id`: 使用ユーザー
  - `code`: 使用されたコード
  - `applied_at`: 適用日時

### 2. Supabase Storage

#### Bucket: `canvas-data`
- **目的**: キャンバスデータのJSON保存
- **パス形式**: `{userId}/{canvasId}.json`
- **データ形式**:
  ```json
  {
    "databases": [],
    "relations": [],
    "canvasState": {},
    "canvasInfo": {},
    "memo": ""
  }
  ```

## データフロー

### 認証フロー
1. ユーザーがuser_id + passwordでログイン
2. `access_passwords`テーブルで認証
3. 対応する`users`レコードを取得/作成
4. セッション確立

### キャンバス操作フロー
1. ローカルストレージに即座に保存
2. バックグラウンドでSupabase Storageに同期
3. `users.canvas_count`を更新

### Notionエクスポートフロー
1. `access_passwords.notion_api_key`でNotion API呼び出し
2. エクスポート成功時に`users.export_count`をインクリメント
3. プラン制限チェック

## セキュリティ

### Row Level Security (RLS)
- 全テーブルでRLS有効
- ユーザーは自分のデータのみアクセス可能
- Service Roleキーで管理者権限

### アクセス権限
- **Anon Key**: 読み取り専用（公開データ）
- **Service Role Key**: 全権限（サーバーサイドのみ）

## API エンドポイント

### 認証系
- `POST /api/auth` - ユーザー認証
- `POST /api/auth/signup` - 新規ユーザー登録

### ユーザー管理
- `GET /api/user` - ユーザー情報取得
- `POST /api/user` - ユーザー情報更新
- `GET /api/admin/users` - 全ユーザー情報（管理者）

### キャンバス系
- `GET /api/canvas/{id}` - キャンバスデータ取得
- `PUT /api/canvas/{id}` - キャンバスデータ保存
- `DELETE /api/canvas/{id}` - キャンバスデータ削除

### Notion連携
- `GET /api/notion/settings` - Notion設定取得
- `POST /api/notion/settings` - Notion設定保存
- `POST /api/notion/create` - Notionデータベース作成

## 最適化ポイント

### 完了済み
- ✅ Supabaseクライアントを`/src/lib/supabase.ts`に統合
- ✅ 未使用の`canvases`テーブル削除予定
- ✅ Notion設定を`access_passwords`テーブルに統合

### 推奨改善
1. **Notion設定の分離**: 専用テーブルを作成してセキュリティ向上
2. **認証システム統一**: Supabase Authに移行検討
3. **キャッシュ戦略**: 頻繁アクセスデータのRedis導入

## トラブルシューティング

### よくある問題
1. **RLSエラー**: ユーザーIDが正しく設定されているか確認
2. **Storage権限エラー**: Bucket RLSポリシーを確認
3. **API制限エラー**: Service Role Keyの使用場所を確認

### デバッグコマンド
```sql
-- ユーザーデータ確認
SELECT * FROM access_passwords WHERE user_id = 'user-xxxxx';
SELECT * FROM users WHERE user_id = 'user-xxxxx';

-- Storage確認
SELECT * FROM storage.objects WHERE bucket_id = 'canvas-data';
```

## 設定ファイル

### 環境変数
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Supabaseクライアント
- 通常クライアント: 匿名キー使用、フロントエンド向け
- 管理クライアント: Service Roleキー使用、サーバーサイド向け