// データ重複修正: 重複したAPIキーレコードを削除するスクリプト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupDuplicateRecords() {
  try {
    console.log('🧹 重複レコード削除: 各ユーザーにつき最新の1レコードのみ残します...');
    
    // すべてのレコードを取得
    const { data: allRecords, error: fetchError } = await supabase
      .from('notion_integrations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ レコード取得エラー:', fetchError);
      return;
    }
    
    console.log(`📊 総レコード数: ${allRecords.length}`);
    
    // ユーザーごとにグループ化
    const recordsByUser = {};
    allRecords.forEach(record => {
      if (!recordsByUser[record.user_id]) {
        recordsByUser[record.user_id] = [];
      }
      recordsByUser[record.user_id].push(record);
    });
    
    let deletedCount = 0;
    
    // 各ユーザーについて、最新の1つ以外を削除
    for (const [userId, records] of Object.entries(recordsByUser)) {
      if (records.length > 1) {
        // 最新のレコード以外を削除
        const recordsToDelete = records.slice(1); // 最初の1つ(最新)以外
        
        console.log(`👤 ユーザー ${userId}: ${records.length}個のレコードから${recordsToDelete.length}個を削除`);
        
        for (const record of recordsToDelete) {
          const { error } = await supabase
            .from('notion_integrations')
            .delete()
            .eq('id', record.id);
          
          if (error) {
            console.error(`❌ レコード削除エラー (ID: ${record.id}):`, error);
          } else {
            deletedCount++;
          }
        }
      }
    }
    
    console.log(`✅ 重複レコード削除完了: ${deletedCount}個のレコードを削除しました`);
    console.log(`ℹ️  各ユーザーにつき最新の1レコードのみが残っています`);
    
  } catch (error) {
    console.error('❌ クリーンアップエラー:', error);
  }
}

// オプションでテーブル自体を削除する場合
async function dropNotionIntegrationsTable() {
  try {
    console.log('🗑️  notion_integrationsテーブルを削除しています...');
    
    // Supabaseではrpc()を使ってSQL実行
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS notion_integrations;'
    });
    
    if (error) {
      console.error('❌ テーブル削除エラー:', error);
      return;
    }
    
    console.log('✅ notion_integrationsテーブルを削除しました');
    
  } catch (error) {
    console.error('❌ テーブル削除エラー:', error);
  }
}

// 実行
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'drop-table') {
    dropNotionIntegrationsTable();
  } else {
    cleanupDuplicateRecords();
  }
}

module.exports = { cleanupDuplicateRecords, dropNotionIntegrationsTable };