#!/usr/bin/env node

/**
 * Supabase構造の整理・最適化スクリプト
 * 
 * 使用方法:
 * node run-supabase-cleanup.js
 * 
 * または環境変数を指定:
 * DATABASE_URL="postgresql://..." node run-supabase-cleanup.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 環境変数チェック
const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URLまたはNEXT_PUBLIC_SUPABASE_URLが設定されていません');
  console.log('💡 .env.localファイルまたは環境変数で設定してください');
  process.exit(1);
}

console.log('🚀 Supabase構造の整理を開始します...');

// SQLファイルの存在確認
const sqlFile = path.join(__dirname, 'supabase-cleanup.sql');
if (!fs.existsSync(sqlFile)) {
  console.error('❌ supabase-cleanup.sqlファイルが見つかりません');
  process.exit(1);
}

// SQL実行の準備
const command = `psql "${databaseUrl}" -f "${sqlFile}"`;

try {
  console.log('📋 SQLスクリプトを実行中...');
  const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  
  console.log('✅ Supabase構造の整理が完了しました');
  console.log('\n📊 実行結果:');
  console.log(output);
  
  // 統計情報の取得
  console.log('\n📈 システム統計を取得中...');
  const statsCommand = `psql "${databaseUrl}" -c "SELECT * FROM admin_dashboard;"`;
  const stats = execSync(statsCommand, { encoding: 'utf8', stdio: 'pipe' });
  console.log(stats);
  
  console.log('\n🎉 すべての処理が完了しました！');
  console.log('📚 詳細はSUPABASE_ARCHITECTURE.mdを参照してください');
  
} catch (error) {
  console.error('❌ SQL実行中にエラーが発生しました:');
  console.error(error.message);
  
  if (error.message.includes('psql: command not found')) {
    console.log('\n💡 psqlコマンドがインストールされていません。');
    console.log('   MacOS: brew install postgresql');
    console.log('   Ubuntu: sudo apt-get install postgresql-client');
    console.log('   Windows: PostgreSQLをインストールしてください');
  } else if (error.message.includes('connection')) {
    console.log('\n💡 データベース接続に失敗しました。');
    console.log('   DATABASE_URLが正しく設定されているか確認してください');
  }
  
  process.exit(1);
}

// 不要なSQLファイルの整理
console.log('\n🗂️  古いSQLファイルを整理中...');
const filesToRemove = [
  'create-canvases-table.sql',  // 未使用テーブル
  'cleanup-unused-tables.sql',  // 統合済み
  'test-supabase-setup.sql',    // テスト用
];

filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  ✅ ${file} を削除しました`);
  }
});

console.log('\n📁 ファイル整理が完了しました');
console.log('💾 重要なSQLファイル:');
console.log('  - supabase-cleanup.sql (メイン整理スクリプト)');
console.log('  - supabase-migration.sql (マイグレーション履歴)');
console.log('  - fix-access-codes-rls.sql (RLS修正)');
console.log('  - fix-storage-rls.sql (Storage RLS修正)');