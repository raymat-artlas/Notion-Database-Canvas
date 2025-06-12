// Simple test to see how formulas are processed
console.log('🧪 Testing formula expressions with Japanese characters...');

// Test the formula validation function
function validateFormulaExpression(expression) {
  console.log(`🔍 Starting validation for: "${expression}"`);
  
  if (!expression || expression.trim() === '') {
    console.log(`❌ Validation failed: Empty expression`);
    return { isValid: false, error: 'Empty expression' };
  }
  
  const trimmed = expression.trim();
  console.log(`🔍 Trimmed expression: "${trimmed}" (length: ${trimmed.length})`);
  
  // Check byte length
  const byteLength = Buffer.from(trimmed, 'utf8').length;
  console.log(`📏 Byte length: ${byteLength}`);
  console.log(`📏 Character length: ${trimmed.length}`);
  
  // 最小長チェック（より柔軟に）
  if (trimmed.length < 1) {
    console.log(`❌ Validation failed: Expression too short`);
    return { isValid: false, error: 'Expression too short' };
  }
  
  // 基本的な構文チェック（より柔軟に、Notion数式に対応）
  const invalidChars = /[<>{}]/; // より限定的な無効文字
  if (invalidChars.test(trimmed)) {
    console.log(`❌ Validation failed: Contains invalid characters`);
    return { isValid: false, error: 'Contains invalid characters' };
  }
  
  // 括弧のバランスチェック
  let openParens = 0;
  for (const char of trimmed) {
    if (char === '(') openParens++;
    if (char === ')') openParens--;
    if (openParens < 0) {
      console.log(`❌ Validation failed: Unbalanced parentheses (too many closing)`);
      return { isValid: false, error: 'Unbalanced parentheses' };
    }
  }
  if (openParens !== 0) {
    console.log(`❌ Validation failed: Unbalanced parentheses (${openParens} unclosed)`);
    return { isValid: false, error: 'Unbalanced parentheses' };
  }
  
  console.log(`✅ Validation passed for: "${trimmed}"`);
  return { isValid: true };
}

// Test formulas with Japanese characters
const testFormulas = [
  'prop("タイトル")',
  'prop("価格") * prop("数量")',
  'prop("タイトル") + " - テスト"',
  'if(prop("ステータス") == "完了", "✅", "⏳")',
  'format(prop("日付"), "yyyy年MM月dd日")',
  '合計 = prop("単価") * prop("個数")',
  'prop("名前") + "さん"'
];

testFormulas.forEach((formula, i) => {
  console.log(`\n📋 Test ${i + 1}: Testing formula "${formula}"`);
  console.log(`   Encoded as JSON: ${JSON.stringify(formula)}`);
  console.log(`   UTF-8 bytes: [${Array.from(Buffer.from(formula, 'utf8')).join(', ')}]`);
  
  // Transform prop() calls
  let transformedFormula = formula;
  transformedFormula = transformedFormula.replace(/prop\s*\(\s*["']([^"']+)["']\s*\)/g, 'prop("$1")');
  console.log(`   Transformed: "${transformedFormula}"`);
  
  const validation = validateFormulaExpression(transformedFormula);
  console.log(`   Validation: ${validation.isValid ? '✅ Valid' : '❌ Invalid - ' + validation.error}`);
  
  // Test what would be sent to Notion API
  const notionPayload = {
    type: 'formula',
    formula: {
      expression: transformedFormula
    }
  };
  console.log(`   Notion payload: ${JSON.stringify(notionPayload)}`);
});

console.log('\n🏁 Test complete!');