-- access_passwordsテーブルにNotion設定フィールドを追加

-- 1. カラム追加
ALTER TABLE access_passwords 
ADD COLUMN IF NOT EXISTS notion_api_key TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_name TEXT;

-- 2. 既存のnotion_integrationsテーブルからデータを移行（もしデータがあれば）
-- この部分は手動で実行するか、データ確認後に決める

-- 3. インデックス追加（検索高速化）
CREATE INDEX IF NOT EXISTS idx_access_passwords_user_id ON access_passwords(user_id);
CREATE INDEX IF NOT EXISTS idx_access_passwords_active ON access_passwords(is_active);

-- 4. コメント追加
COMMENT ON COLUMN access_passwords.notion_api_key IS 'NotionのAPIキー（暗号化推奨）';
COMMENT ON COLUMN access_passwords.notion_workspace_name IS 'Notionワークスペース名';