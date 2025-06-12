-- アクセスコードの読み取りを匿名ユーザーに許可するRLSポリシーを追加

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Allow anonymous read access codes" ON public.access_codes;

-- 新しいポリシーを作成
CREATE POLICY "Allow anonymous read access codes" 
ON public.access_codes 
FOR SELECT 
TO anon 
USING (is_active = true);

-- 認証済みユーザーの読み取りも許可
CREATE POLICY "Allow authenticated read access codes" 
ON public.access_codes 
FOR SELECT 
TO authenticated 
USING (is_active = true);