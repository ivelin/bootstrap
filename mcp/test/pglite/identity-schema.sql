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
  ('mentee-ivelin', 'ivelin@pirin.ai', '33333333-3333-3333-3333-333333333333'),
  ('mentee-first', 'first@example.test', NULL);

INSERT INTO bootstrap_company_labels (id, mentee_id, label) VALUES
  ('la', 'mentee-a', 'alpha'),
  ('lb', 'mentee-b', 'bravo'),
  ('li1', 'mentee-ivelin', 'pirin'),
  ('li2', 'mentee-ivelin', 'zk0'),
  ('li3', 'mentee-ivelin', 'totbox'),
  ('lf', 'mentee-first', 'beachhead');

-- Mirrors SQL bootstrap_mcp_my_labels: fail-closed unless a mentee row exists.
-- SECURITY DEFINER so email-only first-user inserts are visible (owner bypass).
CREATE OR REPLACE FUNCTION bootstrap_mcp_my_labels()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := current_setting('app.auth_uid', true);
  user_email text := lower(nullif(current_setting('app.auth_email', true), ''));
  found_id text;
  labels jsonb;
BEGIN
  IF uid IS NULL OR uid = '' THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id INTO found_id
  FROM bootstrap_mcp_mentees
  WHERE auth_user_id = uid OR (user_email IS NOT NULL AND email = user_email);

  IF found_id IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'email', user_email,
      'labels', '[]'::jsonb,
      'reason', 'not_invited'
    );
  END IF;

  UPDATE bootstrap_mcp_mentees
  SET auth_user_id = uid
  WHERE id = found_id
    AND auth_user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM bootstrap_mcp_mentees m2 WHERE m2.auth_user_id = uid
    );

  SELECT coalesce(jsonb_agg(l.label ORDER BY l.label), '[]'::jsonb)
  INTO labels
  FROM bootstrap_company_labels l
  WHERE l.mentee_id = found_id;

  RETURN jsonb_build_object(
    'authenticated', true,
    'email', COALESCE(user_email, (SELECT email FROM bootstrap_mcp_mentees WHERE id = found_id)),
    'labels', labels,
    'note', 'Labels only. Not boards. Not company-state.'
  );
END;
$$;

