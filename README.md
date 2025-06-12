# Notion Database Canvas

Notionデータベースの設計とエクスポートを行うWebアプリケーション

## 機能

- **ビジュアルデータベース設計**: ドラッグ&ドロップでデータベース構造を設計
- **リアルタイム関係性可視化**: データベース間のリレーションを線で表示
- **Notionエクスポート**: 設計したデータベースを直接Notionにエクスポート
- **ユーザー管理**: 認証システムとプラン管理
- **プラン管理**: Free/Premiumプランによる機能制限

## セットアップ

1. 環境変数の設定（`.env.local`）:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
```

2. 依存関係のインストール:
```bash
npm install
```

3. Supabaseテーブルのセットアップ:
```bash
# supabase-setup-all-tables.sqlを実行
```

4. 開発サーバーの起動:
```bash
npm run dev
```

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **ストレージ**: Supabase Storage
- **UI**: Tailwind CSS, Lucide React
- **状態管理**: React Hooks
- **メール送信**: Resend

## デプロイ

Vercelプラットフォームでのデプロイを推奨:

1. GitHubリポジトリをVercelに連携
2. 環境変数を設定
3. 自動デプロイを有効化
