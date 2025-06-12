// Supabaseデータ確認スクリプト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSupabaseData() {
  try {
    console.log('🔍 Supabaseのnotion_integrationsテーブルを確認中...');
    
    // 全データを取得
    const { data: allData, error } = await supabase
      .from('notion_integrations')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error('❌ エラー:', error);
      return;
    }
    
    console.log('📊 notion_integrationsテーブル:');
    console.log(`総レコード数: ${allData.length}`);
    
    if (allData.length > 0) {
      console.log('\n最初の数レコード:');
      allData.forEach((record, index) => {
        console.log(`${index + 1}. ユーザーID: ${record.user_id}`);
        console.log(`   APIキー: ${record.api_key?.substring(0, 20)}...`);
        console.log(`   ワークスペース: ${record.workspace_name || 'なし'}`);
        console.log(`   アクティブ: ${record.is_active}`);
        console.log(`   作成日: ${record.created_at}`);
        console.log('');
      });
    } else {
      console.log('📭 テーブルにデータがありません');
    }
    
    // access_passwordsテーブルも確認
    console.log('\n🔑 access_passwordsテーブルも確認...');
    const { data: passwordData, error: passwordError } = await supabase
      .from('access_passwords')
      .select('user_id, label')
      .limit(5);
    
    if (!passwordError && passwordData) {
      console.log('認証済みユーザーID一覧:');
      passwordData.forEach(user => {
        console.log(`- ${user.user_id} (${user.label})`);
      });
    }
    
  } catch (error) {
    console.error('❌ デバッグエラー:', error);
  }
}

// 実行
if (require.main === module) {
  debugSupabaseData();
}

module.exports = { debugSupabaseData };