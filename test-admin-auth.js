const bcrypt = require('bcryptjs');

async function testAuth() {
  const email = "ray@artlas.jp";
  const password = "Rayraymat010!";
  
  // データベースのハッシュ（更新後）
  const hashFromDB = "$2b$10$FWG99z4xfu5Xny.bNMmdRuyImSPTM9XI0Iw4QQjaoSMcCmCAUkFqe";
  
  console.log('Testing password verification...');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Hash from DB:', hashFromDB);
  
  try {
    const isValid = await bcrypt.compare(password, hashFromDB);
    console.log('Password valid:', isValid);
    
    if (isValid) {
      // JWTも試してみる
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = 'your-super-secret-jwt-key-for-admin-auth-12345';
      
      const token = jwt.sign(
        { adminId: 'test-id', email: email, role: 'super_admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      console.log('JWT token generated:', token);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAuth();