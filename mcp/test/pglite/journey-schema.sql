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
  CONSTRAINT ideas_scoreboard_schema_version CHECK (scoreboard ? 'schema_version'),
  CONSTRAINT ideas_constraint_this_week_short CHECK (
    NOT (scoreboard ? 'constraint_this_week')
    OR (
      jsonb_typeof(scoreboard->'constraint_this_week') = 'string'
      AND char_length(scoreboard->>'constraint_this_week') <= 280
    )
  )
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

CREATE TABLE bootstrap_os.audit_events (
  id text PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  company_id text NOT NULL REFERENCES bootstrap_os.companies (id) ON DELETE CASCADE,
  idea_id text REFERENCES bootstrap_os.ideas (id) ON DELETE CASCADE,
  who text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  client text NOT NULL,
  what_changed jsonb NOT NULL,
  CONSTRAINT audit_events_what_changed_object CHECK (jsonb_typeof(what_changed) = 'object')
);

CREATE TABLE bootstrap_os.board_subscribers (
  id text PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  company_id text NOT NULL REFERENCES bootstrap_os.companies (id) ON DELETE CASCADE,
  idea_id text REFERENCES bootstrap_os.ideas (id) ON DELETE CASCADE,
  principal text NOT NULL,
  principal_kind text NOT NULL CHECK (principal_kind IN ('email', 'sub')),
  webhook_url text NOT NULL,
  email_opt_in boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  CONSTRAINT board_subscribers_webhook_https CHECK (
    webhook_url ~ '^https://' AND char_length(webhook_url) BETWEEN 10 AND 2048
  )
);

CREATE UNIQUE INDEX board_subscribers_unique
  ON bootstrap_os.board_subscribers (
    company_id, principal, principal_kind, webhook_url, COALESCE(idea_id, '')
  );

CREATE TABLE bootstrap_os.notify_outbox (
  id text PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  company_id text NOT NULL REFERENCES bootstrap_os.companies (id) ON DELETE CASCADE,
  idea_id text REFERENCES bootstrap_os.ideas (id) ON DELETE CASCADE,
  subscriber_id text NOT NULL REFERENCES bootstrap_os.board_subscribers (id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('webhook', 'email')),
  event_type text NOT NULL CHECK (event_type IN ('put_journey', 'post_comment', 'gate_event')),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notify_outbox_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE FUNCTION bootstrap_os.actor_email() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(lower(current_setting('app.actor_email', true)), '');
$$;

CREATE FUNCTION bootstrap_os.actor_principal() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(lower(current_setting('app.actor_email', true)), ''),
    NULLIF(current_setting('app.actor_sub', true), '')
  );
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

CREATE FUNCTION bootstrap_os.subscriber_is_acl_member(
  p_company_id text,
  p_principal text,
  p_kind text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bootstrap_os.company_acl a
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

CREATE POLICY audit_events_select_member ON bootstrap_os.audit_events
  FOR SELECT USING (bootstrap_os.is_member(company_id));
-- No INSERT/UPDATE/DELETE policies. Append-only via emit_audit.

CREATE POLICY board_subscribers_select_member ON bootstrap_os.board_subscribers
  FOR SELECT USING (bootstrap_os.is_member(company_id));

CREATE POLICY board_subscribers_insert_founder ON bootstrap_os.board_subscribers
  FOR INSERT
  WITH CHECK (
    bootstrap_os.has_role(company_id, ARRAY['founder', 'founder_authorized'])
    AND bootstrap_os.subscriber_is_acl_member(company_id, principal, principal_kind)
  );

CREATE POLICY board_subscribers_delete_founder ON bootstrap_os.board_subscribers
  FOR DELETE
  USING (bootstrap_os.has_role(company_id, ARRAY['founder', 'founder_authorized']));

CREATE POLICY notify_outbox_select_member ON bootstrap_os.notify_outbox
  FOR SELECT USING (bootstrap_os.is_member(company_id));
-- notify_outbox: no INSERT/UPDATE/DELETE policies. Enqueue via SECURITY DEFINER. No SMTP.

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
GRANT SELECT ON bootstrap_os.companies, bootstrap_os.company_acl, bootstrap_os.ideas, bootstrap_os.gate_events, bootstrap_os.comments, bootstrap_os.audit_events, bootstrap_os.board_subscribers, bootstrap_os.notify_outbox TO journey_app;
GRANT UPDATE ON bootstrap_os.ideas TO journey_app;
GRANT INSERT ON bootstrap_os.gate_events, bootstrap_os.comments, bootstrap_os.board_subscribers TO journey_app;
GRANT DELETE ON bootstrap_os.board_subscribers TO journey_app;
GRANT USAGE ON TYPE bootstrap_os.gate_decision TO journey_app;

CREATE FUNCTION bootstrap_os.emit_audit(
  p_company_id text,
  p_idea_id text,
  p_who text,
  p_client text,
  p_what_changed jsonb
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
DECLARE
  new_id text;
BEGIN
  INSERT INTO bootstrap_os.audit_events (company_id, idea_id, who, client, what_changed)
  VALUES (p_company_id, p_idea_id, p_who, p_client, p_what_changed)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE FUNCTION bootstrap_os.enqueue_board_notify(
  p_company_id text,
  p_idea_id text,
  p_event_type text,
  p_who text,
  p_summary text
) RETURNS void
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
    SELECT s.id, s.email_opt_in
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

CREATE FUNCTION bootstrap_os.audit_idea_write() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
BEGIN
  PERFORM bootstrap_os.emit_audit(
    NEW.company_id,
    NEW.id,
    COALESCE(bootstrap_os.actor_principal(), 'put_journey'),
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
    COALESCE(bootstrap_os.actor_principal(), 'put_journey'),
    'board write'
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION bootstrap_os.audit_comment_write() RETURNS trigger
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

CREATE FUNCTION bootstrap_os.audit_acl_write() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bootstrap_os, public
AS $$
BEGIN
  PERFORM bootstrap_os.emit_audit(
    COALESCE(NEW.company_id, OLD.company_id),
    NULL,
    COALESCE(bootstrap_os.actor_principal(), 'acl'),
    COALESCE(NULLIF(current_setting('app.client', true), ''), 'acl'),
    jsonb_build_object(
      'via', 'acl',
      'op', TG_OP,
      'principal_kind', COALESCE(NEW.principal_kind, OLD.principal_kind),
      'role', COALESCE(NEW.role, OLD.role)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER ideas_audit_write
  AFTER UPDATE ON bootstrap_os.ideas
  FOR EACH ROW
  EXECUTE FUNCTION bootstrap_os.audit_idea_write();

CREATE TRIGGER comments_audit_write
  AFTER INSERT ON bootstrap_os.comments
  FOR EACH ROW
  EXECUTE FUNCTION bootstrap_os.audit_comment_write();

CREATE TRIGGER company_acl_audit_write
  AFTER INSERT OR UPDATE OR DELETE ON bootstrap_os.company_acl
  FOR EACH ROW
  EXECUTE FUNCTION bootstrap_os.audit_acl_write();

CREATE FUNCTION bootstrap_os.notify_gate_write() RETURNS trigger
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

CREATE TRIGGER gate_events_notify_write
  AFTER INSERT ON bootstrap_os.gate_events
  FOR EACH ROW
  EXECUTE FUNCTION bootstrap_os.notify_gate_write();
