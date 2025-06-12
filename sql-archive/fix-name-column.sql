-- nameカラムをNULL許可に変更、またはdescriptionで置き換え

-- 方法1: nameカラムをNULL許可にする
ALTER TABLE public.access_codes ALTER COLUMN name DROP NOT NULL;

-- 方法2: 既存データのnameカラムにdescriptionの値をコピー
UPDATE public.access_codes 
SET name = COALESCE(name, description, 'No name')
WHERE name IS NULL;

-- 方法3: nameカラムのデフォルト値を設定
ALTER TABLE public.access_codes ALTER COLUMN name SET DEFAULT 'Access Code';