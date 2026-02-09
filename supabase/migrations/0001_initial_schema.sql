-- =============================================================
-- 0001_initial_schema.sql
-- Initial schema migration: users, problems, search_filters, source_list
-- Migrated from MySQL to PostgreSQL (Supabase) with RLS policies
-- =============================================================

-- -----------------------------------------------------------
-- 1. Utility: updated_at trigger function
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------

-- users (synced from Clerk – not used for authentication)
CREATE TABLE users (
  id               TEXT PRIMARY KEY,              -- Clerk user ID
  school_code      TEXT UNIQUE NOT NULL,
  email            TEXT,
  profile_image    TEXT,                           -- base64-encoded avatar
  problem_generation_limit  INT NOT NULL DEFAULT 10,
  problem_generation_count  INT NOT NULL DEFAULT 0,
  figure_regeneration_limit INT NOT NULL DEFAULT 5,
  figure_regeneration_count INT NOT NULL DEFAULT 0,
  preview_limit    INT NOT NULL DEFAULT 3,
  preview_count    INT NOT NULL DEFAULT 0,
  role             TEXT NOT NULL DEFAULT 'teacher'
                     CHECK (role IN ('teacher', 'admin', 'demo')),
  preferred_api    TEXT NOT NULL DEFAULT 'gemini',
  preferred_model  TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- problems
CREATE TABLE problems (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject              TEXT NOT NULL DEFAULT 'math',
  prompt               TEXT,
  content              TEXT,
  solution             TEXT,
  image_base64         TEXT,                        -- large geometry images
  conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  check_info           JSONB,
  opinion_profile      JSONB,
  opinion_profile_v2   JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_problems_user_id ON problems (user_id);
CREATE INDEX idx_problems_subject ON problems (subject);
CREATE INDEX idx_problems_content_fts ON problems USING GIN (to_tsvector('simple', coalesce(content, '')));
CREATE INDEX idx_problems_check_info ON problems USING GIN (check_info);

CREATE TRIGGER set_problems_updated_at
  BEFORE UPDATE ON problems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- search_filters
CREATE TABLE search_filters (
  id           BIGSERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  keyword      TEXT,
  subject      TEXT,
  units        JSONB NOT NULL DEFAULT '[]'::jsonb,
  year         TEXT,
  exam_session TEXT,
  is_checked   BOOLEAN,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_filters_user_id ON search_filters (user_id);

-- source_list
CREATE TABLE source_list (
  id           BIGSERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year         TEXT NOT NULL,
  exam_session TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, exam_session)
);

CREATE INDEX idx_source_list_user_id ON source_list (user_id);

-- -----------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems       ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_list    ENABLE ROW LEVEL SECURITY;

-- Helper: extract Clerk user ID from the JWT (Supabase auth.jwt())
-- Clerk sets the "sub" claim to the user ID.
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::json ->> 'sub',
    (current_setting('request.jwt.claims', true)::json ->> 'user_id')
  );
$$ LANGUAGE sql STABLE;

-- ----- users -----
CREATE POLICY "Users can view their own row"
  ON users FOR SELECT
  USING (id = requesting_user_id());

CREATE POLICY "Users can update their own row"
  ON users FOR UPDATE
  USING (id = requesting_user_id())
  WITH CHECK (id = requesting_user_id());

-- Insert is handled by backend (Clerk webhook / sync), so we allow
-- service_role inserts but not direct user inserts.
CREATE POLICY "Service role can manage all users"
  ON users FOR ALL
  USING (current_setting('role') = 'service_role');

-- ----- problems -----
CREATE POLICY "Users can view their own problems"
  ON problems FOR SELECT
  USING (user_id = requesting_user_id());

CREATE POLICY "Users can insert their own problems"
  ON problems FOR INSERT
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update their own problems"
  ON problems FOR UPDATE
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own problems"
  ON problems FOR DELETE
  USING (user_id = requesting_user_id());

-- ----- search_filters -----
CREATE POLICY "Users can view their own search filters"
  ON search_filters FOR SELECT
  USING (user_id = requesting_user_id());

CREATE POLICY "Users can insert their own search filters"
  ON search_filters FOR INSERT
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update their own search filters"
  ON search_filters FOR UPDATE
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own search filters"
  ON search_filters FOR DELETE
  USING (user_id = requesting_user_id());

-- ----- source_list -----
CREATE POLICY "Users can view their own source list"
  ON source_list FOR SELECT
  USING (user_id = requesting_user_id());

CREATE POLICY "Users can insert their own source list"
  ON source_list FOR INSERT
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update their own source list"
  ON source_list FOR UPDATE
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own source list"
  ON source_list FOR DELETE
  USING (user_id = requesting_user_id());

-- Service role bypass for all tables (backend operations)
CREATE POLICY "Service role full access to problems"
  ON problems FOR ALL
  USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role full access to search_filters"
  ON search_filters FOR ALL
  USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role full access to source_list"
  ON source_list FOR ALL
  USING (current_setting('role') = 'service_role');
