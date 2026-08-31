-- ============================================================
-- 名刺ボックス セットアップSQL
-- Supabase SQL Editor で実行してください
-- ============================================================

-- テーブル作成
CREATE TABLE IF NOT EXISTS meishi_cards (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT DEFAULT '',
  kana          TEXT DEFAULT '',
  company       TEXT DEFAULT '',
  dept          TEXT DEFAULT '',
  title         TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  mobile        TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  addr          TEXT DEFAULT '',
  web           TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  importance    INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  front_photo_url TEXT,
  back_photo_url  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meishi_cards_updated_at ON meishi_cards;
CREATE TRIGGER meishi_cards_updated_at
  BEFORE UPDATE ON meishi_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS有効化（ログイン不要で全操作許可）
ALTER TABLE meishi_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meishi_public_all" ON meishi_cards;
CREATE POLICY "meishi_public_all" ON meishi_cards
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- Storage バケット作成（SQL Editorでは実行不要 → Dashboardから作成）
-- バケット名: meishi-photos
-- Public: ON
-- ============================================================
