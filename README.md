# Database Canvas - Notion Builder

Notionデータベースの設計とエクスポートを行うWebアプリケーション

## 機能

- **ビジュアルデータベース設計**: ドラッグ&ドロップでデータベース構造を設計
- **リアルタイム関係性可視化**: データベース間のリレーションを線で表示
- **Notionエクスポート**: 設計したデータベースを直接Notionにエクスポート
- **ユーザー管理**: アクセスコードベースの認証システム
- **プラン管理**: Free/Premiumプランによる機能制限

## セットアップ

1. 環境変数の設定（`.env.local`）:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. 依存関係のインストール:
```bash
npm install
```

3. Supabaseの構造セットアップ:
```bash
# 推奨: 自動整理スクリプトを実行
node run-supabase-cleanup.js

# または手動でSQLを実行
psql $DATABASE_URL < supabase-cleanup.sql
```

4. 開発サーバーの起動:
```bash
npm run dev
```

## Supabase構造

詳細な構造とデータフローについては [`SUPABASE_ARCHITECTURE.md`](./SUPABASE_ARCHITECTURE.md) を参照してください。

### 主要コンポーネント
- **認証**: `access_passwords`テーブルでユーザー管理
- **データ保存**: Supabase Storageでキャンバスデータ管理  
- **Notion連携**: APIキーは`access_passwords`テーブルに統合保存

## 技術スタック

- **フレームワーク**: Next.js 15.3.3 (App Router)
- **データベース**: Supabase (PostgreSQL)
- **認証**: カスタム認証システム (access_passwords)
- **ストレージ**: Supabase Storage
- **UI**: Tailwind CSS, Lucide React
- **状態管理**: React Hooks

## プロジェクト構成

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API Routes
│   ├── admin/        # 管理画面
│   ├── canvas/       # キャンバスページ  
│   └── dashboard/    # ダッシュボード
├── components/       # Reactコンポーネント
│   ├── Canvas/       # キャンバス関連
│   ├── Database/     # データベース表示
│   ├── Notion/       # Notionエクスポート
│   └── UI/           # 共通UIコンポーネント
├── hooks/            # カスタムフック
├── lib/              # ユーティリティ関数
└── types/            # TypeScript型定義
```

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# 型チェック
npm run type-check

# リント
npm run lint
```

## デプロイ

Vercelプラットフォームでのデプロイを推奨:

1. GitHubリポジトリをVercelに連携
2. 環境変数を設定
3. 自動デプロイを有効化

詳細は [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) を参照してください。

## 管理

### ユーザー管理
- 管理画面: `/admin`
- アクセスコード生成とユーザー管理
- 使用量モニタリング

### データベース管理
- Supabaseダッシュボードでデータ確認
- `SUPABASE_ARCHITECTURE.md`に記載のSQLクエリを活用

## トラブルシューティング

### よくある問題
1. **認証エラー**: ユーザーIDとパスワードの組み合わせを確認
2. **Storageエラー**: RLSポリシーとバケット設定を確認  
3. **Notionエラー**: APIキーとワークスペース権限を確認

### ログ確認
```bash
# 開発時のログ確認
npm run dev

# 本番環境のログはVercelダッシュボードで確認
```