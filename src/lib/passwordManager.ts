interface AccessPassword {
  id: string;
  password: string;
  label: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  usageCount: number;
}

class PasswordManager {
  private passwords: AccessPassword[] = [];
  private readonly filePath = '/passwords.json'; // public フォルダ内

  constructor() {
    this.loadFromFile();
  }

  // ファイルからパスワードを読み込み
  async loadFromFile(): Promise<void> {
    try {
      const response = await fetch(this.filePath);
      if (response.ok) {
        const data = await response.json();
        this.passwords = data.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          expiresAt: p.expiresAt ? new Date(p.expiresAt) : undefined
        }));
      }
    } catch (error) {
      console.log('パスワードファイルが見つかりません。新規作成します。');
      this.passwords = [];
    }
  }

  // ファイルにパスワードを保存
  async saveToFile(): Promise<void> {
    const data = JSON.stringify(this.passwords, null, 2);
    
    // ダウンロード用のリンクを作成
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'passwords.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // LocalStorageにもバックアップ
    localStorage.setItem('canvas-admin-passwords', JSON.stringify(this.passwords));
    
    alert('パスワードファイルがダウンロードされました！\nこのファイルを安全な場所に保存してください。');
  }

  // ファイルアップロードでパスワードを復元
  async loadFromUpload(file: File): Promise<void> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      this.passwords = data.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        expiresAt: p.expiresAt ? new Date(p.expiresAt) : undefined
      }));
      
      // LocalStorageにも保存
      localStorage.setItem('canvas-admin-passwords', JSON.stringify(this.passwords));
      
      alert('パスワードファイルが正常に読み込まれました！');
    } catch (error) {
      alert('ファイルの読み込みに失敗しました。正しいJSONファイルを選択してください。');
      throw error;
    }
  }

  // パスワード一覧を取得
  getPasswords(): AccessPassword[] {
    return [...this.passwords];
  }

  // パスワードを追加
  addPassword(password: Omit<AccessPassword, 'id' | 'createdAt' | 'usageCount'>): AccessPassword {
    const newPassword: AccessPassword = {
      ...password,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      usageCount: 0
    };
    
    this.passwords.push(newPassword);
    return newPassword;
  }

  // パスワードを削除
  deletePassword(id: string): boolean {
    const index = this.passwords.findIndex(p => p.id === id);
    if (index > -1) {
      this.passwords.splice(index, 1);
      return true;
    }
    return false;
  }

  // パスワードを更新
  updatePassword(id: string, updates: Partial<AccessPassword>): boolean {
    const index = this.passwords.findIndex(p => p.id === id);
    if (index > -1) {
      this.passwords[index] = { ...this.passwords[index], ...updates };
      return true;
    }
    return false;
  }

  // パスワードを検証
  validatePassword(inputPassword: string): AccessPassword | null {
    return this.passwords.find(p => 
      p.password === inputPassword && 
      p.isActive && 
      (!p.expiresAt || p.expiresAt > new Date())
    ) || null;
  }

  // 使用回数をインクリメント
  incrementUsage(passwordId: string): void {
    const password = this.passwords.find(p => p.id === passwordId);
    if (password) {
      password.usageCount++;
    }
  }
}

export default PasswordManager;
export type { AccessPassword };