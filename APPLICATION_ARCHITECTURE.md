# Database Canvas - アプリケーションアーキテクチャ

## 概要

Database Canvasは、ユーザーがデータベーススキーマを作成、設計し、Notionにエクスポートできるビジュアルデータベース設計ツールです。プロパティ、リレーション、数式をサポートしたリレーショナルデータベース設計のための直感的なキャンバスベースのインターフェースを提供します。

## 技術スタック

- **フロントエンド**: Next.js 15.3.3 with Turbopack, React 18, TypeScript
- **バックエンド**: Next.js API Routes, Supabase (PostgreSQL with RLS)
- **認証**: ユーザーID + パスワードによるカスタムセッションベース認証
- **スタイリング**: Tailwind CSS
- **アイコン**: Lucide React
- **データベース**: Supabase PostgreSQL with Row Level Security (RLS)

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                フロントエンド (Next.js)                    │
├─────────────────────────────────────────────────────────────┤
│  ページ          │  コンポーネント    │  フック & ユーティル│
│  - ログイン      │  - キャンバス      │  - useCanvas      │
│  - ダッシュボード│  - データベース    │  - useRelationLines│
│  - キャンバス/[id]│ - プロパティ      │  - useSettings    │
│  - 管理画面      │  - Notionエクスポート│ - Supabase lib   │
│                  │  - 設定            │  - Notion lib     │
├─────────────────────────────────────────────────────────────┤
│                API ルート (Next.js)                        │
│  - /api/auth           - 認証                               │
│  - /api/canvases       - キャンバス CRUD 操作              │
│  - /api/canvas-data    - キャンバスデータ管理               │
│  - /api/notion/*       - Notion連携                        │
│  - /api/passwords      - パスワード管理                     │
├─────────────────────────────────────────────────────────────┤
│                バックエンドサービス                        │
│  - Supabase (PostgreSQL + RLS)                            │
│  - Notion API 連携                                         │
│  - セッション管理                                          │
└─────────────────────────────────────────────────────────────┘
```

## 主要機能

### 1. 認証システム
- **カスタムユーザーID + パスワード認証**: 一意のユーザーIDとパスワードでの認証
- **セッション管理**: localStorageを使用した7日間の永続認証
- **管理パネル**: ユーザー認証情報の生成・管理
- **データベース**: ユーザー分離のためのRLS付き`access_passwords`テーブル

### 2. キャンバスベースのデータベース設計
- **ビジュアルインターフェース**: データベース設計のためのドラッグ&ドロップキャンバス
- **データベースボックス**: プロパティを持つ個別のデータベース表現
- **プロパティ管理**: 様々なタイプのプロパティの追加、編集、削除
- **リレーション線**: 関連データベース間のビジュアル接続
- **数式線**: 数式依存関係のビジュアル表現

### 3. プロパティタイプサポート
- **基本タイプ**: title, text, number, checkbox, url, email, phone, date
- **選択タイプ**: select, multi-select, status
- **リレーションタイプ**: relation, formula
- **システムタイプ**: created_time, created_by, last_edited_time, last_edited_by, id
- **ファイルタイプ**: files, person

### 4. 数式システム
- **プロパティ参照**: `prop("property_name")` 構文
- **データベース間参照**: 他のデータベースを参照する数式のサポート
- **ビジュアル依存関係**: プロパティ間の依存関係を示す数式線
- **式エディタ**: プロパティ候補付きのインライン編集

### 5. Notion連携
- **APIキー管理**: ユーザー分離でのSupabaseでの安全な保存
- **エクスポート機能**: キャンバス設計をNotionデータベースに変換
- **ページ選択**: エクスポート先のNotionページを選択
- **プロパティマッピング**: キャンバスプロパティからNotionプロパティへの自動マッピング
- **ステータス処理**: ステータスプロパティをselectに変換（API制限）

### 6. 設定と環境設定
- **キャンバス設定**: ズーム感度、パン感度、グリッドオプション
- **プロパティ削除確認**: 破壊的な操作のための安全設定
- **操作モード**: Mac、Windows、マウス固有のコントロールサポート
- **リレーション線の表示/非表示**: リレーション線の表示切り替え

## データベーススキーマ (Supabase)

### テーブル

#### `access_passwords`
```sql
CREATE TABLE access_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0
);
```

#### `notion_integrations`
```sql
CREATE TABLE notion_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES access_passwords(user_id),
  api_key TEXT NOT NULL,
  workspace_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `canvases`
```sql
CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES access_passwords(user_id),
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 行レベルセキュリティ (RLS)
すべてのテーブルで、ユーザーが自分のデータのみにアクセスできるようにするRLSポリシーを実装：
```sql
CREATE POLICY "Users can only access their own data" ON table_name
FOR ALL USING (user_id = current_setting('app.current_user_id'));
```

## ファイル構造

```
src/
├── app/                          # Next.js App Router
│   ├── admin/page.tsx           # Admin panel for user management
│   ├── api/                     # API routes
│   │   ├── auth/route.ts        # Authentication endpoint
│   │   ├── canvas-data/route.ts # Canvas data management
│   │   ├── canvases/route.ts    # Canvas CRUD operations
│   │   ├── notion/              # Notion integration APIs
│   │   └── passwords/route.ts   # Password management
│   ├── canvas/[id]/page.tsx     # Canvas editor page
│   ├── dashboard/page.tsx       # User dashboard
│   ├── login/page.tsx           # Authentication page
│   └── page.tsx                 # Landing page
├── components/                   # React components
│   ├── Canvas/                  # Canvas-related components
│   ├── Connection/              # Connection line components
│   ├── Database/                # Database box components
│   ├── Formula/                 # Formula-related components
│   ├── Notion/                  # Notion integration components
│   ├── Property/                # Property management components
│   ├── Relation/                # Relation line components
│   ├── Settings/                # Settings components
│   └── UI/                      # Common UI components
├── hooks/                       # Custom React hooks
├── lib/                         # Utility libraries
├── types/                       # TypeScript type definitions
└── globals.css                  # Global styles
```

## 主要コンポーネント

### Canvas.tsx
- ビジュアルデータベース設計を管理するメインキャンバスコンポーネント
- ズーム、パン、ドラッグ操作の処理
- データベースの位置決めと選択の管理
- リレーション線と数式線のレンダリング
- カスタマイズのための設定との統合

### DatabaseBox.tsx
- 個別のデータベース表現
- プロパティリストの管理
- データベースの編集と削除の処理
- リレーション用の接続ポイントのレンダリング

### PropertyItem.tsx
- データベース内の個別プロパティ表現
- すべてのプロパティタイプのサポート
- インライン編集機能
- 数式とリレーション用の接続ポイント

### FormulaEditor.tsx
- インライン数式編集コンポーネント
- プロパティ参照の候補表示
- 式の検証と解析
- プロパティ参照の削除機能

### NotionExportDialog.tsx
- 完全なNotionエクスポートワークフロー
- APIキーの管理とテスト
- ページ選択インターフェース
- エクスポート進行状況と結果表示
- エラーハンドリングとユーザーガイダンス

## APIエンドポイント

### 認証
- `POST /api/auth`: ユーザーIDとパスワードでの認証
- `GET /api/passwords`: すべてのアクセスパスワードを一覧表示（管理者）
- `POST /api/passwords`: 新しいアクセスパスワードの作成（管理者）
- `DELETE /api/passwords`: アクセスパスワードの削除（管理者）

### キャンバス管理
- `GET /api/canvases`: ユーザーのキャンバス一覧
- `POST /api/canvases`: 新しいキャンバスの作成
- `PUT /api/canvases`: キャンバスの更新
- `DELETE /api/canvases`: キャンバスの削除
- `GET /api/canvas-data`: IDによるキャンバスデータの取得
- `POST /api/canvas-data`: キャンバスデータの保存

### Notion連携
- `GET /api/notion/settings`: ユーザーのNotion設定の取得
- `POST /api/notion/settings`: Notion APIキーと設定の保存
- `DELETE /api/notion/settings`: Notion設定のクリア
- `POST /api/notion/test`: Notion API接続のテスト
- `POST /api/notion/pages`: アクセス可能なNotionページの一覧
- `POST /api/notion/create`: キャンバスをNotionにエクスポート

## データフロー

### キャンバス編集
1. ユーザーがキャンバスページを読み込み → Supabaseからキャンバスデータを取得
2. ユーザーがキャンバスを編集 → ローカル状態を更新
3. 自動保存または手動保存 → `/api/canvas-data`にPOST
4. リアルタイムリレーション線計算 → `useRelationLines`フック

### Notionエクスポート
1. ユーザーがエクスポートダイアログを開く → 既存のNotion設定を確認
2. ユーザーがAPIキーを入力/テスト → RLS経由でSupabaseに保存
3. Notionページを読み込み → Notion APIから取得
4. ユーザーがページを選択してエクスポート → データベースを処理してNotionで作成
5. 作成されたデータベースへのリンクと結果を表示

### 認証フロー
1. ユーザーが認証情報を入力 → `/api/auth`にPOST
2. サーバーが`access_passwords`テーブルに対して検証
3. 成功 → localStorage認証 + sessionStorageユーザーIDを設定
4. 以降のすべてのAPI呼び出しでRLSコンテキスト用にユーザーIDを使用

## セキュリティ考慮事項

### 行レベルセキュリティ (RLS)
- すべてのデータアクセスはRLSポリシーによってユーザーIDで制限
- 認証されたリクエストの開始時にユーザーコンテキストを設定
- ユーザーは他のユーザーのキャンバスや設定にアクセスできない

### APIキーセキュリティ
- Notion APIキーは転送時に暗号化され、安全に保存
- キーはRLSを通じて所有ユーザーのみがアクセス可能
- フロントエンドのlocalStorage/sessionStorageにAPIキーは保存されない

### 認証
- パスワードは保存前にハッシュ化
- セッション有効期限を強制（7日間）
- 管理パネルはユーザー認証とは分離

## パフォーマンス最適化

### キャンバスレンダリング
- リレーションと数式のための効率的なSVG線計算
- 過度なAPI呼び出しを防ぐデバウンス自動保存
- キャンバス要素の最適化された再レンダリング

### データ管理
- インテリジェントキャッシングによる最小限のAPI呼び出し
- キャンバス保存のためのバルク操作
- キャンバスデータの効率的なJSON保存

## 統合ポイント

### Notion API
- Notionのデータベース作成APIとの完全統合
- すべての主要プロパティタイプのサポート
- 自動リレーション作成
- API制限のエラーハンドリング

### Supabase
- 信頼性の高いデータ保存のためのPostgreSQL
- リアルタイム機能（現在は未使用だが利用可能）
- セキュリティのための組み込みRLS
- 簡単なスケーリングとバックアップ

## 潜在的な收益化機能

### 無料プランの制限
- **エクスポート制限**: Notionエクスポート回数を制限（例：月と5回）
- **キャンバス制限**: キャンバス数を制限（例：3個まで）
- **データベース制限**: キャンバスあたりのデータベース数を制限（例：最大5個）

### 有料プランのメリット
- **無制限エクスポート**: Notionエクスポートに制限なし
- **無制限キャンバス**: 必要なだけ設計プロジェクトを作成可能
- **無制限データベース**: 複雑さに制限なし
- **プレミアムサポート**: 優先顧客サポート
- **高度な機能**: 
  - キャンバステンプレート
  - コラボレーション機能
  - 他プラットフォームへのエクスポート（MySQL、PostgreSQLスキーマ）
  - バージョン履歴とブランチ機能

### 実装戦略
- `access_passwords`テーブルに`plan_type`と`export_count`を追加
- エクスポート前に制限をチェックするミドルウェアを実装
- 決済統合を追加（Stripe/PayPal）
- サブスクリプション管理インターフェースを作成

## 将来の機能強化の機会

1. **コラボレーション**: マルチユーザーキャンバス編集
2. **テンプレート**: 事前構築されたデータベーステンプレート
3. **バージョン管理**: キャンバス履歴とブランチ機能
4. **追加エクスポート**: MySQL、PostgreSQLスキーマエクスポート
5. **APIアクセス**: プログラムによるキャンバス作成のためのREST API
6. **モバイルサポート**: タブレット/モバイル用のレスポンシブデザイン
7. **高度な数式**: より複雑な数式構文のサポート
8. **インポート**: 既存データベーススキーマのインポート

## 技術的負債と改善点

1. **エラーハンドリング**: より包括的なエラーバウンダリ
2. **テスト**: ユニットテストと統合テストのカバレッジ
3. **パフォーマンス**: 大規模設計のためのキャンバス仮想化
4. **アクセシビリティ**: より良いキーボードナビゲーションとスクリーンリーダーサポート
5. **国際化**: 多言語サポート
6. **ドキュメント**: ユーザーガイドとAPIドキュメント