-- Bootstrap OS FAST 0-1 journey (companies ≠ ideas).
-- DO NOT apply from a PR cloud agent. Do not migrate/seed/live-probe supabase-pirin-ai.
-- Local/CI use mcp/test/pglite/journey-schema.sql. Tests are PGlite only.
-- Login/OAuth stays Hold. No FAST claim on the JWT. Token email (fallback sub) → ACL.

CREATE SCHEMA IF NOT EXISTS bootstrap_os;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE bootstrap_os.gate_decision AS ENUM ('advance', 'iterate', 'hold', 'kill');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS bootstrap_os.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  CONSTRAINT companies_slug_unique UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS bootstrap_os.company_acl (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bootstrap_os.companies (id) ON DELETE CASCADE,
  principal text NOT NULL,
  principal_kind text NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_acl_kind CHECK (principal_kind IN ('email', 'sub')),
  CONSTRAINT company_acl_role CHECK (role IN ('founder', 'founder_authorized', 'advisor')),
  CONSTRAINT company_acl_email_lower CHECK (
    principal_kind <> 'email' OR principal = lower(principal)
  ),
  CONSTRAINT company_acl_unique UNIQUE (company_id, principal, principal_kind)
);

CREATE TABLE IF NOT EXISTS bootstrap_os.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bootstrap_os.companies (id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  journey_phase smallint NOT NULL,
  loop_stage smallint NOT NULL,
  current_gate bootstrap_os.gate_decision NOT NULL DEFAULT 'hold',
  scoreboard jsonb NOT NULL DEFAULT jsonb_build_object('schema_version', 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ideas_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  CONSTRAINT ideas_slug_unique UNIQUE (company_id, slug),
  CONSTRAINT ideas_journey_phase_enum CHECK (journey_phase BETWEEN 1 AND 9),
  CONSTRAINT ideas_loop_stage_enum CHECK (loop_stage BETWEEN 1 AND 7),
  CONSTRAINT ideas_scoreboard_object CHECK (jsonb_typeof(scoreboard) = 'object'),
  CONSTRAINT ideas_scoreboard_schema_version CHECK (
    (scoreboard ? 'schema_version')
    AND jsonb_typeof(scoreboard->'schema_version') = 'number'
  )
);

CREATE TABLE IF NOT EXISTS bootstrap_os.gate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES bootstrap_os.ideas (id) ON DELETE CASCADE,
  action bootstrap_os.gate_decision NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  why text NOT NULL,
  who text NOT NULL
);

CREATE TABLE IF NOT EXISTS bootstrap_os.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES bootstrap_os.ideas (id) ON DELETE CASCADE,
  body text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  who text NOT NULL
);

CREATE INDEX IF NOT EXISTS company_acl_principal_idx
  ON bootstrap_os.company_acl (principal, principal_kind);
CREATE INDEX IF NOT EXISTS ideas_company_idx
  ON bootstrap_os.ideas (company_id);
CREATE INDEX IF NOT EXISTS gate_events_idea_idx
  ON bootstrap_os.gate_events (idea_id, at DESC);
CREATE INDEX IF NOT EXISTS comments_idea_idx
  ON bootstrap_os.comments (idea_id, at DESC);

-- Token email (fallback sub). No FAST claim. Fail closed.
CREATE OR REPLACE FUNCTION bootstrap_os.actor_principal()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(lower(auth.jwt() ->> 'email'), ''),
    NULLIF(auth.jwt() ->> 'sub', '')
  );
$$;

CREATE OR REPLACE FUNCTION bootstrap_os.actor_email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(lower(auth.jwt() ->> 'email'), '');
$$;

CREATE OR REPLACE FUNCTION bootstrap_os.actor_sub()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '');
$$;

CREATE OR REPLACE FUNCTION bootstrap_os.is_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bootstrap_os.company_acl a
    WHERE a.company_id = p_company_id
      AND (
        (a.principal_kind = 'email' AND a.principal = bootstrap_os.actor_email())
        OR (a.principal_kind = 'sub' AND a.principal = bootstrap_os.actor_sub())
      )
  );
$$;

