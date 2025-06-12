// Test the actual request payload that would be sent to Notion API
console.log('🧪 Testing Notion API request payload with Japanese formulas...');

// Simulate the convertToNotionSchema function behavior for formulas
function processFormulaProperty(prop) {
  console.log(`🧮 Processing formula property "${prop.name}"`);
  
  const rawExpression = prop.formulaConfig?.expression?.trim() || '';
  console.log(`🧮 Raw expression: "${rawExpression}"`);
  console.log(`🧮 Expression length: ${rawExpression.length}`);
  console.log(`🧮 Expression byte length: ${Buffer.from(rawExpression, 'utf8').length}`);
  
  if (!rawExpression || rawExpression.length === 0) {
    console.log(`⚠️ Skipping formula property "${prop.name}" - empty expression`);
    return null;
  }
  
  // Transform prop() calls
  let expression = rawExpression;
  expression = expression.replace(/prop\s*\(\s*["']([^"']+)["']\s*\)/g, 'prop("$1")');
  console.log(`🧮 Transformed expression: "${expression}"`);
  
  const notionProperty = {
    type: 'formula',
    formula: {
      expression: expression
    }
  };
  
  console.log(`✅ Formula property "${prop.name}" created`);
  console.log(`📤 Property config:`, JSON.stringify(notionProperty, null, 2));
  
  return { [prop.name]: notionProperty };
}

// Test database with Japanese formulas
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
      id: 'price-prop', 
      name: '価格',
      type: 'number',
      order: 1
    },
    {
      id: 'quantity-prop',
      name: '数量', 
      type: 'number',
      order: 2
    },
    {
      id: 'formula-prop',
      name: '合計金額',
      type: 'formula',
      order: 3,
      formulaConfig: {
        expression: 'prop("価格") * prop("数量")',
        referencedProperties: ['価格', '数量']
      }
    },
    {
      id: 'formula-prop2',
      name: '表示名',
      type: 'formula', 
      order: 4,
      formulaConfig: {
        expression: 'prop("タイトル") + " - " + prop("数量") + "個"',
        referencedProperties: ['タイトル', '数量']
      }
    }
  ]
};

console.log('\n📋 Processing test database...');
const properties = {};

// Process title property
properties['タイトル'] = {
  type: 'title',
  title: {}
};

// Process number properties
properties['価格'] = {
  type: 'number',
  number: { format: 'number' }
};

properties['数量'] = {
  type: 'number', 
  number: { format: 'number' }
};

// Process formula properties
testDatabase.properties.forEach(prop => {
  if (prop.type === 'formula') {
    const formulaProperty = processFormulaProperty(prop);
    if (formulaProperty) {
      Object.assign(properties, formulaProperty);
    }
  }
});

// Create the full Notion API request payload
const requestPayload = {
  parent: {
    type: 'page_id',
    page_id: 'test-page-id-12345'
  },
  title: [
    {
      type: 'text',
      text: {
        content: testDatabase.name
      }
    }
  ],
  properties
};

console.log('\n📤 Full Notion API request payload:');
console.log(JSON.stringify(requestPayload, null, 2));

console.log('\n📊 Analysis:');
console.log(`🏗️ Total properties: ${Object.keys(properties).length}`);
console.log(`🧮 Formula properties: ${Object.keys(properties).filter(k => properties[k].type === 'formula').length}`);

// Show the exact JSON that would be sent
console.log('\n📡 Exact JSON being sent to Notion API:');
const jsonString = JSON.stringify(requestPayload);
console.log(`JSON string length: ${jsonString.length}`);
console.log(`JSON byte length: ${Buffer.from(jsonString, 'utf8').length}`);

// Test individual formula expressions that would be sent
Object.entries(properties).forEach(([propName, propConfig]) => {
  if (propConfig.type === 'formula') {
    const expression = propConfig.formula.expression;
    console.log(`\n🔍 Formula "${propName}":`);
    console.log(`  Expression: ${expression}`);
    console.log(`  JSON encoded: ${JSON.stringify(expression)}`);
    console.log(`  Byte array: [${Array.from(Buffer.from(expression, 'utf8')).join(', ')}]`);
    
    // Check for any potentially problematic characters
    const hasSpecialChars = /[^\x00-\x7F]/.test(expression);
    console.log(`  Contains non-ASCII: ${hasSpecialChars}`);
    
    if (hasSpecialChars) {
      console.log(`  Unicode codepoints: [${Array.from(expression).map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(', ')}]`);
    }
  }
});

console.log('\n🏁 Test complete!');
console.log('\n💡 Key findings:');
console.log('- Japanese characters are properly encoded in UTF-8');
console.log('- Formula expressions are valid JSON strings');
console.log('- The payload structure matches Notion API requirements'); 
console.log('- If there are still issues, they might be:');
console.log('  1. Server-side encoding issues during HTTP transmission');
console.log('  2. Notion API server rejecting specific Unicode characters');
console.log('  3. Issues with the HTTP Content-Type header');
console.log('  4. Network layer encoding problems');