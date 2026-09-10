-- Invite + accept for already-applied identity.
-- DO NOT apply from a PR cloud agent. Local/CI use mcp/test/pglite/identity-schema.sql.
-- First user remains a direct SQL insert (HOSTED_IDENTITY.md). This unlocks mentee rows
-- after an allowlisted inviter. OAuth alone is not enough.
-- In-chat Accept only. Mail sender is not this database. Mail/QR/SMS later.

CREATE TABLE IF NOT EXISTS public.bootstrap_mcp_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitee_email text NOT NULL,
  company_label text NOT NULL,
  invited_by_mentee_id uuid NOT NULL REFERENCES public.bootstrap_mcp_mentees (id) ON DELETE CASCADE,
  invited_by_email text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bootstrap_mcp_invites_email_lower CHECK (invitee_email = lower(invitee_email)),
  CONSTRAINT bootstrap_mcp_invites_inviter_email_lower CHECK (invited_by_email = lower(invited_by_email)),
  CONSTRAINT bootstrap_mcp_invites_label_slug CHECK (company_label ~ '^[a-z0-9][a-z0-9_-]{0,31}$'),
  CONSTRAINT bootstrap_mcp_invites_hash_unique UNIQUE (token_hash)
);

CREATE TABLE IF NOT EXISTS public.bootstrap_mcp_invite_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.bootstrap_mcp_invites (id) ON DELETE CASCADE,
  channel text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bootstrap_mcp_invite_outbox_channel CHECK (channel = 'in_chat')
);

CREATE INDEX IF NOT EXISTS bootstrap_mcp_invites_invitee_idx
  ON public.bootstrap_mcp_invites (invitee_email)
  WHERE accepted_at IS NULL;

ALTER TABLE public.bootstrap_mcp_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bootstrap_mcp_invite_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bootstrap_mcp_invites FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bootstrap_mcp_invite_outbox FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.bootstrap_mcp_invites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.bootstrap_mcp_invite_outbox FROM PUBLIC, anon, authenticated;

-- No INSERT/UPDATE/DELETE/SELECT policies. RPCs are SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.bootstrap_mcp_invite_member(p_email text, p_company_label text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inviter_email text;
  inviter_id uuid;
  invitee text;
  label text;
  raw_token text;
  invite_id uuid;
  outbox_id uuid;
  expires timestamptz;
  card jsonb;
  outbox_payload jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inviter_not_on_allowlist');
  END IF;

  SELECT lower(email) INTO inviter_email FROM auth.users WHERE id = uid;
  SELECT id INTO inviter_id
  FROM public.bootstrap_mcp_mentees
  WHERE auth_user_id = uid OR email = inviter_email;

  IF inviter_id IS NULL OR inviter_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inviter_not_on_allowlist');
  END IF;

  invitee := lower(nullif(btrim(p_email), ''));
  IF invitee IS NULL OR position('@' IN invitee) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;

  label := lower(nullif(btrim(p_company_label), ''));
  IF label IS NULL OR label !~ '^[a-z0-9][a-z0-9_-]{0,31}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_label');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bootstrap_company_labels
    WHERE mentee_id = inviter_id AND label = label
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'label_not_held');
  END IF;

  raw_token := 'inv_' || encode(gen_random_bytes(24), 'hex');
  expires := now() + interval '7 days';
  invite_id := gen_random_uuid();
  outbox_id := gen_random_uuid();

  INSERT INTO public.bootstrap_mcp_invites (
    id, invitee_email, company_label, invited_by_mentee_id, invited_by_email, token_hash, expires_at
  ) VALUES (
    invite_id, invitee, label, inviter_id, inviter_email, public.bootstrap_mcp_hash_token(raw_token), expires
  );

  card := jsonb_build_object(
    'card', 'accept_invite',
    'shape', 'DraftExternalMessage',
    'from', jsonb_build_object('email', inviter_email),
    'to', jsonb_build_object('email', invitee),
    'companyWorkspace', label,
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

  INSERT INTO public.bootstrap_mcp_invite_outbox (id, invite_id, channel, payload)
  VALUES (outbox_id, invite_id, 'in_chat', outbox_payload);

  RETURN jsonb_build_object(
    'ok', true,
    'card', card,
    'queued', jsonb_build_object('channel', 'in_chat', 'id', outbox_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_mcp_accept_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  invite public.bootstrap_mcp_invites%ROWTYPE;
  mentee_id uuid;
  labels jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_required');
  END IF;

  SELECT lower(email) INTO user_email FROM auth.users WHERE id = uid;
  IF user_email IS NULL OR user_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_required');
  END IF;

  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invite_not_found');
  END IF;

  SELECT * INTO invite
  FROM public.bootstrap_mcp_invites
  WHERE token_hash = public.bootstrap_mcp_hash_token(p_token);

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

  UPDATE public.bootstrap_mcp_invites
  SET accepted_at = now()
  WHERE id = invite.id
    AND accepted_at IS NULL;

  SELECT id INTO mentee_id
  FROM public.bootstrap_mcp_mentees
  WHERE email = invite.invitee_email;

  IF mentee_id IS NULL THEN
    INSERT INTO public.bootstrap_mcp_mentees (email, auth_user_id)
    VALUES (invite.invitee_email, uid)
    RETURNING id INTO mentee_id;
  ELSE
    UPDATE public.bootstrap_mcp_mentees
    SET auth_user_id = uid
    WHERE id = mentee_id
      AND auth_user_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.bootstrap_mcp_mentees m2 WHERE m2.auth_user_id = uid
      );
  END IF;

  INSERT INTO public.bootstrap_company_labels (mentee_id, label)
  VALUES (mentee_id, invite.company_label)
  ON CONFLICT (mentee_id, label) DO NOTHING;

  SELECT coalesce(jsonb_agg(l.label ORDER BY l.label), '[]'::jsonb)
  INTO labels
  FROM public.bootstrap_company_labels l
  WHERE l.mentee_id = mentee_id;

  RETURN jsonb_build_object(
    'ok', true,
    'email', invite.invitee_email,
    'labels', labels,
    'companyWorkspace', invite.company_label,
    'note', 'Allowlist + label bound. Labels only. Not boards. Not company-state.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_mcp_invite_member(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_mcp_accept_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_mcp_invite_member(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_mcp_accept_invite(text) TO authenticated;
