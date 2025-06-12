-- canvas_sharesテーブルの作成
-- キャンバスの共有機能用テーブル

-- 既存のテーブルを削除（開発用）
DROP TABLE IF EXISTS public.canvas_shares CASCADE;

-- canvas_sharesテーブルを作成
CREATE TABLE public.canvas_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id VARCHAR(8) UNIQUE NOT NULL, -- 短い共有ID（例：ABC12345）
  canvas_id VARCHAR(255) NOT NULL, -- 元のキャンバスID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- 共有を作成したユーザー
  share_password VARCHAR(255), -- bcryptでハッシュ化されたパスワード（オプション）
  title VARCHAR(255), -- 共有タイトル
  description TEXT, -- 共有の説明
  is_active BOOLEAN DEFAULT true, -- 共有が有効かどうか
  expires_at TIMESTAMPTZ, -- 有効期限（オプション）
  access_count INTEGER DEFAULT 0, -- アクセス回数
  max_access_count INTEGER, -- 最大アクセス回数（オプション）
  include_memo BOOLEAN DEFAULT false, -- メモを含めるかどうか
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_canvas_shares_share_id ON public.canvas_shares(share_id);
CREATE INDEX idx_canvas_shares_user_id ON public.canvas_shares(user_id);
CREATE INDEX idx_canvas_shares_canvas_id ON public.canvas_shares(canvas_id);

-- RLSを有効化
ALTER TABLE public.canvas_shares ENABLE ROW LEVEL SECURITY;

-- RLSポリシー：ユーザーは自分が作成した共有のみ管理可能
CREATE POLICY "Users can manage their own shares" ON public.canvas_shares
  FOR ALL
  USING (auth.uid() = user_id);

-- RLSポリシー：サービスロールはすべての操作が可能
CREATE POLICY "Service role has full access" ON public.canvas_shares
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RLSポリシー：サービスロールが挿入可能
CREATE POLICY "Service role can insert" ON public.canvas_shares
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- RLSポリシー：誰でも有効な共有を読み取り可能（パスワードチェックはアプリケーション側で行う）
CREATE POLICY "Anyone can read active shares" ON public.canvas_shares
  FOR SELECT
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_access_count IS NULL OR access_count < max_access_count)
  );

-- RLSポリシー：サービスロールはすべて読み取り可能
CREATE POLICY "Service role can read all" ON public.canvas_shares
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_canvas_shares_updated_at
  BEFORE UPDATE ON public.canvas_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- canvas_share_accessesテーブル（アクセス履歴）
CREATE TABLE public.canvas_share_accesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id VARCHAR(8) NOT NULL REFERENCES public.canvas_shares(share_id) ON DELETE CASCADE,
  accessed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_canvas_share_accesses_share_id ON public.canvas_share_accesses(share_id);
CREATE INDEX idx_canvas_share_accesses_user_id ON public.canvas_share_accesses(accessed_by_user_id);

-- RLSを有効化
ALTER TABLE public.canvas_share_accesses ENABLE ROW LEVEL SECURITY;

-- RLSポリシー：共有作成者のみアクセス履歴を見られる
CREATE POLICY "Share owners can view access history" ON public.canvas_share_accesses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.canvas_shares
      WHERE canvas_shares.share_id = canvas_share_accesses.share_id
      AND canvas_shares.user_id = auth.uid()
    )
  );

-- サービスロールは全てのアクセス履歴を挿入可能
CREATE POLICY "Service role can insert access history" ON public.canvas_share_accesses
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR true);

-- サービスロールはすべての履歴を読み取り可能
CREATE POLICY "Service role can read all access history" ON public.canvas_share_accesses
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');