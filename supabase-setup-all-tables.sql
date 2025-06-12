-- 1. waitlistテーブル
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  source text DEFAULT 'website',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes text,
  status text DEFAULT 'pending'
);

-- 2. usersテーブル（認証連携）
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  plan text DEFAULT 'free',
  effective_plan text DEFAULT 'free',
  plan_source text,
  trial_expires_at timestamp with time zone,
  canvas_count integer DEFAULT 0,
  export_count integer DEFAULT 0,
  export_reset_date timestamp with time zone DEFAULT (date_trunc('month', CURRENT_DATE) + interval '1 month')::timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  notion_api_key text
);

-- 3. promo_codesテーブル
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('trial', 'discount', 'lifetime')),
  value integer,
  duration_days integer,
  max_uses integer,
  uses_count integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT timezone('utc'::text, now()),
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. code_usage_historyテーブル
CREATE TABLE IF NOT EXISTS public.code_usage_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id uuid REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  used_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  trial_expires_at timestamp with time zone
);

-- 5. canvas_sharesテーブル
CREATE TABLE IF NOT EXISTS public.canvas_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id text NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  share_id text UNIQUE NOT NULL,
  permissions text DEFAULT 'view',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone,
  access_count integer DEFAULT 0,
  last_accessed_at timestamp with time zone
);

-- RLSポリシーの設定
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_shares ENABLE ROW LEVEL SECURITY;

-- waitlistポリシー
CREATE POLICY "Enable insert for all" ON public.waitlist FOR INSERT WITH CHECK (true);

-- usersポリシー
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- promo_codesポリシー（公開読み取り可能）
CREATE POLICY "Public read active promo codes" ON public.promo_codes
  FOR SELECT USING (is_active = true);

-- code_usage_historyポリシー
CREATE POLICY "Users can view own usage" ON public.code_usage_history
  FOR SELECT USING (user_id = auth.uid());

-- canvas_sharesポリシー
CREATE POLICY "Users can manage own shares" ON public.canvas_shares
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone can view by share_id" ON public.canvas_shares
  FOR SELECT USING (true);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_canvas_shares_share_id ON public.canvas_shares(share_id);

-- ストレージバケットの作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('canvases', 'canvases', false)
ON CONFLICT (id) DO NOTHING;

-- ストレージポリシー
CREATE POLICY "Users can upload own canvases" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'canvases' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own canvases" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'canvases' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own canvases" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'canvases' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );