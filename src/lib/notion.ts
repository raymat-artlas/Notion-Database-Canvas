import { Client } from '@notionhq/client';
import { Database, Property, PropertyType, SelectOption } from '@/types';

// Notion APIクライアントのインスタンスを作成
export function createNotionClient(apiKey: string) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('Valid Notion API key is required');
  }
  
  // APIキーの形式チェックを緩和（デバッグ用）
  console.log('ℹ️ API key format check:', {
    length: apiKey.length,
    startsWithSecret: apiKey.startsWith('secret_'),
    startsWithNtn: apiKey.startsWith('ntn_'),
    prefix: apiKey.substring(0, 10)
  });
  
  // 一時的にフォーマットチェックを無効化
  // if (!apiKey.startsWith('secret_') && !apiKey.startsWith('ntn_')) {
  //   throw new Error('Invalid Notion API key format. Must start with "secret_" or "ntn_"');
  // }
  
  console.log('✅ Creating Notion client with API key:', apiKey.substring(0, 15) + '...');
  
  try {
    return new Client({
      auth: apiKey,
    });
  } catch (error) {
    console.error('❌ Failed to create Notion client:', error);
    throw new Error(`Failed to create Notion client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Notionのプロパティタイプにマッピング
const propertyTypeMapping: Record<PropertyType, string> = {
  title: 'title',
  text: 'rich_text',
  number: 'number',
  select: 'select',
  'multi-select': 'multi_select',
  status: 'status',
  date: 'date',
  person: 'people',
  people: 'people',
  files: 'files',
  checkbox: 'checkbox',
  url: 'url',
  email: 'email',
  phone: 'phone_number',
  formula: 'formula',
  relation: 'relation',
  rollup: 'rollup',
  created_time: 'created_time',
  created_by: 'created_by',
  last_edited_time: 'last_edited_time',
  last_edited_by: 'last_edited_by',
  button: 'button',
  id: 'unique_id',
  expiry: 'date', // Notionにexpiry typeはないのでdateとして扱う
};

// Notionデータベーススキーマに変換
export function convertToNotionSchema(database: Database) {
  console.log(`\n🔄 Converting schema for database: ${database.name}`);
  console.log(`📋 Database ID: ${database.id}`);
  console.log(`📝 Input properties:`, database.properties.map(p => ({ name: p.name, type: p.type, order: p.order })));
  
  const properties: Record<string, any> = {};
  const statusProperties: Property[] = []; // ステータスプロパティを追跡
  
  // Validate property names
  const propertyNames = new Set<string>();
  database.properties.forEach(prop => {
    // Check for duplicate names
    if (propertyNames.has(prop.name)) {
      throw new Error(`Duplicate property name "${prop.name}" in database "${database.name}"`);
    }
    propertyNames.add(prop.name);
    
    // Check property name length (Notion limit is 100 characters)
    if (prop.name.length > 100) {
      throw new Error(`Property name "${prop.name}" exceeds 100 character limit`);
    }
    
    // Check for empty property names
    if (!prop.name.trim()) {
      throw new Error(`Empty property name found in database "${database.name}"`);
    }
  });

  // プロパティをorder順に並び替えてから処理
  const sortedProperties = [...database.properties].sort((a, b) => a.order - b.order);
  console.log(`📑 Sorted properties:`, sortedProperties.map(p => ({ name: p.name, type: p.type, order: p.order })));

  // 数式プロパティの数をカウント
  const formulaCount = sortedProperties.filter(p => p.type === 'formula').length;
  console.log(`🧮 Found ${formulaCount} formula properties in database "${database.name}"`);

  sortedProperties.forEach((prop, index) => {
    console.log(`\n📌 Processing property ${index + 1}/${sortedProperties.length}: "${prop.name}" (${prop.type})`);  
    
    // 数式プロパティの場合は詳細情報を表示
    if (prop.type === 'formula') {
      console.log(`🧮 Found formula property "${prop.name}" in database "${database.name}"`);
      console.log(`🧮 Formula config:`, prop.formulaConfig);
      console.log(`🧮 Expression: "${prop.formulaConfig?.expression || 'EMPTY'}"`);
    }
    
    const notionType = propertyTypeMapping[prop.type];
    console.log(`Notion type mapping: ${prop.type} -> ${notionType}`);
    
    // NotionのAPIでサポートされるプロパティタイプ
    // Notion APIで直接作成可能なプロパティタイプ
    const supportedTypes = [
      'title', 'text', 'number', 'checkbox', 'url',
      'email', 'phone', 'date', 'select', 'multi-select',
      'person', 'files', 'relation', 'formula',
      'created_time', 'created_by', 'last_edited_time', 'last_edited_by'
    ];
    
    // APIで作成できないプロパティはテキストプロパティに変換（ステータス以外）
    let convertedType = prop.type;
    if (!supportedTypes.includes(prop.type)) {
      if (prop.type === 'status') {
        // ステータスは特別処理（selectとして作成後手動変換）
        convertedType = 'status';
        console.log(`🔄 Converting status property "${prop.name}" to select (will need manual conversion)`);
      } else {
        // その他のサポートされないタイプはテキストに変換
        console.log(`⚠️ Converting unsupported property "${prop.name}" (${prop.type}) to text property`);
        convertedType = 'text';
      }
    } else {
      console.log(`✅ Property "${prop.name}" (${prop.type}) is fully supported`);
    }
    
    console.log(`✅ Processing supported property: ${prop.name} (${prop.type} -> ${notionType})`);
    
    if (!notionType) {
      console.log(`❌ No mapping found for property type: ${prop.type}`);
      return;
    }
    
    // Create completely clean property object for Notion API
    // DO NOT include 'type' field in the property definition
    let notionProperty: any = {};

    // タイプ別の追加設定
    switch (convertedType) {
      case 'title':
        notionProperty = {
          type: 'title',
          title: {}
        };
        break;
        
      case 'text':
        notionProperty = {
          type: 'rich_text',
          rich_text: {}
        };
        break;
        
      case 'number':
        notionProperty = {
          type: 'number',
          number: {
            format: 'number'
          }
        };
        break;
        
      case 'select':
        notionProperty = {
          type: 'select',
          select: {
            options: prop.options && prop.options.length > 0 ? prop.options.map((opt: SelectOption) => ({
              name: opt.name,
              color: convertColorToNotion(opt.color),
            })) : []
          }
        };
        console.log(`📝 Select property "${prop.name}" with ${prop.options?.length || 0} options`);
        break;
        
      case 'multi-select':
        notionProperty = {
          type: 'multi_select',
          multi_select: {
            options: prop.options && prop.options.length > 0 ? prop.options.map((opt: SelectOption) => ({
              name: opt.name,
              color: convertColorToNotion(opt.color),
            })) : []
          }
        };
        console.log(`📝 Multi-select property "${prop.name}" with ${prop.options?.length || 0} options`);
        break;
      
      case 'status':
        // ステータスプロパティはselectプロパティとして作成（手動変更が必要）
        notionProperty = {
          type: 'select',
          select: {
            options: [
              { name: "Not started", color: "gray" },
              { name: "In progress", color: "blue" },
              { name: "Complete", color: "green" }
            ]
          }
        };
        statusProperties.push(prop); // 案内表示のため追跡
        console.log(`📊 Status property "${prop.name}" created as select (manual conversion required)`);
        break;
        
      case 'date':
        notionProperty = {
          type: 'date',
          date: {}
        };
        break;
        
      case 'person':
        notionProperty = {
          type: 'people',
          people: {}
        };
        break;
        
      case 'files':
        notionProperty = {
          type: 'files',
          files: {}
        };
        break;
        
      case 'checkbox':
        notionProperty = {
          type: 'checkbox',
          checkbox: {}
        };
        break;
        
      case 'url':
        notionProperty = {
          type: 'url',
          url: {}
        };
        break;
        
      case 'email':
        console.log(`📧 Creating email property: ${prop.name}`);
        notionProperty = {
          type: 'email',
          email: {}
        };
        break;
        
      case 'phone':
        notionProperty = {
          type: 'phone_number',
          phone_number: {}
        };
        break;
        
      case 'created_time':
        notionProperty = {
          type: 'created_time',
          created_time: {}
        };
        break;
        
      case 'created_by':
        notionProperty = {
          type: 'created_by',
          created_by: {}
        };
        break;
        
      case 'last_edited_time':
        notionProperty = {
          type: 'last_edited_time',
          last_edited_time: {}
        };
        break;
        
      case 'last_edited_by':
        notionProperty = {
          type: 'last_edited_by',
          last_edited_by: {}
        };
        break;
        
      case 'id':
        // unique_idはNotion APIで作成できない場合があるのでテキストに変換
        console.log(`⚠️ Converting ID property "${prop.name}" to text property (unique_id not always supported)`);
        notionProperty = {
          type: 'rich_text',
          rich_text: {}
        };
        break;
        
      case 'relation':
        // リレーションプロパティはPhase 2で処理（ここではスキップ）
        console.log(`🔗 Relation property "${prop.name}" will be added in Phase 2`);
        return; // propertiesオブジェクトに追加しない
        
      case 'formula':
        // 数式プロパティ - UIで設定された数式を使用
        const rawExpression = prop.formulaConfig?.expression?.trim() || '';
        
        console.log(`🧮 Raw formula config:`, JSON.stringify(prop.formulaConfig, null, 2));
        console.log(`🧮 Processing formula "${prop.name}" with expression: "${rawExpression}"`);
        console.log(`🧮 Expression length: ${rawExpression.length}`);
        
        // 空の数式の場合はテキストプロパティに変換
        if (!rawExpression || rawExpression.length === 0) {
          console.log(`⚠️ Converting empty formula property "${prop.name}" to text property`);
          notionProperty = {
            type: 'rich_text',
            rich_text: {}
          };
          break;
        }
        
        // Check if formula references existing properties in this database
        const referencedProps = extractReferencedProperties(rawExpression);
        console.log(`🧮 Referenced properties:`, referencedProps);
        
        // Validate that all referenced properties exist in the database
        const invalidRefs = referencedProps.filter(refProp => 
          !database.properties.some(p => p.name === refProp)
        );
        
        if (invalidRefs.length > 0) {
          console.log(`⚠️ Converting formula property "${prop.name}" to text (references non-existent properties: ${invalidRefs.join(', ')})`);
          notionProperty = {
            type: 'rich_text',
            rich_text: {}
          };
          break;
        }
        
        // Simple formula expressions only - avoid complex ones that might fail
        const simpleFormulaPattern = /^[\w\s\(\)\"'\+\-\*\/\.぀-ゟ゠-ヿ一-龯]*$/;
        if (!simpleFormulaPattern.test(rawExpression)) {
          console.log(`⚠️ Converting complex formula property "${prop.name}" to text (contains potentially unsupported characters)`);
          notionProperty = {
            type: 'rich_text',
            rich_text: {}
          };
          break;
        }
        
        // Transform prop("propertyName") to Notion's expected format
        // Keep prop() format as it's the standard for Notion API
        let expression = rawExpression;
        
        // Ensure prop() calls use double quotes for consistency
        expression = expression.replace(/prop\s*\(\s*["']([^"']+)["']\s*\)/g, 'prop("$1")');
        
        console.log(`🧮 Final expression for API: "${expression}"`);
        console.log(`🧮 Expression byte length: ${Buffer.from(expression, 'utf8').length}`);
        
        // Basic validation only
        if (expression.trim() === '' || expression.length > 500) {
          console.log(`⚠️ Converting formula property "${prop.name}" to text (invalid length)`);
          notionProperty = {
            type: 'rich_text',
            rich_text: {}
          };
          break;
        }
        
        notionProperty = {
          type: 'formula',
          formula: {
            expression: expression
          }
        };
        console.log(`✅ Formula property "${prop.name}" prepared for export with expression: ${expression}`);
        break;
        
      case 'rollup':
        // ロールアップは複雑でエラーが起きやすいのでテキストに変換
        console.log(`⚠️ Converting rollup property "${prop.name}" to text property (rollup is complex and error-prone)`);
        notionProperty = {
          type: 'rich_text',
          rich_text: {}
        };
        break;
        
      default:
        // 未対応のタイプはテキストプロパティとして作成
        console.log(`⚠️ Creating "${prop.name}" (original type: ${prop.type}) as text property due to lack of mapping`);
        notionProperty = {
          type: 'rich_text',
          rich_text: {}
        };
        break;
    }

    // Only add valid properties to final object
    if (notionProperty && notionProperty.type && Object.keys(notionProperty).length > 1) {
      properties[prop.name] = notionProperty;
      console.log(`✅ Added property: ${prop.name} (${notionProperty.type})`);
    } else {
      console.log(`⚠️ Skipped invalid property: ${prop.name}`);
    }
  });

  console.log(`Final converted properties for ${database.name}:`, Object.keys(properties));
  console.log(`Full properties object:`, JSON.stringify(properties, null, 2));
  
  // ステータスプロパティの数を報告
  if (statusProperties.length > 0) {
    console.log(`📊 Found ${statusProperties.length} status properties to add later:`, statusProperties.map(p => p.name));
  }
  
  return { properties, statusProperties };
}

// selectプロパティをstatusプロパティに変更
async function addStatusProperties(client: Client, databaseId: string, statusProperties: Property[]) {
  try {
    for (const prop of statusProperties) {
      console.log(`🔄 Converting select property "${prop.name}" to status property`);
      
      const updatePayload = {
        database_id: databaseId,
        properties: {
          [prop.name]: {
            type: 'status',
            status: {} // selectからstatusに変更
          }
        }
      };
      
      console.log(`📤 Update payload:`, JSON.stringify(updatePayload, null, 2));
      
      const response = await client.databases.update(updatePayload);
      
      console.log(`✅ Property "${prop.name}" converted to status successfully`);
      console.log(`📋 Updated property:`, response.properties[prop.name]);
    }
  } catch (error) {
    console.error('Failed to convert properties to status:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // エラーでも続行（selectプロパティとして機能する）
    console.log('⚠️ Continuing with select properties instead of status');
  }
}

// リレーションプロパティを追加
async function addRelationProperties(
  client: Client, 
  databases: Database[], 
  results: Record<string, { id: string; url: string }>
) {
  const relationErrors: string[] = [];
  
  try {
    console.log('🔗 Processing relation properties...');
    
    for (const database of databases) {
      // 現在のデータベースが正常に作成されているか確認
      if (!results[database.id]) {
        console.log(`⚠️ Database "${database.name}" was not created successfully, skipping its relations`);
        continue;
      }
      
      // Only process relation properties that are marked as parent (user-created)
      // This prevents automatic dual relations from being processed twice
      const relationProperties = database.properties.filter(p => 
        p.type === 'relation' && 
        p.relationConfig?.targetDatabaseId &&
        p.relationConfig?.isParent === true // Only process parent relations
      );
      
      if (relationProperties.length === 0) continue;
      
      console.log(`📊 Database "${database.name}" has ${relationProperties.length} relation properties`);
      
      for (const prop of relationProperties) {
        try {
          const targetDatabaseId = prop.relationConfig?.targetDatabaseId;
          if (!targetDatabaseId || !results[targetDatabaseId]) {
            console.log(`⚠️ Target database not found for relation "${prop.name}"`);
            relationErrors.push(`Relation "${prop.name}" in "${database.name}": target database not found`);
            continue;
          }
          
          const targetNotionId = results[targetDatabaseId].id;
          const currentNotionId = results[database.id].id;
          
          console.log(`🔗 Adding relation "${prop.name}" from ${database.name} to target database`);
          
          // リレーションプロパティを追加
          const currentDatabase = databases.find(db => db.id === database.id);
          const targetDatabase = databases.find(db => db.id === targetDatabaseId);
          
          // Check if target database exists in our canvas
          if (!targetDatabase) {
            console.log(`⚠️ Target database "${targetDatabaseId}" not found in canvas, skipping relation "${prop.name}"`);
            relationErrors.push(`Relation "${prop.name}" in "${database.name}": target database not in canvas`);
            continue;
          }
          
          // Use a simple name for the related property
          const relatedPropertyName = targetDatabase.name || `Related ${prop.name}`;

          await client.databases.update({
            database_id: currentNotionId,
            properties: {
              [prop.name]: {
                type: 'relation',
                relation: {
                  database_id: targetNotionId,
                  type: 'dual_property',
                  dual_property: {
                    synced_property_name: relatedPropertyName
                  }
                }
              }
            }
          });
          
          console.log(`✅ Relation "${prop.name}" added successfully`);
        } catch (relError) {
          const errorMsg = `Failed to add relation "${prop.name}" in "${database.name}": ${relError instanceof Error ? relError.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          relationErrors.push(errorMsg);
        }
      }
    }
  } catch (error) {
    console.error('Failed to add relation properties:', error);
    // エラーを投げずに続行
  }
  
  return relationErrors;
}

