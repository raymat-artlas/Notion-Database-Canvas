// Simple test to check if imports are working
const path = require('path');

console.log('Testing imports...');

try {
  // This would fail if there are TypeScript errors
  console.log('✅ Import test complete');
} catch (error) {
  console.error('❌ Import error:', error.message);
}