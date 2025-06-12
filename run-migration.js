// Supabaseテーブル変更を実行するスクリプト
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('🔄 Supabaseテーブル変更を実行中...');
    
    // 1. Supabaseでは直接SQLを実行できないので、既存のテーブル構造を確認して判断する
    console.log('📝 1. 現在のテーブル構造を確認してカラムが存在するかチェック...');
    
    let hasNotionColumns = false;
    try {
      // テーブル構造確認のため少量のデータを取得
      const { data: sampleData, error: sampleError } = await supabase
        .from('access_passwords')
        .select('*')
        .limit(1);
      
      if (!sampleError && sampleData && sampleData.length > 0) {
        const columns = Object.keys(sampleData[0]);
        hasNotionColumns = columns.includes('notion_api_key') && columns.includes('notion_workspace_name');
        console.log('📋 現在のカラム:', columns);
        
        if (hasNotionColumns) {
          console.log('✅ Notionカラムは既に存在します');
        } else {
          console.log('❌ Notionカラムが見つかりません');
          console.log('⚠️  Supabaseダッシュボードで手動でカラム追加が必要です:');
          console.log('   ALTER TABLE access_passwords ADD COLUMN notion_api_key TEXT;');
          console.log('   ALTER TABLE access_passwords ADD COLUMN notion_workspace_name TEXT;');
        }
      }
    } catch (e) {
      console.log('❌ テーブル構造確認エラー:', e.message);
    }


    // 2. 既存のnotion_integrationsデータを確認
    console.log('🔍 2. 既存のnotion_integrationsデータを確認...');
    try {
      const { data: notionData, error: error4 } = await supabase
        .from('notion_integrations')
        .select('*')
        .limit(5);
      
      if (!error4 && notionData && notionData.length > 0) {
        console.log(`📊 notion_integrationsに${notionData.length}件のデータがあります`);
        console.log('💡 データ移行が必要な場合は、手動で実行してください');
        
        // 移行用のSQLを生成
        notionData.forEach((record, index) => {
          console.log(`-- 移行SQL ${index + 1}:`);
          console.log(`UPDATE access_passwords SET notion_api_key = '${record.api_key}', notion_workspace_name = '${record.workspace_name || 'NULL'}' WHERE user_id = '${record.user_id}';`);
        });
      } else {
        console.log('📭 notion_integrationsテーブルは空です');
      }
    } catch (e) {
      console.log('💡 notion_integrationsテーブルが存在しないか、アクセスできません（問題ありません）');
    }

  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
  }
}

// 実行
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };