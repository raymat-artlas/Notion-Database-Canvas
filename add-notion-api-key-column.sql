-- usersテーブルにNotion関連フィールドを追加

ALTER TABLE public.users 
ADD COLUMN notion_api_key TEXT;

-- コメント追加
COMMENT ON COLUMN public.users.notion_api_key IS 'Notion API キー（暗号化推奨）';

-- インデックス作成（必要に応じて）
CREATE INDEX idx_users_notion_api_key ON public.users(notion_api_key) WHERE notion_api_key IS NOT NULL;
