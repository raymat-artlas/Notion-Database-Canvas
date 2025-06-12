const { convertToNotionSchema } = require('./src/lib/notion.ts');

// Test database with Japanese characters in formula
const testDatabase = {
  id: 'test-db',
  name: 'テストデータベース',
  properties: [
    {
      id: 'title-prop',
      name: 'タイトル',
      type: 'title',
      order: 0
    },
    {
      id: 'formula-prop',
      name: '計算式',
      type: 'formula',
      order: 1,
      formulaConfig: {
        expression: 'prop("タイトル") + " - テスト"',
        referencedProperties: ['タイトル']
      }
    },
    {
      id: 'formula-prop2',
      name: '価格計算',
      type: 'formula',
      order: 2,
      formulaConfig: {
        expression: 'prop("価格") * prop("数量")',
        referencedProperties: ['価格', '数量']
      }
    }
  ]
};

console.log('🧪 Testing formula conversion with Japanese characters...');
console.log('📋 Input database:', JSON.stringify(testDatabase, null, 2));

try {
  const result = convertToNotionSchema(testDatabase);
  console.log('\n✅ Conversion successful!');
  console.log('📤 Result properties:', JSON.stringify(result.properties, null, 2));
  
  // Show specific formula properties
  Object.entries(result.properties).forEach(([propName, propConfig]) => {
    if (propConfig.type === 'formula') {
      console.log(`\n🧮 Formula property "${propName}":`);
      console.log(`   Expression: "${propConfig.formula.expression}"`);
      console.log(`   Bytes: ${Buffer.from(propConfig.formula.expression, 'utf8').length}`);
      console.log(`   Encoded: ${JSON.stringify(propConfig.formula.expression)}`);
    }
  });
  
} catch (error) {
  console.error('\n❌ Conversion failed:', error);
  console.error('Stack:', error.stack);
}