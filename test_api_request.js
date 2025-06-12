// Test the actual API request with detailed logging

console.log('🧪 Testing API request with Japanese formula...');

// Test payload with Japanese formula
const testPayload = {
  parent: {
    type: 'page_id',
    page_id: 'fake-page-id-12345'
  },
  title: [
    {
      type: 'text',
      text: {
        content: 'テストデータベース'
      }
    }
  ],
  properties: {
    'タイトル': {
      type: 'title',
      title: {}
    },
    '価格': {
      type: 'number',
      number: { format: 'number' }
    },
    '数量': {
      type: 'number', 
      number: { format: 'number' }
    },
    '合計金額': {
      type: 'formula',
      formula: {
        expression: 'prop("価格") * prop("数量")'
      }
    }
  }
};

async function testAPIRequest() {
  console.log('📤 Test payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  
  const jsonString = JSON.stringify(testPayload);
  console.log(`\n📏 JSON string length: ${jsonString.length}`);
  console.log(`📏 JSON byte length: ${Buffer.from(jsonString, 'utf8').length}`);
  
  // Show the exact bytes being sent
  const bytes = Buffer.from(jsonString, 'utf8');
  console.log(`📡 First 100 bytes: [${Array.from(bytes.slice(0, 100)).join(', ')}]`);
  
  // Test formula expression specifically
  const formulaExpression = testPayload.properties['合計金額'].formula.expression;
  console.log(`\n🧮 Formula expression: "${formulaExpression}"`);
  console.log(`🧮 Expression bytes: [${Array.from(Buffer.from(formulaExpression, 'utf8')).join(', ')}]`);
  console.log(`🧮 Expression JSON: ${JSON.stringify(formulaExpression)}`);
  
  // Check if there are any special Unicode characters that might cause issues
  const problematicChars = [];
  for (let i = 0; i < formulaExpression.length; i++) {
    const char = formulaExpression[i];
    const codePoint = char.codePointAt(0);
    if (codePoint > 127) {
      problematicChars.push({
        char,
        codePoint: codePoint.toString(16).toUpperCase(),
        position: i
      });
    }
  }
  
  if (problematicChars.length > 0) {
    console.log(`\n🔍 Non-ASCII characters in formula:`);
    problematicChars.forEach(item => {
      console.log(`  Position ${item.position}: "${item.char}" (U+${item.codePoint})`);
    });
  }
  
  // Test with minimal Notion API simulation
  try {
    console.log('\n📡 Simulating Notion API request...');
    
    // This would be the headers sent to Notion
    const headers = {
      'Authorization': 'Bearer fake-key',
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    };
    
    console.log('📤 Request headers:', headers);
    
    // Simulate what happens when JSON is parsed by the server
    const parsedPayload = JSON.parse(jsonString);
    const reparsedJson = JSON.stringify(parsedPayload);
    
    console.log(`\n🔄 After JSON parse/stringify cycle:`);
    console.log(`Original length: ${jsonString.length}`);
    console.log(`Reparsed length: ${reparsedJson.length}`);
    console.log(`Are identical: ${jsonString === reparsedJson}`);
    
    if (jsonString !== reparsedJson) {
      console.log('❌ JSON changed during parse/stringify!');
      console.log('Original formula:', testPayload.properties['合計金額'].formula.expression);
      console.log('Reparsed formula:', parsedPayload.properties['合計金額'].formula.expression);
    } else {
      console.log('✅ JSON remains identical after parse/stringify');
    }
    
    // Test URL encoding (in case it goes through query params somewhere)
    const urlEncoded = encodeURIComponent(formulaExpression);
    console.log(`\n🔗 URL encoded formula: ${urlEncoded}`);
    console.log(`🔗 URL decoded back: ${decodeURIComponent(urlEncoded)}`);
    
  } catch (error) {
    console.error('❌ Error during simulation:', error);
  }
}

testAPIRequest().catch(console.error);

console.log('\n💡 This test helps identify:');
console.log('1. Whether JSON encoding/decoding affects Japanese characters');
console.log('2. Whether specific Unicode characters might be problematic');
console.log('3. Whether URL encoding is involved anywhere');
console.log('4. The exact byte sequence being transmitted');