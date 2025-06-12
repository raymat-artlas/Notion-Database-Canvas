-- waitlistテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  source text DEFAULT 'website',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes text,
  status text DEFAULT 'pending' -- pending, invited, registered
);

-- RLSを有効化
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- 管理者のみがアクセスできるポリシー（現状は挿入のみ許可）
CREATE POLICY "Enable insert for all users" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist(created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);

-- 既存のwaitlistテーブルがある場合の権限設定
GRANT INSERT ON public.waitlist TO anon;
GRANT INSERT ON public.waitlist TO authenticated;