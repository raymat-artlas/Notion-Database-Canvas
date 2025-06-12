// 管理者アカウント作成スクリプト
// 使用方法: node create-admin-user.js

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdminUser() {
  try {
    // メールアドレス入力
    const email = await new Promise((resolve) => {
      rl.question('管理者のメールアドレスを入力してください: ', resolve);
    });

    // パスワード入力
    const password = await new Promise((resolve) => {
      rl.question('パスワードを入力してください: ', resolve);
    });

    // 名前入力
    const name = await new Promise((resolve) => {
      rl.question('管理者名を入力してください: ', resolve);
    });

    // パスワードをハッシュ化
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // SQL文を生成
    const sql = `
INSERT INTO public.admin_users (email, password_hash, name, role) VALUES 
('${email}', '${passwordHash}', '${name}', 'super_admin');
    `;

    console.log('\n=== 以下のSQLをSupabaseで実行してください ===');
    console.log(sql);
    console.log('=== SQLここまで ===\n');

    console.log('管理者アカウント情報:');
    console.log(`メール: ${email}`);
    console.log(`名前: ${name}`);
    console.log(`パスワード: ${password} (この画面でのみ表示)`);
    console.log('\n※パスワードは安全な場所に保存してください');

    rl.close();
  } catch (error) {
    console.error('エラーが発生しました:', error);
    rl.close();
  }
}

console.log('=== Database Canvas 管理者アカウント作成 ===\n');
createAdminUser();