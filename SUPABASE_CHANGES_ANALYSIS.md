# Supabase周りの変更分析

## 🔍 確認された変更点

### 1. 認証システムの移行
- **従来**: `access_passwords`テーブルベースのカスタム認証
- **現在**: Supabase Authベースの認証システム

### 2. ユーザー管理の変更
- **管理画面**: `auth.users`のUUIDベースのユーザー管理
- **ユーザー型**: `id: string (UUID)`, `email: string`形式に変更

### 3. API エンドポイントの変更

#### 修正済み
- ✅ `/api/admin/users` - Supabase Auth admin機能使用
- ✅ `/api/auth/signup` - Supabase Auth createUser使用  
- ✅ `/api/user` - Supabase Auth getUserById使用

#### 要確認/修正が必要
- ❓ `/api/auth/route.ts` - 従来のaccess_passwords認証が残存
- ❓ Dashboard page - sessionStorage('currentUserId')使用
- ❓ Canvas components - 従来のユーザーID形式使用

## 🚨 互換性の問題

### 1. 認証システムの重複
```typescript
// 従来方式（/api/auth/route.ts）
const { userId, password } = await request.json();
// access_passwordsテーブルをチェック

// 新方式（/login/page.tsx）  
const { data, error } = await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password
});
```

### 2. ユーザーIDの不整合
- **従来**: `user-xxxxx` 形式のカスタムID
- **新方式**: UUIDベースのauth.users.id

### 3. データ構造の不一致
```typescript
// 従来のUser型
interface User {
  id: number;
  user_id: string;  // access_passwordsとの連携
  plan: 'free' | 'premium';
  canvas_count: number;
  export_count: number;
}

// 新しいUser型  
interface User {
  id: string; // auth.usersのid(UUID)
  email: string;
  created_at?: string;
  last_sign_in_at?: string;
}
```

## 🔧 修正が必要な箇所

### 高優先度
1. **認証システム統一**
   - `/api/auth/route.ts` の更新または削除
   - Dashboard の認証チェック修正

2. **ユーザーデータ管理**
   - プラン情報をprofilesテーブル等で管理
   - キャンバス数・エクスポート数の管理方式確立

3. **セッション管理**
   - sessionStorage('currentUserId') → Supabase Auth session使用

### 中優先度
1. **Canvas機能の更新**
   - ユーザーID形式の統一
   - Supabase Storage権限の調整

2. **Notion設定管理**
   - access_passwordsのnotion_*フィールド → profiles移行

### 低優先度
1. **管理画面の機能拡張**
   - プラン管理機能の実装
   - 使用量トラッキング

## 📋 推奨修正手順

### Phase 1: 認証システム統一
1. 従来の認証エンドポイントを無効化
2. 全ページでSupabase Auth使用
3. セッション管理の統一

### Phase 2: ユーザーデータ構造
1. profilesテーブル作成
2. プラン・使用量データ移行
3. Notion設定移行

### Phase 3: 権限・RLS調整
1. Storage RLSポリシー更新
2. テーブルRLSポリシー更新
3. admin権限調整

## ⚠️ 重要な注意点

1. **データ移行**: 既存のaccess_passwordsデータの移行戦略が必要
2. **下位互換性**: 既存ユーザーのログイン継続性
3. **権限管理**: Service Role使用箇所の整理
4. **テスト**: 認証フロー全体のテスト必須

## 🎯 次のアクション

1. 現在の認証システムの動作確認
2. データ移行計画の策定  
3. 段階的な修正実装
4. 包括的なテスト実行