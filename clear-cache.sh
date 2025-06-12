#!/bin/bash

echo "🧹 Next.jsのキャッシュをクリアしています..."

# .next フォルダを削除
rm -rf .next

# node_modules/.cache を削除
rm -rf node_modules/.cache

echo "✅ キャッシュをクリアしました！"
echo "📌 次のコマンドでサーバーを再起動してください："
echo "   npm run dev"