CREATE OR REPLACE FUNCTION bootstrap_os.has_role(p_company_id uuid, VARIADIC p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bootstrap_os.company_acl a
    WHERE a.company_id = p_company_id
      AND a.role = ANY (p_roles)
      AND (
        (a.principal_kind = 'email' AND a.principal = bootstrap_os.actor_email())
        OR (a.principal_kind = 'sub' AND a.principal = bootstrap_os.actor_sub())
      )
  );
$$;

CREATE OR REPLACE FUNCTION bootstrap_os.idea_company_id(p_idea_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
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

REVOKE ALL ON SCHEMA bootstrap_os FROM PUBLIC;
GRANT USAGE ON SCHEMA bootstrap_os TO authenticated;

REVOKE ALL ON TABLE bootstrap_os.companies FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.company_acl FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.ideas FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.gate_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.comments FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE bootstrap_os.companies TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.company_acl TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.ideas TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.gate_events TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.comments TO authenticated;
GRANT UPDATE ON TABLE bootstrap_os.ideas TO authenticated;
GRANT INSERT ON TABLE bootstrap_os.gate_events TO authenticated;
GRANT INSERT ON TABLE bootstrap_os.comments TO authenticated;

DROP POLICY IF EXISTS companies_select_member ON bootstrap_os.companies;
CREATE POLICY companies_select_member
  ON bootstrap_os.companies
  FOR SELECT
  TO authenticated
  USING (bootstrap_os.is_member(id));

DROP POLICY IF EXISTS acl_select_self ON bootstrap_os.company_acl;
CREATE POLICY acl_select_self
  ON bootstrap_os.company_acl
  FOR SELECT
  TO authenticated
  USING (
    (principal_kind = 'email' AND principal = bootstrap_os.actor_email())
    OR (principal_kind = 'sub' AND principal = bootstrap_os.actor_sub())
  );

DROP POLICY IF EXISTS ideas_select_member ON bootstrap_os.ideas;
CREATE POLICY ideas_select_member
  ON bootstrap_os.ideas
  FOR SELECT
  TO authenticated
  USING (bootstrap_os.is_member(company_id));

DROP POLICY IF EXISTS ideas_update_founder ON bootstrap_os.ideas;
CREATE POLICY ideas_update_founder
  ON bootstrap_os.ideas
  FOR UPDATE
  TO authenticated
  USING (bootstrap_os.has_role(company_id, 'founder', 'founder_authorized'))
  WITH CHECK (bootstrap_os.has_role(company_id, 'founder', 'founder_authorized'));

DROP POLICY IF EXISTS gate_events_select_member ON bootstrap_os.gate_events;
CREATE POLICY gate_events_select_member
  ON bootstrap_os.gate_events
  FOR SELECT
  TO authenticated
  USING (bootstrap_os.is_member(bootstrap_os.idea_company_id(idea_id)));

DROP POLICY IF EXISTS gate_events_insert_founder ON bootstrap_os.gate_events;
CREATE POLICY gate_events_insert_founder
  ON bootstrap_os.gate_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bootstrap_os.has_role(bootstrap_os.idea_company_id(idea_id), 'founder', 'founder_authorized')
  );

DROP POLICY IF EXISTS comments_select_member ON bootstrap_os.comments;
CREATE POLICY comments_select_member
  ON bootstrap_os.comments
  FOR SELECT
  TO authenticated
  USING (bootstrap_os.is_member(bootstrap_os.idea_company_id(idea_id)));

DROP POLICY IF EXISTS comments_insert_advisor ON bootstrap_os.comments;
CREATE POLICY comments_insert_advisor
  ON bootstrap_os.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bootstrap_os.has_role(bootstrap_os.idea_company_id(idea_id), 'advisor')
  );

REVOKE ALL ON FUNCTION bootstrap_os.actor_principal() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.actor_email() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.actor_sub() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.is_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.has_role(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.idea_company_id(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION bootstrap_os.actor_principal() TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.actor_email() TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.actor_sub() TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.is_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.has_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.idea_company_id(uuid) TO authenticated;

-- No seed of company slugs or emails in this file. PGlite fixtures only.
-- Comments have no UPDATE/DELETE policy: fail closed. Comments never mutate ideas.
