-- Isolated 0-1 journey fixture for PGlite / branch CI.
-- NEVER apply this to supabase-pirin-ai. NEVER live-probe prod from a PR agent.
-- Seed slugs only here: dyeconverter (DyeConverter), corehaul (CoreHaul).
-- One default idea each. Synthetic emails only. Real FAST emails are not in git.

CREATE SCHEMA IF NOT EXISTS bootstrap_os;

DO $$ BEGIN
  CREATE TYPE bootstrap_os.gate_decision AS ENUM ('advance', 'iterate', 'hold', 'kill');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE bootstrap_os.companies (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL
);

CREATE TABLE bootstrap_os.company_acl (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES bootstrap_os.companies (id) ON DELETE CASCADE,
  principal text NOT NULL,
  principal_kind text NOT NULL CHECK (principal_kind IN ('email', 'sub')),
  role text NOT NULL CHECK (role IN ('founder', 'founder_authorized', 'advisor')),
  UNIQUE (company_id, principal, principal_kind)
);

CREATE TABLE bootstrap_os.ideas (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES bootstrap_os.companies (id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  journey_phase smallint NOT NULL CHECK (journey_phase BETWEEN 1 AND 9),
  loop_stage smallint NOT NULL CHECK (loop_stage BETWEEN 1 AND 7),
  current_gate bootstrap_os.gate_decision NOT NULL DEFAULT 'hold',
  scoreboard jsonb NOT NULL DEFAULT '{"schema_version": 1}'::jsonb,
  UNIQUE (company_id, slug),
  CONSTRAINT ideas_scoreboard_object CHECK (jsonb_typeof(scoreboard) = 'object'),
  CONSTRAINT ideas_scoreboard_schema_version CHECK (scoreboard ? 'schema_version')
);

CREATE TABLE bootstrap_os.gate_events (
  id text PRIMARY KEY,
  idea_id text NOT NULL REFERENCES bootstrap_os.ideas (id) ON DELETE CASCADE,
  action bootstrap_os.gate_decision NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  why text NOT NULL,
  who text NOT NULL
);

CREATE TABLE bootstrap_os.comments (
  id text PRIMARY KEY,
  idea_id text NOT NULL REFERENCES bootstrap_os.ideas (id) ON DELETE CASCADE,
  body text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  who text NOT NULL
);

CREATE FUNCTION bootstrap_os.actor_email() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(lower(current_setting('app.actor_email', true)), '');
$$;

CREATE FUNCTION bootstrap_os.actor_sub() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.actor_sub', true), '');
$$;

CREATE FUNCTION bootstrap_os.is_member(p_company_id text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM bootstrap_os.company_acl a
    WHERE a.company_id = p_company_id
      AND (
        (a.principal_kind = 'email' AND a.principal = bootstrap_os.actor_email())
        OR (a.principal_kind = 'sub' AND a.principal = bootstrap_os.actor_sub())
      )
  );
$$;

CREATE FUNCTION bootstrap_os.has_role(p_company_id text, p_roles text[]) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM bootstrap_os.company_acl a
    WHERE a.company_id = p_company_id
      AND a.role = ANY (p_roles)
      AND (
        (a.principal_kind = 'email' AND a.principal = bootstrap_os.actor_email())
        OR (a.principal_kind = 'sub' AND a.principal = bootstrap_os.actor_sub())
      )
  );
$$;

CREATE FUNCTION bootstrap_os.idea_company_id(p_idea_id text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT company_id FROM bootstrap_os.ideas WHERE id = p_idea_id;
$$;

ALTER TABLE bootstrap_os.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.company_acl ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.gate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.companies FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.company_acl FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.ideas FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.gate_events FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.comments FORCE ROW LEVEL SECURITY;

CREATE POLICY companies_select_member ON bootstrap_os.companies
  FOR SELECT USING (bootstrap_os.is_member(id));

CREATE POLICY acl_select_self ON bootstrap_os.company_acl
  FOR SELECT USING (
    (principal_kind = 'email' AND principal = bootstrap_os.actor_email())
    OR (principal_kind = 'sub' AND principal = bootstrap_os.actor_sub())
  );

CREATE POLICY ideas_select_member ON bootstrap_os.ideas
  FOR SELECT USING (bootstrap_os.is_member(company_id));

CREATE POLICY ideas_update_founder ON bootstrap_os.ideas
  FOR UPDATE
  USING (bootstrap_os.has_role(company_id, ARRAY['founder', 'founder_authorized']))
  WITH CHECK (bootstrap_os.has_role(company_id, ARRAY['founder', 'founder_authorized']));

CREATE POLICY gate_events_select_member ON bootstrap_os.gate_events
  FOR SELECT USING (bootstrap_os.is_member(bootstrap_os.idea_company_id(idea_id)));

CREATE POLICY gate_events_insert_founder ON bootstrap_os.gate_events
  FOR INSERT
  WITH CHECK (
    bootstrap_os.has_role(bootstrap_os.idea_company_id(idea_id), ARRAY['founder', 'founder_authorized'])
  );

CREATE POLICY comments_select_member ON bootstrap_os.comments
  FOR SELECT USING (bootstrap_os.is_member(bootstrap_os.idea_company_id(idea_id)));

CREATE POLICY comments_insert_advisor ON bootstrap_os.comments
  FOR INSERT
  WITH CHECK (bootstrap_os.has_role(bootstrap_os.idea_company_id(idea_id), ARRAY['advisor']));

INSERT INTO bootstrap_os.companies (id, slug, label) VALUES
  ('co-dye', 'dyeconverter', 'DyeConverter'),
  ('co-core', 'corehaul', 'CoreHaul');

INSERT INTO bootstrap_os.company_acl (id, company_id, principal, principal_kind, role) VALUES
  ('acl-dye-founder', 'co-dye', 'founder-dye@example.test', 'email', 'founder'),
  ('acl-core-founder', 'co-core', 'founder-core@example.test', 'email', 'founder'),
  ('acl-core-sub', 'co-core', 'sub-only-corehaul', 'sub', 'founder'),
  ('acl-dye-cos', 'co-dye', 'advisor-cos@example.test', 'email', 'advisor'),
  ('acl-core-cos', 'co-core', 'advisor-cos@example.test', 'email', 'advisor'),
  ('acl-dye-auth', 'co-dye', 'authorized-dye@example.test', 'email', 'founder_authorized');

INSERT INTO bootstrap_os.ideas (id, company_id, slug, name, journey_phase, loop_stage, current_gate, scoreboard) VALUES
  ('idea-dye', 'co-dye', 'dyeconverter', 'DyeConverter', 1, 1, 'hold', '{"schema_version": 1, "openQuestions": []}'),
  ('idea-core', 'co-core', 'corehaul', 'CoreHaul', 1, 1, 'hold', '{"schema_version": 1, "openQuestions": []}');

-- Table owner bypasses RLS; queries run as journey_app.
CREATE ROLE journey_app NOLOGIN;
GRANT USAGE ON SCHEMA bootstrap_os TO journey_app;
GRANT SELECT ON bootstrap_os.companies, bootstrap_os.company_acl, bootstrap_os.ideas, bootstrap_os.gate_events, bootstrap_os.comments TO journey_app;
GRANT UPDATE ON bootstrap_os.ideas TO journey_app;
GRANT INSERT ON bootstrap_os.gate_events, bootstrap_os.comments TO journey_app;
GRANT USAGE ON TYPE bootstrap_os.gate_decision TO journey_app;
