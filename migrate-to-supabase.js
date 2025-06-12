const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const supabaseUrl = 'https://hhabjtdapcosifnnsnzp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoYWJqdGRhcGNvc2lmbm5zbnpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTIyMTE0OSwiZXhwIjoyMDY0Nzk3MTQ5fQ.YGCnKDIa8LeglUzG3VvJbDQXqLf65eUinVB40TpWQ2c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateData() {
  try {
    console.log('📦 データ移行を開始します...');

    // 1. キャンバス一覧を読み込み
    const canvasesFile = path.join(__dirname, 'data', 'canvases.json');
    if (!fs.existsSync(canvasesFile)) {
      console.log('❌ canvases.json が見つかりません');
      return;
    }

    const canvases = JSON.parse(fs.readFileSync(canvasesFile, 'utf-8'));
    console.log(`📋 ${canvases.length}個のキャンバスを移行します`);

    for (const canvas of canvases) {
      console.log(`\n🔄 キャンバス "${canvas.name}" を移行中...`);

      // 2. プロジェクトをSupabaseに作成
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          id: canvas.id,
          name: canvas.name,
          description: canvas.description,
          created_at: canvas.createdAt,
          updated_at: canvas.updatedAt,
          is_active: canvas.isActive,
          user_password_id: null // 最初はnull、後でユーザー別に設定
        })
        .select()
        .single();

      if (projectError) {
        console.error(`❌ プロジェクト作成エラー: ${projectError.message}`);
        continue;
      }

      console.log(`✅ プロジェクト作成完了: ${project.id}`);

      // 3. キャンバスデータを読み込み
      const canvasDataFile = path.join(__dirname, 'data', `canvas-${canvas.id}.json`);
      if (!fs.existsSync(canvasDataFile)) {
        console.log(`⚠️  キャンバスデータファイルが見つかりません: ${canvasDataFile}`);
        continue;
      }

      const canvasData = JSON.parse(fs.readFileSync(canvasDataFile, 'utf-8'));

      // 4. データベースを移行
      if (canvasData.databases && canvasData.databases.length > 0) {
        console.log(`📊 ${canvasData.databases.length}個のデータベースを移行中...`);

        for (const db of canvasData.databases) {
          // データベースを作成
          const { data: dbRecord, error: dbError } = await supabase
            .from('databases')
            .insert({
              id: db.id,
              project_id: project.id,
              name: db.name,
              x: db.x,
              y: db.y,
              color: db.color,
              memo: db.memo,
              is_collapsed: db.isCollapsed || false,
              created_at: db.createdAt,
              updated_at: db.updatedAt
            })
            .select()
            .single();

          if (dbError) {
            console.error(`❌ データベース作成エラー: ${dbError.message}`);
            continue;
          }

          // プロパティを移行
          if (db.properties && db.properties.length > 0) {
            console.log(`  📝 ${db.properties.length}個のプロパティを移行中...`);

            for (const prop of db.properties) {
              const { error: propError } = await supabase
                .from('properties')
                .insert({
                  id: prop.id,
                  database_id: db.id,
                  name: prop.name,
                  type: prop.type,
                  required: prop.required,
                  order_index: prop.order,
                  memo: prop.memo,
                  relation_config: prop.relationConfig ? JSON.stringify(prop.relationConfig) : null,
                  rollup_config: prop.rollupConfig ? JSON.stringify(prop.rollupConfig) : null,
                  formula_config: prop.formulaConfig ? JSON.stringify(prop.formulaConfig) : null,
                  selected_values: prop.selectedValues
                });

              if (propError) {
                console.error(`❌ プロパティ作成エラー: ${propError.message}`);
                continue;
              }

              // セレクトオプションを移行
              if (prop.options && prop.options.length > 0) {
                for (let i = 0; i < prop.options.length; i++) {
                  const option = prop.options[i];
                  await supabase
                    .from('select_options')
                    .insert({
                      id: option.id,
                      property_id: prop.id,
                      name: option.name,
                      color: option.color,
                      order_index: i
                    });
                }
              }
            }
          }
        }
      }

      // 5. リレーションを移行
      if (canvasData.relations && canvasData.relations.length > 0) {
        console.log(`🔗 ${canvasData.relations.length}個のリレーションを移行中...`);

        for (const relation of canvasData.relations) {
          const { error: relationError } = await supabase
            .from('relations')
            .insert({
              // 長いIDの場合は新しいUUIDを生成
              id: relation.id.length > 36 ? crypto.randomUUID() : relation.id,
              project_id: project.id,
              from_database_id: relation.fromDatabaseId,
              to_database_id: relation.toDatabaseId,
              type: relation.type,
              label: relation.label,
              from_property_name: relation.fromPropertyName,
              to_property_name: relation.toPropertyName,
              from_property_id: relation.fromPropertyId,
              to_property_id: relation.toPropertyId
            });

          if (relationError) {
            console.error(`❌ リレーション作成エラー: ${relationError.message}`);
          }
        }
      }

      // 6. キャンバス状態を移行
      if (canvasData.canvasState) {
        console.log('🎨 キャンバス状態を移行中...');

        const { error: stateError } = await supabase
          .from('canvas_states')
          .insert({
            project_id: project.id,
            zoom: canvasData.canvasState.zoom,
            pan_x: canvasData.canvasState.panX,
            pan_y: canvasData.canvasState.panY,
            selected_ids: canvasData.canvasState.selectedIds
          });

        if (stateError) {
          console.error(`❌ キャンバス状態作成エラー: ${stateError.message}`);
        }
      }

      console.log(`✅ キャンバス "${canvas.name}" の移行完了`);
    }

    console.log('\n🎉 全データの移行が完了しました！');

  } catch (error) {
    console.error('❌ 移行中にエラーが発生しました:', error);
  }
}

// 実行
migrateData();