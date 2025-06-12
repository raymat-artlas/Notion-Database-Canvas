# Notion Database Canvas App - 開発要件書

## プロジェクト概要
Notionのデータベース設計を視覚的に行うためのキャンバスアプリケーションを開発します。Miroのような直感的なUIで、複数のデータベース間の関係性を設計し、将来的にNotionに自動作成できる基盤を目指します。

## 技術要件
- **フロントエンド:** Next.js + React + TypeScript
- **スタイリング:** Tailwind CSS
- **状態管理:** React Hooks (useState, useReducer)
- **アイコン:** Lucide React
- **キャンバス操作:** ネイティブHTML5 Canvas または SVG
- **バックエンド・DB:** Supabase (PostgreSQL + Auth + Storage)
- **デプロイ:** Vercel
- **決済管理:** Stripe
- **データ永続化:** Supabase Database + ローカルストレージ（一時保存）

## 機能要件
### 1. データベース管理機能
- ✅ データベース追加: クリック一つで新しいデータベースをキャンバスに追加
- ✅ ドラッグ&ドロップ: データベースボックスを自由に移動
- ✅ データベース名編集: クリックでインライン編集
- ✅ データベース削除: 確認ダイアログ付きで削除
- 🆕 データベース複製: 既存のデータベース構造をコピー
- 🆕 データベース色分け: カテゴリ別の色設定

### 2. プロパティ管理機能
- ✅ プロパティ追加: 各データベースにプロパティを追加
- ✅ プロパティタイプ変更: ドロップダウンで9種類のタイプから選択
  - Title, Text, Number, Select, Multi-Select, Date, Person, Checkbox, URL
- ✅ プロパティ名編集: クリックでインライン編集
- ✅ プロパティ削除: 個別削除機能
- 🆕 プロパティ並び替え: ドラッグ&ドロップで順序変更
- 🆕 セレクトオプション設定: Select/Multi-Selectプロパティのオプション編集

### 3. リレーション管理機能
- ✅ 接続モード: 移動モードと接続モードの切り替え
- ✅ リレーション描画: データベース間を線で接続
- ✅ 接続線削除: クリックで関係線を削除
- 🆕 リレーションタイプ設定: Single Property / Dual Property選択
- 🆕 リレーション名設定: 接続線にラベル表示
- 🆕 ロールアップ設定: リレーション作成時に集計設定

### 4. キャンバス操作機能
- 🆕 ズーム機能: マウスホイールでズームイン/アウト
- 🆕 パン機能: 中クリックドラッグでキャンバス移動
- 🆕 グリッドスナップ: オプションでグリッドに整列
- 🆕 選択機能: 矩形選択で複数要素選択
- 🆕 一括操作: 選択された要素の一括移動/削除

### 5. データ管理機能
- 🆕 プロジェクト保存: 設計をJSON形式で保存
- 🆕 プロジェクト読み込み: 保存されたプロジェクトを読み込み
- 🆕 エクスポート機能: PNG画像/PDF/JSON形式で出力
- 🆕 テンプレート機能: よく使う構造をテンプレート化
- 🆕 履歴機能: Undo/Redo操作（10ステップまで）

### 6. UI/UX改善
- 🆕 ツールバー: 固定ツールバーに主要機能を配置
- 🆕 プロパティパネル: 選択要素の詳細設定サイドパネル
- 🆕 ミニマップ: 大きなキャンバスでの位置把握
- 🆕 キーボードショートカット: 主要操作のショートカット
- 🆕 ダークモード: ライト/ダークテーマ切り替え

## データ構造設計
```typescript
interface Database {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  properties: Property[];
  createdAt: Date;
  updatedAt: Date;
}

interface Property {
  id: string;
  name: string;
  type: PropertyType;
  required: boolean;
  options?: SelectOption[]; // Select/Multi-Select用
  order: number;
}

interface Relation {
  id: string;
  fromDatabaseId: string;
  toDatabaseId: string;
  type: 'single' | 'dual';
  label?: string;
  fromPropertyName: string;
  toPropertyName: string;
  rollups?: Rollup[];
}

interface Rollup {
  id: string;
  name: string;
  sourceProperty: string;
  function: 'count' | 'sum' | 'average' | 'min' | 'max';
}

interface Project {
  id: string;
  name: string;
  databases: Database[];
  relations: Relation[];
  canvas: CanvasState;
  createdAt: Date;
  updatedAt: Date;
}
```

## パフォーマンス要件
- レスポンス時間: すべての操作が100ms以内
- スムーズなアニメーション: 60FPS維持
- 大規模データ対応: 50個のデータベース、500個のプロパティまで快適動作
- メモリ使用量: 50MB以下で動作

## 品質要件
- ユーザビリティ: 初回利用でも直感的に操作可能
- アクセシビリティ: キーボードナビゲーション対応
- レスポンシブ: 最小1280px幅で最適化
- エラーハンドリング: 操作ミス時の適切なフィードバック

## 将来拡張予定
- Notion API連携機能
- チーム共有機能
- コメント機能
- バージョン管理
- テンプレートマーケットプレイス

## 開発優先順位
### Phase 1 (MVP): 基本機能
- データベース追加・編集・削除
- プロパティ管理（基本9タイプ）
- ドラッグ&ドロップ移動
- リレーション描画・削除
- プロジェクト保存・読み込み

### Phase 2: UX改善
- ズーム・パン機能
- 履歴機能（Undo/Redo）
- キーボードショートカット
- プロパティ並び替え
- データベース色分け

### Phase 3: 高度な機能
- セレクトオプション編集
- ロールアップ設定
- エクスポート機能
- テンプレート機能
- ダークモード

## 実装ガイドライン
### コード構成
```
src/
├── components/           # React コンポーネント
│   ├── Canvas/          # キャンバス関連
│   ├── Database/        # データベース要素
│   ├── Property/        # プロパティ管理
│   ├── Relation/        # リレーション管理
│   └── UI/              # 共通UIコンポーネント
├── hooks/               # カスタムフック
├── utils/               # ユーティリティ関数
├── types/               # TypeScript型定義
└── stores/              # 状態管理
```

### 注意事項
- パフォーマンス: 大量の要素でもスムーズに動作するよう最適化
- データ整合性: リレーション削除時の関連データ整理
- ユーザー体験: 操作の取り消し可能性を常に考慮
- 拡張性: 将来のNotion API連携を考慮した設計 


### キャンバスの保存方法
- ローカルストレージとSupabaseのハイブリッド
- Supabaseではテーブルを使わずStorageにJSONファイルとして保存する
- ローカルストレージへの保存を基本とし、保存ボタンを押したときや、一定間隔で自動でSupabaseの方を更新する