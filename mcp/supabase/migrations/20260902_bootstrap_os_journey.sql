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
  ),
  -- Fluid field. Not a clock. Not tickets. Short text.
  CONSTRAINT ideas_constraint_this_week_short CHECK (
    NOT (scoreboard ? 'constraint_this_week')
    OR (
      jsonb_typeof(scoreboard->'constraint_this_week') = 'string'
      AND char_length(scoreboard->>'constraint_this_week') <= 280
    )
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

-- Append-only. Company + optional idea (ACL is company-level). No UPDATE/DELETE policies.
CREATE TABLE IF NOT EXISTS bootstrap_os.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bootstrap_os.companies (id) ON DELETE CASCADE,
  idea_id uuid REFERENCES bootstrap_os.ideas (id) ON DELETE CASCADE,
  who text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  client text NOT NULL,
  what_changed jsonb NOT NULL,
  CONSTRAINT audit_events_what_changed_object CHECK (jsonb_typeof(what_changed) = 'object')
);

CREATE INDEX IF NOT EXISTS company_acl_principal_idx
  ON bootstrap_os.company_acl (principal, principal_kind);
CREATE INDEX IF NOT EXISTS ideas_company_idx
  ON bootstrap_os.ideas (company_id);
CREATE INDEX IF NOT EXISTS gate_events_idea_idx
  ON bootstrap_os.gate_events (idea_id, at DESC);