// Extract property names referenced in formula
function extractReferencedProperties(expression: string): string[] {
  const regex = /prop\s*\(\s*["']([^"']+)["']\s*\)/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(expression)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)]; // Remove duplicates
}

// Analyze properties for Notion API compatibility
function analyzePropertyCompatibility(databases: Database[]) {
  const fullySupported = ['title', 'text', 'number', 'checkbox', 'url', 'email', 'phone', 'date', 'select', 'multi-select', 'person', 'files', 'relation', 'formula', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by'];
  const partiallySupported = ['status']; // Will be created as select
  const unsupported = ['button', 'id', 'expiry', 'rollup']; // Will be converted to text
  
  const analysis = {
    totalProperties: 0,
    supported: [],
    partiallySupported: [],
    unsupported: [],
    conversions: []
  };
  
  databases.forEach(db => {
    db.properties.forEach(prop => {
      analysis.totalProperties++;
      
      if (fullySupported.includes(prop.type)) {
        analysis.supported.push({
          database: db.name,
          property: prop.name,
          type: prop.type
        });
      } else if (partiallySupported.includes(prop.type)) {
        analysis.partiallySupported.push({
          database: db.name,
          property: prop.name,
          type: prop.type,
          convertedTo: 'select',
          note: '手動でステータスプロパティに変換が必要'
        });
        analysis.conversions.push(`${db.name}.${prop.name}: ${prop.type} → select`);
      } else if (unsupported.includes(prop.type)) {
        analysis.unsupported.push({
          database: db.name,
          property: prop.name,
          type: prop.type,
          convertedTo: 'text',
          note: 'テキストプロパティとして作成'
        });
        analysis.conversions.push(`${db.name}.${prop.name}: ${prop.type} → text`);
      }
      
      // Formula specific analysis
      if (prop.type === 'formula') {
        const expression = prop.formulaConfig?.expression?.trim();
        if (!expression) {
          analysis.conversions.push(`${db.name}.${prop.name}: 空の数式 → text`);
        } else {
          const referencedProps = extractReferencedProperties(expression);
          const invalidRefs = referencedProps.filter(refProp => 
            !db.properties.some(p => p.name === refProp)
          );
          if (invalidRefs.length > 0) {
            analysis.conversions.push(`${db.name}.${prop.name}: 無効な参照プロパティ → text`);
          }
        }
      }
    });
  });
  
  return analysis;
}

// Generate user-friendly message about property conversions
function generateConversionMessage(analysis: any): string {
  if (analysis.conversions.length === 0) {
    return '✅ すべてのプロパティがNotion APIでサポートされています。';
  }
  
  let message = `⚠️ **プロパティ変換のお知らせ**\n\n`;
  message += `以下のプロパティはNotion APIの制限により変換されます：\n\n`;
  
  if (analysis.partiallySupported.length > 0) {
    message += `**🔄 ステータスプロパティ (手動変換が必要)**\n`;
    analysis.partiallySupported.forEach(item => {
      message += `• ${item.database}.${item.property}: セレクトプロパティとして作成されます\n`;
    });
    message += `\n`;
  }
  
  if (analysis.unsupported.length > 0) {
    message += `**📝 テキストプロパティに変換**\n`;
    analysis.unsupported.forEach(item => {
      message += `• ${item.database}.${item.property} (${item.type}): テキストプロパティとして作成されます\n`;
    });
    message += `\n`;
  }
  
  // Special cases for formulas
  const formulaConversions = analysis.conversions.filter(conv => conv.includes('数式') || conv.includes('formula'));
  if (formulaConversions.length > 0) {
    message += `**🧮 数式プロパティの問題**\n`;
    formulaConversions.forEach(conv => {
      message += `• ${conv}\n`;
    });
    message += `\n`;
  }
  
  message += `**📊 統計:**\n`;
  message += `• 全プロパティ数: ${analysis.totalProperties}\n`;
  message += `• サポート済み: ${analysis.supported.length}\n`;
  message += `• 部分サポート: ${analysis.partiallySupported.length}\n`;
  message += `• 変換必要: ${analysis.unsupported.length}\n\n`;
  
  message += `ℹ️ **エクスポート後の作業:**\n`;
  if (analysis.partiallySupported.length > 0) {
    message += `• ステータスプロパティは手動で「セレクト」から「ステータス」に変更してください\n`;
  }
  if (analysis.unsupported.length > 0) {
    message += `• 必要に応じてテキストプロパティを適切なタイプに変更してください\n`;
  }
  
  return message;
}

// 色をNotionの色形式に変換
function convertColorToNotion(color: string): string {
  const colorMapping: Record<string, string> = {
    '#666460': 'gray',
    '#afaba3': 'gray',
    '#a87964': 'brown',
    '#d09b46': 'orange',
    '#de8031': 'orange',
    '#598e71': 'green',
    '#4a8bb2': 'blue',
    '#9b74b7': 'purple',
    '#c75f96': 'pink',
    '#d95f59': 'red',
  };
  
  return colorMapping[color] || 'gray';
}

// Notionにデータベースを作成
export async function createNotionDatabase(
  client: Client,
  pageId: string,
  database: Database
) {
  try {
    console.log(`\n🚀 Starting creation of Notion database: "${database.name}"`);
    
    // Input validation
    if (!client) {
      throw new Error('Notion client is required');
    }
    
    if (!pageId || typeof pageId !== 'string') {
      throw new Error('Valid page ID is required');
    }
    
    if (!database || !database.name || !database.properties) {
      throw new Error('Valid database object with name and properties is required');
    }
    
    console.log(`✅ Input validation passed for database: ${database.name}`);
    console.log(`📋 Database ID: ${database.id}`);
    console.log(`📝 Input database properties:`, database.properties.map(p => ({ name: p.name, type: p.type })));
    
    // Test Notion API access
    try {
      await client.pages.retrieve({ page_id: pageId });
      console.log('✅ Notion API access confirmed');
    } catch (testError) {
      console.error('❌ API test failed:', (testError as any)?.message || testError);
      throw new Error(`Cannot access page ${pageId}. Check API key and page permissions.`);
    }
    
    // 数式プロパティの詳細分析
    const formulaProperties = database.properties.filter(p => p.type === 'formula');
    if (formulaProperties.length > 0) {
      console.log(`\n🧮 FORMULA ANALYSIS for database "${database.name}":`);
      formulaProperties.forEach((prop, i) => {
        console.log(`  ${i+1}. "${prop.name}": expression = "${prop.formulaConfig?.expression || 'EMPTY'}"`);
      });
    }
    
    console.log(`\n📡 Converting to Notion schema...`);
    const { properties, statusProperties } = convertToNotionSchema(database);
    console.log(`📊 Properties to send to Notion:`, Object.keys(properties));
    
    if (Object.keys(properties).length === 0) {
      console.log(`⚠️ WARNING: No properties converted for database ${database.name}`);
      console.log(`📋 Original properties:`, database.properties.map(p => ({ name: p.name, type: p.type })));
      console.log(`❌ This will likely cause the database creation to fail!`);
      
      // Notionデータベースには最低1つのプロパティが必要なので、デフォルトのタイトルプロパティを追加
      console.log(`🔧 Adding default title property to prevent creation failure`);
      properties['Name'] = {
        type: 'title',
        title: {}
      };
    }
    
    // Validate pageId
    if (!pageId || typeof pageId !== 'string' || pageId.trim() === '') {
      throw new Error(`Invalid pageId provided: ${pageId}`);
    }
    
    console.log(`🔍 Creating database "${database.name}" in page: ${pageId}`);
    
    const requestPayload = {
      parent: {
        type: 'page_id' as const,
        page_id: pageId,
      },
      title: [
        {
          type: 'text' as const,
          text: {
            content: database.name,
          },
        },
      ],
      properties,
    };
    
    console.log(`🚀 Creating database with ${Object.keys(requestPayload.properties).length} properties...`);
    
    try {
      const response = await client.databases.create(requestPayload);
      console.log(`✅ Database "${database.name}" created successfully`);
      return {
        success: true,
        databaseId: response.id,
        url: (response as any).url
      };
    } catch (notionError) {
      console.error(`❌ Failed to create "${database.name}":`, (notionError as any)?.message || notionError);
      
      if (notionError && typeof notionError === 'object') {
        const error = notionError as any;
        if (error.body) {
          console.error('Notion API Error Details:', JSON.stringify(error.body, null, 2));
          
          // 特定のエラーパターンをチェックして代替案を提示
          if (error.body.message && error.body.message.includes('email')) {
            console.log(`🔄 Email property error detected, attempting to convert to text property`);
            
            // メールプロパティをテキストに変換して再試行
            const modifiedProperties = { ...requestPayload.properties };
            Object.keys(modifiedProperties).forEach(propName => {
              if (modifiedProperties[propName].type === 'email') {
                console.log(`🔄 Converting email property "${propName}" to text property`);
                modifiedProperties[propName] = {
                  type: 'rich_text',
                  rich_text: {}
                };
              }
            });
            
            // 再試行
            try {
              const retryPayload = { ...requestPayload, properties: modifiedProperties };
              const retryResponse = await client.databases.create(retryPayload);
              console.log(`✅ Database "${database.name}" created successfully with email->text conversion`);
              return {
                success: true,
                databaseId: retryResponse.id,
                url: (retryResponse as any).url
              };
            } catch (retryError) {
              console.error(`❌ Retry also failed for "${database.name}":`, retryError);
            }
          }
        }
      }
      
      throw notionError;
    }
  } catch (error) {
    console.error(`\n💥 CRITICAL ERROR: Failed to create Notion database: "${database.name}"`);
    console.error(`💥 Database ID: ${database.id}`);
    console.error('💥 Error object type:', typeof error);
    console.error('💥 Error object:', error);
    console.error('💥 Error details (stringified):', JSON.stringify(error, null, 2));
    
    // エラーの詳細を取得
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('💥 Error message:', errorMessage);
      console.error('💥 Error stack:', error.stack);
      
      // 特定のエラーパターンをチェック
      if (errorMessage.includes('Parse error with formula')) {
        console.error('💥 This is a formula parsing error!');
        const formulaProps = database.properties.filter(p => p.type === 'formula');
        console.error('💥 Formula properties in this database:', formulaProps.map(p => ({
          name: p.name,
          expression: p.formulaConfig?.expression || 'EMPTY',
          referencedProps: extractReferencedProperties(p.formulaConfig?.expression || '')
        })));
        
        // Check if referenced properties exist
        formulaProps.forEach(fp => {
          const refs = extractReferencedProperties(fp.formulaConfig?.expression || '');
          const missingRefs = refs.filter(ref => !database.properties.some(p => p.name === ref));
          if (missingRefs.length > 0) {
            console.error(`💥 Formula "${fp.name}" references missing properties:`, missingRefs);
          }
        });
      }
    }
    
    // Notion APIエラーの場合、より詳細な情報を抽出
    if (error && typeof error === 'object' && 'body' in error) {
      const notionError = error as any;
      console.error('💥 Notion API error body:', JSON.stringify(notionError.body, null, 2));
      if (notionError.body && notionError.body.message) {
        errorMessage = notionError.body.message;
        console.error('💥 Notion API error message:', errorMessage);
      }
      if (notionError.body && notionError.body.details) {
        console.error('💥 Notion API error details:', JSON.stringify(notionError.body.details, null, 2));
      }
      if (notionError.body && notionError.body.object === 'error') {
        console.error('💥 Notion API error code:', notionError.body.code);
        console.error('💥 Notion API error status:', notionError.status);
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// シンプルなワークスペース作成（トグルなし）
export async function createNotionWorkspace(
  client: Client,
  parentPageId: string,
  workspaceName: string,
  databases: Database[]
) {
  try {
    console.log(`Creating workspace section: ${workspaceName}`);
    
    // 1. ワークスペース名をヘッダーとして追加
    await client.blocks.children.append({
      block_id: parentPageId,
      children: [
        {
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: workspaceName,
                },
                annotations: {
                  bold: true,
                  color: 'default'
                }
              }
            ]
          }
        }
      ]
    });
    
    
    // 3. データベースを直接作成
    const results: Record<string, { id: string; url: string }> = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalStatusProperties = 0;
    const statusPropertyInfo: Array<{ db: string; properties: string[] }> = [];
    
    // プロパティ互換性を分析
    const compatibilityAnalysis = analyzePropertyCompatibility(databases);
    const conversionMessage = generateConversionMessage(compatibilityAnalysis);
    
    console.log('\n📊 Property Compatibility Analysis:');
    console.log(`✅ Fully Supported: ${compatibilityAnalysis.supported.length} properties`);
    console.log(`🔄 Partially Supported: ${compatibilityAnalysis.partiallySupported.length} properties`);
    console.log(`📝 Will Convert to Text: ${compatibilityAnalysis.unsupported.length} properties`);
    
    if (compatibilityAnalysis.conversions.length > 0) {
      console.log(`\n⚠️ Property conversions:`);
      compatibilityAnalysis.conversions.forEach(conversion => {
        console.log(`  - ${conversion}`);
      });
      
      // Add conversion warnings to the warnings array
      compatibilityAnalysis.conversions.forEach(conversion => {
        warnings.push(`Property conversion: ${conversion}`);
      });
    }
    
    // Keep old analysis for compatibility
    const analysis = analyzePropertySupport(databases);

    // Phase 1: リレーション以外のプロパティでデータベースを作成
    console.log('\n🔄 Phase 1: Creating databases...');
    console.log(`📊 Processing ${databases.length} databases`);
    
    for (let i = 0; i < databases.length; i++) {
      const database = databases[i];
      console.log(`\n📋 [${i + 1}/${databases.length}] Processing database: "${database.name}"`);
      
      // リレーションプロパティを除外したデータベース
      const dbWithoutRelations = {
        ...database,
        properties: database.properties.filter(p => p.type !== 'relation')
      };
      
      try {
        // ページに直接データベースを作成
        const result = await createNotionDatabase(client, parentPageId, dbWithoutRelations);
        
        if (result.success && result.databaseId && result.url) {
          results[database.id] = {
            id: result.databaseId,
            url: result.url,
          };
          console.log(`✅ Successfully created database: "${database.name}" (Notion ID: ${result.databaseId})`);
          
          // ステータスプロパティの情報を記録
          if (result.statusPropertiesCount && result.statusPropertiesCount > 0) {
            totalStatusProperties += result.statusPropertiesCount;
            statusPropertyInfo.push({
              db: database.name,
              properties: result.statusPropertyNames || []
            });
          }
        } else {
          const errorMsg = `Failed to create database "${database.name}": ${result.error}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      } catch (error) {
        const errorMsg = `Exception creating database "${database.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`💥 ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`\n📊 Phase 1 Results:`);
    console.log(`✅ Successfully created: ${Object.keys(results).length} databases`);
    console.log(`❌ Failed: ${errors.length} databases`);

    // Phase 2: リレーションプロパティを追加
    console.log('\n🔄 Phase 2: Adding relation properties...');
    
    const relationCount = databases.reduce((count, db) => 
      count + db.properties.filter(p => p.type === 'relation').length, 0
    );
    
    if (relationCount === 0) {
      console.log('No relation properties found. Skipping Phase 2.');
    } else {
      console.log(`Found ${relationCount} relation properties. Adding relations...`);
      const relationErrors = await addRelationProperties(client, databases, results);
      if (relationErrors.length > 0) {
        warnings.push(...relationErrors);
        console.log(`⚠️ Some relations failed to create: ${relationErrors.length} errors`);
      }
    }
    
    return {
      success: errors.length === 0,
      results,
      errors,
      warnings,
      analysis: {
        total: compatibilityAnalysis.totalProperties,
        supported: compatibilityAnalysis.supported.length,
        partiallySupported: compatibilityAnalysis.partiallySupported.length,
        unsupported: compatibilityAnalysis.unsupported.length,
        conversions: compatibilityAnalysis.conversions
      },
      conversionMessage,
      statusProperties: {
        count: totalStatusProperties,
        info: statusPropertyInfo
      }
    };
    
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return {
      success: false,
      results: {},
      errors: [`Failed to create workspace: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      analysis: {
        total: 0,
        supported: 0,
        skipped: 0
      },
      statusProperties: {
        count: 0,
        info: []
      }
    };
  }
}


// サポート状況の分析
export function analyzePropertySupport(databases: Database[]) {
  // サポートプロパティを段階的に拡張
  const supportedTypes = [
    'title', 'text', 'number', 'checkbox', 'url',
    'email', 'phone', // 追加: シンプルなプロパティ
    'date', // 追加: 日付プロパティ
    'select', 'multi-select', // 追加: 選択プロパティ（オプション付き）
    'status', // 追加: ステータスプロパティ（Notionのデフォルト設定を使用）
    'person', 'files', // 追加: 人物・ファイルプロパティ
    'relation', // 追加: リレーションプロパティ
    'formula', // 追加: 数式プロパティ
    'created_time', 'created_by', 'last_edited_time', 'last_edited_by', 'id', // 追加: 自動プロパティ
  ];
  
  const analysis = {
    supported: [] as Array<{ db: string, prop: string, type: string }>,
    unsupported: [] as Array<{ db: string, prop: string, type: string }>,
    skipped: [] as Array<{ db: string, prop: string, type: string, reason: string }>
  };
  
  databases.forEach(db => {
    db.properties.forEach((prop: Property) => {
      if (supportedTypes.includes(prop.type)) {
        analysis.supported.push({ db: db.name, prop: prop.name, type: prop.type });
      } else {
        let reason = 'Not yet implemented';
        if (prop.type === 'rollup') reason = 'Rollups are under development';
        
        analysis.unsupported.push({ db: db.name, prop: prop.name, type: prop.type });
        analysis.skipped.push({ db: db.name, prop: prop.name, type: prop.type, reason });
      }
    });
  });
  
  return analysis;
}

// 複数のデータベースを作成し、リレーションを設定
export async function createNotionDatabases(
  client: Client,
  pageId: string,
  databases: Database[]
) {
  console.log('\n🚀 Starting Notion export process...');
  
  // Input validation
  if (!client) {
    throw new Error('Notion client is required');
  }
  
  if (!pageId || typeof pageId !== 'string') {
    throw new Error('Valid page ID is required');
  }
  
  if (!databases || !Array.isArray(databases) || databases.length === 0) {
    throw new Error('At least one database is required');
  }
  
  console.log(`✅ Batch creation input validation passed`);
  console.log(`📊 Input databases count: ${databases.length}`);
  console.log(`📝 Database names: ${databases.map(db => db.name).join(', ')}`);
  console.log(`📍 Target page ID: ${pageId}`);
  
  const results: Record<string, { id: string; url: string }> = {};
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalStatusProperties = 0;
  const statusPropertyInfo: Array<{ db: string; properties: string[] }> = [];
  
  // プロパティ互換性を分析
  const compatibilityAnalysis = analyzePropertyCompatibility(databases);
  const conversionMessage = generateConversionMessage(compatibilityAnalysis);
  
  console.log('\n📊 Property Compatibility Analysis:');
  console.log(`✅ Fully Supported: ${compatibilityAnalysis.supported.length} properties`);
  console.log(`🔄 Partially Supported: ${compatibilityAnalysis.partiallySupported.length} properties`);
  console.log(`📝 Will Convert to Text: ${compatibilityAnalysis.unsupported.length} properties`);
  
  if (compatibilityAnalysis.conversions.length > 0) {
    console.log(`\n⚠️ Property conversions:`);
    compatibilityAnalysis.conversions.forEach(conversion => {
      console.log(`  - ${conversion}`);
    });
    
    // Add conversion warnings to the warnings array
    compatibilityAnalysis.conversions.forEach(conversion => {
      warnings.push(`Property conversion: ${conversion}`);
    });
  }
  
  // Keep old analysis for compatibility
  const analysis = analyzePropertySupport(databases);

  // Phase 1: リレーション以外のプロパティでデータベースを作成
  console.log('\n🔄 Phase 1: Creating databases without relations...');
  console.log(`📊 Processing ${databases.length} databases`);
  
  for (let i = 0; i < databases.length; i++) {
    const database = databases[i];
    console.log(`\n📋 [${i + 1}/${databases.length}] Processing database: "${database.name}"`);
    console.log(`📍 Database ID: ${database.id}`);
    console.log(`🏷️ Properties count: ${database.properties.length}`);
    console.log(`🏷️ Property types: ${database.properties.map(p => `${p.name}(${p.type})`).join(', ')}`);
    
    // 数式プロパティの事前チェック
    const formulaProps = database.properties.filter(p => p.type === 'formula');
    if (formulaProps.length > 0) {
      console.log(`\n🧮 PRE-CHECK: Database "${database.name}" has ${formulaProps.length} formula properties:`);
      formulaProps.forEach((prop, idx) => {
        console.log(`  ${idx+1}. "${prop.name}": "${prop.formulaConfig?.expression || 'EMPTY'}"`);
      });
    }
    
    // リレーションプロパティを除外したデータベース
    const dbWithoutRelations = {
      ...database,
      properties: database.properties.filter(p => p.type !== 'relation')
    };
    
    console.log(`🔧 Properties after filtering relations: ${dbWithoutRelations.properties.length}`);
    
    try {
      console.log(`\n🚀 CALLING createNotionDatabase for: "${database.name}"`);
      const result = await createNotionDatabase(client, pageId, dbWithoutRelations);
      console.log(`📊 RESULT for "${database.name}":`, { success: result.success, error: result.error });
      
      if (result.success && result.databaseId && result.url) {
        results[database.id] = {
          id: result.databaseId,
          url: result.url,
        };
        console.log(`✅ Successfully created database: "${database.name}" (Notion ID: ${result.databaseId})`);
        
        // ステータスプロパティの情報を記録
        if (result.statusPropertiesCount && result.statusPropertiesCount > 0) {
          totalStatusProperties += result.statusPropertiesCount;
          statusPropertyInfo.push({
            db: database.name,
            properties: result.statusPropertyNames || []
          });
        }
      } else {
        const errorMsg = `Failed to create database "${database.name}": ${result.error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    } catch (error) {
      const errorMsg = `Exception creating database "${database.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`💥 ${errorMsg}`);
      console.error('Stack trace:', error);
      errors.push(errorMsg);
    }
  }
  
  console.log(`\n📊 Phase 1 Results:`);
  console.log(`✅ Successfully created: ${Object.keys(results).length} databases`);
  console.log(`❌ Failed: ${errors.length} databases`);
  if (errors.length > 0) {
    console.log('💥 Errors:', errors);
  }

  // Phase 2: リレーションプロパティを追加
  console.log('Phase 2: Adding relation properties...');
  
  const relationCount = databases.reduce((count, db) => 
    count + db.properties.filter(p => p.type === 'relation').length, 0
  );
  
  if (relationCount === 0) {
    console.log('No relation properties found. Skipping Phase 2.');
  } else {
    console.log(`Found ${relationCount} relation properties. Adding relations...`);
    const relationErrors = await addRelationProperties(client, databases, results);
    if (relationErrors.length > 0) {
      warnings.push(...relationErrors);
      console.log(`⚠️ Some relations failed to create: ${relationErrors.length} errors`);
    }
  }
  
  return {
    success: errors.length === 0,
    results,
    errors,
    warnings,
    analysis: {
      total: compatibilityAnalysis.totalProperties,
      supported: compatibilityAnalysis.supported.length,
      partiallySupported: compatibilityAnalysis.partiallySupported.length,
      unsupported: compatibilityAnalysis.unsupported.length,
      conversions: compatibilityAnalysis.conversions
    },
    conversionMessage,
    statusProperties: {
      count: totalStatusProperties,
      info: statusPropertyInfo
    }
  };
}

// NotionワークスペースにアクセスできるかテストA
export async function testNotionConnection(apiKey: string) {
  try {
    const client = createNotionClient(apiKey);
    const response = await client.users.me({});
    
    return {
      success: true,
      user: {
        name: response.name,
        type: response.type,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 利用可能なページを取得
export async function getNotionPages(apiKey: string) {
  try {
    const client = createNotionClient(apiKey);
    const response = await client.search({
      filter: {
        value: 'page',
        property: 'object',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });

    const pages = response.results
      .filter((page: any) => page.object === 'page' && !page.archived)
      .map((page: any) => ({
        id: page.id,
        title: page.properties?.title?.title?.[0]?.plain_text || 
               page.properties?.Name?.title?.[0]?.plain_text || 
               'Untitled',
        url: page.url,
        lastEdited: page.last_edited_time,
      }));

    return {
      success: true,
      pages,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      pages: [],
    };
  }
}