CREATE TABLE bootstrap_mcp_invites (
  id text PRIMARY KEY,
  invitee_email text NOT NULL,
  company_label text NOT NULL,
  invited_by_mentee_id text NOT NULL REFERENCES bootstrap_mcp_mentees (id) ON DELETE CASCADE,
  invited_by_email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bootstrap_mcp_invite_outbox (
  id text PRIMARY KEY,
  invite_id text NOT NULL REFERENCES bootstrap_mcp_invites (id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel = 'in_chat'),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bootstrap_mcp_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_mcp_invite_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_mcp_invites FORCE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_mcp_invite_outbox FORCE ROW LEVEL SECURITY;

-- No policies: mentee_reader cannot see invite rows or the raw token hash.
-- Table owner (PGliteInviteStore) bypasses RLS.

-- Table owner bypasses RLS in this engine; queries run as mentee_reader.
CREATE ROLE mentee_reader NOLOGIN;
GRANT SELECT ON bootstrap_mcp_mentees TO mentee_reader;
GRANT SELECT ON bootstrap_company_labels TO mentee_reader;
GRANT SELECT ON bootstrap_mcp_invites TO mentee_reader;
GRANT SELECT ON bootstrap_mcp_invite_outbox TO mentee_reader;
GRANT EXECUTE ON FUNCTION bootstrap_mcp_my_labels() TO mentee_reader;

-- SHA-256 hex, same digest as JS hashMcpToken / prod digest(). No pgcrypto in PGlite.
CREATE OR REPLACE FUNCTION bootstrap_mcp_hash_token(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- PGlite analog of public.bootstrap_mcp_invite_member. Session via app.auth_*.
-- Variable is company_label; column is cl.label. Never AND label = label (42702).
CREATE OR REPLACE FUNCTION bootstrap_mcp_invite_member(p_email text, p_company_label text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := current_setting('app.auth_uid', true);
  inviter_email text := lower(nullif(current_setting('app.auth_email', true), ''));
  inviter_id text;
  invitee text;
  company_label text;
  raw_token text;
  invite_id text;
  outbox_id text;
  expires timestamptz;
  card jsonb;
  outbox_payload jsonb;
BEGIN
  IF uid IS NULL OR uid = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inviter_not_on_allowlist');
  END IF;

  SELECT id INTO inviter_id
  FROM bootstrap_mcp_mentees
  WHERE auth_user_id = uid OR (inviter_email IS NOT NULL AND email = inviter_email);

  IF inviter_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inviter_not_on_allowlist');
  END IF;

  SELECT email INTO inviter_email FROM bootstrap_mcp_mentees WHERE id = inviter_id;
  IF inviter_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inviter_not_on_allowlist');
  END IF;

  invitee := lower(nullif(btrim(p_email), ''));
  IF invitee IS NULL OR position('@' IN invitee) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;

  company_label := lower(nullif(btrim(p_company_label), ''));
  IF company_label IS NULL OR company_label !~ '^[a-z0-9][a-z0-9_-]{0,31}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_label');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM bootstrap_company_labels cl
    WHERE cl.mentee_id = inviter_id
      AND cl.label = company_label
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'label_not_held');
  END IF;

  raw_token := 'inv_' || encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex');
  expires := now() + interval '7 days';
  invite_id := gen_random_uuid()::text;
  outbox_id := gen_random_uuid()::text;

  INSERT INTO bootstrap_mcp_invites (
    id, invitee_email, company_label, invited_by_mentee_id, invited_by_email, token_hash, expires_at
  ) VALUES (
    invite_id, invitee, company_label, inviter_id, inviter_email, bootstrap_mcp_hash_token(raw_token), expires
  );

  card := jsonb_build_object(
    'card', 'accept_invite',
    'shape', 'DraftExternalMessage',
    'from', jsonb_build_object('email', inviter_email),
    'to', jsonb_build_object('email', invitee),
    'companyWorkspace', company_label,
    'action', 'Accept',
    'inviteToken', raw_token,
    'expiresAt', expires,
    'tool', 'accept_invite',
    'note', 'In-chat Accept. Shows who invited / to whom / company workspace. Not /bootstrap-os/login as the product path. Mail/QR/SMS later.'
  );

  outbox_payload := card - 'inviteToken';
  outbox_payload := outbox_payload || jsonb_build_object(
    'inviteToken', null,
    'note', 'In-chat Accept. Raw invite token is not stored on the outbox. Mail/QR/SMS later.'
  );

  INSERT INTO bootstrap_mcp_invite_outbox (id, invite_id, channel, payload)
  VALUES (outbox_id, invite_id, 'in_chat', outbox_payload);

  RETURN jsonb_build_object(
    'ok', true,
    'card', card,
    'queued', jsonb_build_object('channel', 'in_chat', 'id', outbox_id)
  );
END;
$$;

-- PGlite analog of public.bootstrap_mcp_accept_invite. No label / labels collision.
CREATE OR REPLACE FUNCTION bootstrap_mcp_accept_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := current_setting('app.auth_uid', true);
  user_email text := lower(nullif(current_setting('app.auth_email', true), ''));
  invite bootstrap_mcp_invites%ROWTYPE;
  found_mentee_id text;
  labels jsonb;
BEGIN
  IF uid IS NULL OR uid = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_required');
  END IF;

  IF user_email IS NULL OR user_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_required');
  END IF;

  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invite_not_found');
  END IF;

  SELECT * INTO invite
  FROM bootstrap_mcp_invites
  WHERE token_hash = bootstrap_mcp_hash_token(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invite_not_found');
  END IF;

  IF invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invite_already_used');
  END IF;

  IF invite.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invite_expired');
  END IF;

  IF invite.invitee_email <> user_email THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invite_email_mismatch');
  END IF;

  UPDATE bootstrap_mcp_invites
  SET accepted_at = now()
  WHERE id = invite.id
    AND accepted_at IS NULL;

  SELECT id INTO found_mentee_id
  FROM bootstrap_mcp_mentees
  WHERE email = invite.invitee_email;

  IF found_mentee_id IS NULL THEN
    INSERT INTO bootstrap_mcp_mentees (id, email, auth_user_id)
    VALUES (gen_random_uuid()::text, invite.invitee_email, uid)
    RETURNING id INTO found_mentee_id;
  ELSE
    UPDATE bootstrap_mcp_mentees
    SET auth_user_id = uid
    WHERE id = found_mentee_id
      AND auth_user_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM bootstrap_mcp_mentees m2 WHERE m2.auth_user_id = uid
      );
  END IF;

  INSERT INTO bootstrap_company_labels (id, mentee_id, label)
  VALUES (gen_random_uuid()::text, found_mentee_id, invite.company_label)
  ON CONFLICT (mentee_id, label) DO NOTHING;

  SELECT coalesce(jsonb_agg(l.label ORDER BY l.label), '[]'::jsonb)
  INTO labels
  FROM bootstrap_company_labels l
  WHERE l.mentee_id = found_mentee_id;

  RETURN jsonb_build_object(
    'ok', true,
    'email', invite.invitee_email,
    'labels', labels,
    'companyWorkspace', invite.company_label,
    'note', 'Allowlist + label bound. Labels only. Not boards. Not company-state.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION bootstrap_mcp_invite_member(text, text) TO mentee_reader;
GRANT EXECUTE ON FUNCTION bootstrap_mcp_accept_invite(text) TO mentee_reader;
