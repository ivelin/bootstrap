-- Isolated identity fixture for PGlite / branch CI.
-- NEVER apply this to supabase-pirin-ai. NEVER live-probe prod from a PR agent.

CREATE TABLE bootstrap_mcp_mentees (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  auth_user_id text UNIQUE
);

CREATE TABLE bootstrap_company_labels (
  id text PRIMARY KEY,
  mentee_id text NOT NULL REFERENCES bootstrap_mcp_mentees (id) ON DELETE CASCADE,
  label text NOT NULL,
  UNIQUE (mentee_id, label)
);

ALTER TABLE bootstrap_mcp_mentees ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_company_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_mcp_mentees FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_company_labels FORCE ROW LEVEL SECURITY;

CREATE POLICY mentees_select_own ON bootstrap_mcp_mentees
  FOR SELECT
  USING (auth_user_id = current_setting('app.auth_uid', true));

CREATE POLICY labels_select_own ON bootstrap_company_labels
  FOR SELECT
  USING (
    mentee_id IN (
      SELECT id FROM bootstrap_mcp_mentees
      WHERE auth_user_id = current_setting('app.auth_uid', true)
    )
  );

INSERT INTO bootstrap_mcp_mentees (id, email, auth_user_id) VALUES
  ('mentee-a', 'mentee-a@example.test', '11111111-1111-1111-1111-111111111111'),
  ('mentee-b', 'mentee-b@example.test', '22222222-2222-2222-2222-222222222222'),
  ('mentee-ivelin', 'ivelin@pirin.ai', '33333333-3333-3333-3333-333333333333');

INSERT INTO bootstrap_company_labels (id, mentee_id, label) VALUES
  ('la', 'mentee-a', 'alpha'),
  ('lb', 'mentee-b', 'bravo'),
  ('li1', 'mentee-ivelin', 'pirin'),
  ('li2', 'mentee-ivelin', 'zk0'),
  ('li3', 'mentee-ivelin', 'totbox');

-- Table owner bypasses RLS in this engine; queries run as mentee_reader.
CREATE ROLE mentee_reader NOLOGIN;
GRANT SELECT ON bootstrap_mcp_mentees TO mentee_reader;
GRANT SELECT ON bootstrap_company_labels TO mentee_reader;