CREATE INDEX IF NOT EXISTS comments_idea_idx
  ON bootstrap_os.comments (idea_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_events_company_idx
  ON bootstrap_os.audit_events (company_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_events_idea_idx
  ON bootstrap_os.audit_events (idea_id, at DESC);

-- Notify hangs off company (optional idea). After ACL. Fail closed.
-- Email is enqueue-only. Mail sender is not this database.
CREATE TABLE IF NOT EXISTS bootstrap_os.board_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bootstrap_os.companies (id) ON DELETE CASCADE,
  idea_id uuid REFERENCES bootstrap_os.ideas (id) ON DELETE CASCADE,
  principal text NOT NULL,
  principal_kind text NOT NULL,
  webhook_url text NOT NULL,
  email_opt_in boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT board_subscribers_kind CHECK (principal_kind IN ('email', 'sub')),
  CONSTRAINT board_subscribers_email_lower CHECK (
    principal_kind <> 'email' OR principal = lower(principal)
  ),
  CONSTRAINT board_subscribers_webhook_https CHECK (
    webhook_url ~ '^https://' AND char_length(webhook_url) BETWEEN 10 AND 2048
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS board_subscribers_unique
  ON bootstrap_os.board_subscribers (
    company_id,
    principal,
    principal_kind,
    webhook_url,
    COALESCE(idea_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE TABLE IF NOT EXISTS bootstrap_os.notify_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bootstrap_os.companies (id) ON DELETE CASCADE,
  idea_id uuid REFERENCES bootstrap_os.ideas (id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES bootstrap_os.board_subscribers (id) ON DELETE CASCADE,
  channel text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notify_outbox_channel CHECK (channel IN ('webhook', 'email')),
  CONSTRAINT notify_outbox_event CHECK (event_type IN ('put_journey', 'post_comment', 'gate_event')),
  CONSTRAINT notify_outbox_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS board_subscribers_company_idx
  ON bootstrap_os.board_subscribers (company_id);
CREATE INDEX IF NOT EXISTS notify_outbox_company_idx
  ON bootstrap_os.notify_outbox (company_id, created_at DESC);

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

CREATE OR REPLACE FUNCTION bootstrap_os.subscriber_is_acl_member(
  p_company_id uuid,
  p_principal text,
  p_kind text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bootstrap_os.company_acl a
    WHERE a.company_id = p_company_id
      AND a.principal = p_principal
      AND a.principal_kind = p_kind
  );
$$;

ALTER TABLE bootstrap_os.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.company_acl ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.gate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.board_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.notify_outbox ENABLE ROW LEVEL SECURITY;

ALTER TABLE bootstrap_os.companies FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.company_acl FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.ideas FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.gate_events FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.comments FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.board_subscribers FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_os.notify_outbox FORCE ROW LEVEL SECURITY;

REVOKE ALL ON SCHEMA bootstrap_os FROM PUBLIC;
GRANT USAGE ON SCHEMA bootstrap_os TO authenticated;

REVOKE ALL ON TABLE bootstrap_os.companies FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.company_acl FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.ideas FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.gate_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.comments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.audit_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.board_subscribers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE bootstrap_os.notify_outbox FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE bootstrap_os.companies TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.company_acl TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.ideas TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.gate_events TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.comments TO authenticated;
GRANT UPDATE ON TABLE bootstrap_os.ideas TO authenticated;
GRANT INSERT ON TABLE bootstrap_os.gate_events TO authenticated;
GRANT INSERT ON TABLE bootstrap_os.comments TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.audit_events TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.board_subscribers TO authenticated;
GRANT INSERT ON TABLE bootstrap_os.board_subscribers TO authenticated;
GRANT DELETE ON TABLE bootstrap_os.board_subscribers TO authenticated;
GRANT SELECT ON TABLE bootstrap_os.notify_outbox TO authenticated;
-- audit_events / notify_outbox: no INSERT grant. Outbox via SECURITY DEFINER enqueue. Mail sender is not this database.

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

DROP POLICY IF EXISTS audit_events_select_member ON bootstrap_os.audit_events;
CREATE POLICY audit_events_select_member
  ON bootstrap_os.audit_events
  FOR SELECT
  TO authenticated
  USING (bootstrap_os.is_member(company_id));

DROP POLICY IF EXISTS board_subscribers_select_member ON bootstrap_os.board_subscribers;
CREATE POLICY board_subscribers_select_member
  ON bootstrap_os.board_subscribers
  FOR SELECT
  TO authenticated
  USING (bootstrap_os.is_member(company_id));

DROP POLICY IF EXISTS board_subscribers_insert_founder ON bootstrap_os.board_subscribers;
CREATE POLICY board_subscribers_insert_founder
  ON bootstrap_os.board_subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bootstrap_os.has_role(company_id, 'founder', 'founder_authorized')
    AND bootstrap_os.subscriber_is_acl_member(company_id, principal, principal_kind)
  );

DROP POLICY IF EXISTS board_subscribers_delete_founder ON bootstrap_os.board_subscribers;
CREATE POLICY board_subscribers_delete_founder
  ON bootstrap_os.board_subscribers
  FOR DELETE
  TO authenticated
  USING (bootstrap_os.has_role(company_id, 'founder', 'founder_authorized'));

DROP POLICY IF EXISTS notify_outbox_select_member ON bootstrap_os.notify_outbox;
CREATE POLICY notify_outbox_select_member
  ON bootstrap_os.notify_outbox
  FOR SELECT
  TO authenticated
  USING (bootstrap_os.is_member(company_id));

-- No INSERT/UPDATE/DELETE policies for authenticated. Append-only via emit_audit.
-- notify_outbox inserts via enqueue_board_notify only. Mail sender is not this database.

REVOKE ALL ON FUNCTION bootstrap_os.actor_principal() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.actor_email() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.actor_sub() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.is_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.has_role(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.idea_company_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION bootstrap_os.subscriber_is_acl_member(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION bootstrap_os.actor_principal() TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.actor_email() TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.actor_sub() TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.is_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.has_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.idea_company_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_os.subscriber_is_acl_member(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION bootstrap_os.emit_audit(
  p_company_id uuid,
  p_idea_id uuid,
  p_who text,
  p_client text,
  p_what_changed jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF p_company_id IS NULL OR p_who IS NULL OR p_client IS NULL OR p_what_changed IS NULL THEN
    RAISE EXCEPTION 'audit_required_fields' USING ERRCODE = '23502';
  END IF;
  INSERT INTO bootstrap_os.audit_events (company_id, idea_id, who, client, what_changed)
  VALUES (p_company_id, p_idea_id, p_who, p_client, p_what_changed)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION bootstrap_os.enqueue_board_notify(
  p_company_id uuid,
  p_idea_id uuid,
  p_event_type text,
  p_who text,
  p_summary text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
DECLARE
  sub RECORD;
  payload jsonb;
  company_slug text;
  company_label text;
  idea_slug text;
  idea_name text;
BEGIN
  IF p_company_id IS NULL OR p_event_type IS NULL OR p_who IS NULL THEN
    RETURN;
  END IF;
  SELECT slug, label INTO company_slug, company_label
  FROM bootstrap_os.companies WHERE id = p_company_id;
  IF p_idea_id IS NOT NULL THEN
    SELECT slug, name INTO idea_slug, idea_name
    FROM bootstrap_os.ideas WHERE id = p_idea_id;
  END IF;
  payload := jsonb_build_object(
    'company', jsonb_build_object('slug', company_slug, 'label', company_label),
    'idea', CASE
      WHEN p_idea_id IS NULL THEN NULL
      ELSE jsonb_build_object('slug', idea_slug, 'name', idea_name)
    END,
    'event', p_event_type,
    'who', p_who,
    'at', now(),
    'summary', left(COALESCE(p_summary, 'board write'), 80)
  );
  FOR sub IN
    SELECT s.id, s.webhook_url, s.email_opt_in
    FROM bootstrap_os.board_subscribers s
    WHERE s.company_id = p_company_id
      AND (s.idea_id IS NULL OR s.idea_id = p_idea_id)
      AND EXISTS (
        SELECT 1 FROM bootstrap_os.company_acl a
        WHERE a.company_id = s.company_id
          AND a.principal = s.principal
          AND a.principal_kind = s.principal_kind
      )
  LOOP
    INSERT INTO bootstrap_os.notify_outbox (company_id, idea_id, subscriber_id, channel, event_type, payload)
    VALUES (p_company_id, p_idea_id, sub.id, 'webhook', p_event_type, payload);
    IF sub.email_opt_in THEN
      INSERT INTO bootstrap_os.notify_outbox (company_id, idea_id, subscriber_id, channel, event_type, payload)
      VALUES (p_company_id, p_idea_id, sub.id, 'email', p_event_type, payload);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION bootstrap_os.audit_idea_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
BEGIN
  PERFORM bootstrap_os.emit_audit(
    NEW.company_id,
    NEW.id,
    COALESCE(bootstrap_os.actor_principal(), NEW.name),
    COALESCE(NULLIF(current_setting('app.client', true), ''), 'put_journey'),
    jsonb_build_object(
      'via', 'put_journey',
      'journey_phase', NEW.journey_phase,
      'loop_stage', NEW.loop_stage,
      'current_gate', NEW.current_gate,
      'constraint_this_week', COALESCE(NEW.scoreboard->>'constraint_this_week', '')
    )
  );
  PERFORM bootstrap_os.enqueue_board_notify(
    NEW.company_id,
    NEW.id,
    'put_journey',
    COALESCE(bootstrap_os.actor_principal(), NEW.name),
    'board write'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION bootstrap_os.audit_comment_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
BEGIN
  PERFORM bootstrap_os.emit_audit(
    bootstrap_os.idea_company_id(NEW.idea_id),
    NEW.idea_id,
    NEW.who,
    COALESCE(NULLIF(current_setting('app.client', true), ''), 'post_comment'),
    jsonb_build_object('via', 'post_comment', 'comment_id', NEW.id)
  );
  PERFORM bootstrap_os.enqueue_board_notify(
    bootstrap_os.idea_company_id(NEW.idea_id),
    NEW.idea_id,
    'post_comment',
    NEW.who,
    left(NEW.body, 80)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION bootstrap_os.audit_acl_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
DECLARE
  cid uuid;
  kind text;
  role text;
BEGIN
  cid := COALESCE(NEW.company_id, OLD.company_id);
  kind := COALESCE(NEW.principal_kind, OLD.principal_kind);
  role := COALESCE(NEW.role, OLD.role);
  PERFORM bootstrap_os.emit_audit(
    cid,
    NULL,
    COALESCE(bootstrap_os.actor_principal(), 'acl'),
    COALESCE(NULLIF(current_setting('app.client', true), ''), 'acl'),
    jsonb_build_object(
      'via', 'acl',
      'op', TG_OP,
      'principal_kind', kind,
      'role', role
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS ideas_audit_write ON bootstrap_os.ideas;
CREATE TRIGGER ideas_audit_write
  AFTER UPDATE ON bootstrap_os.ideas
  FOR EACH ROW
  EXECUTE FUNCTION bootstrap_os.audit_idea_write();

DROP TRIGGER IF EXISTS comments_audit_write ON bootstrap_os.comments;
CREATE TRIGGER comments_audit_write
  AFTER INSERT ON bootstrap_os.comments
  FOR EACH ROW
  EXECUTE FUNCTION bootstrap_os.audit_comment_write();

DROP TRIGGER IF EXISTS company_acl_audit_write ON bootstrap_os.company_acl;
CREATE TRIGGER company_acl_audit_write
  AFTER INSERT OR UPDATE OR DELETE ON bootstrap_os.company_acl
  FOR EACH ROW
  EXECUTE FUNCTION bootstrap_os.audit_acl_write();

CREATE OR REPLACE FUNCTION bootstrap_os.notify_gate_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
BEGIN
  PERFORM bootstrap_os.enqueue_board_notify(
    bootstrap_os.idea_company_id(NEW.idea_id),
    NEW.idea_id,
    'gate_event',
    NEW.who,
    'gate ' || NEW.action::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gate_events_notify_write ON bootstrap_os.gate_events;
CREATE TRIGGER gate_events_notify_write
  AFTER INSERT ON bootstrap_os.gate_events
  FOR EACH ROW
  EXECUTE FUNCTION bootstrap_os.notify_gate_write();

REVOKE ALL ON FUNCTION bootstrap_os.emit_audit(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bootstrap_os.enqueue_board_notify(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bootstrap_os.audit_idea_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bootstrap_os.audit_comment_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bootstrap_os.audit_acl_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bootstrap_os.notify_gate_write() FROM PUBLIC, anon, authenticated;

-- Triggers only. Authenticated cannot call emit_audit (advisors cannot write audit except via tools).
-- No seed of company slugs or emails in this file. PGlite fixtures only.
-- Comments and audit_events have no UPDATE/DELETE policy: fail closed.
