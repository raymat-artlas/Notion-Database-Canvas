// 管理者パスワードのハッシュを生成するスクリプト
const bcrypt = require('bcryptjs');

// パスワードを設定
const password = 'admin123!'; // 実際の運用では強力なパスワードに変更してください

// ハッシュを生成
const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log('パスワード:', password);
console.log('ハッシュ:', hash);
console.log('\n以下のSQLを実行して管理者を作成してください:');
console.log(`
INSERT INTO public.admin_users (email, password_hash, name, role, is_active) VALUES 
('admin@example.com', '${hash}', '管理者', 'super_admin', true);
`);

// ハッシュの検証テスト
const isValid = bcrypt.compareSync(password, hash);
console.log('\nハッシュ検証:', isValid ? '成功' : '失敗');