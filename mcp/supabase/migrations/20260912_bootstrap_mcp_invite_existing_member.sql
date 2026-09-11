-- Existing Bootstrap OS user → additional company workspace (team membership).
-- DO NOT apply from a PR cloud agent. Local/CI use mcp/test/pglite/identity-schema.sql.
-- Cos applies on rebuild/prod after merge. Never supabase-pirin-ai from a PR agent.
-- Shipped 20260910_* and 20260911_* invite files are left in place (CREATE OR REPLACE only).
--
-- bootstrap_mcp_mentees is the user table (legacy name). bootstrap_company_labels
-- are team memberships (user × workspace slug). Roles are not in this migration.
-- One pending invite per (email, workspace). Re-invite rotates the token in place.

COMMENT ON TABLE public.bootstrap_mcp_mentees IS
  'Bootstrap OS users (legacy name). Team memberships are bootstrap_company_labels.';
COMMENT ON TABLE public.bootstrap_company_labels IS
  'Team memberships: one Bootstrap OS user × one company workspace slug. Not boards. Not roles.';

-- Collapse duplicate pending rows so the unique index can be created.
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY invitee_email, company_label
    ORDER BY created_at DESC
  ) AS rn
  FROM public.bootstrap_mcp_invites
  WHERE accepted_at IS NULL
)
UPDATE public.bootstrap_mcp_invites i
SET accepted_at = now()
FROM ranked r
WHERE i.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS bootstrap_mcp_invites_pending_email_label_idx
  ON public.bootstrap_mcp_invites (invitee_email, company_label)
  WHERE accepted_at IS NULL;

CREATE OR REPLACE FUNCTION public.bootstrap_mcp_invite_member(p_email text, p_company_label text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  inviter_email text;
  inviter_id uuid;
  invitee text;
  workspace text;
  raw_token text;
  invite_id uuid;
  outbox_id uuid;
  mail_id uuid;
  expires timestamptz;
  card jsonb;
  auth_card jsonb;
  outbox_payload jsonb;
  mail_payload jsonb;
  signup_url text;
  pending_id uuid;
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

  workspace := lower(nullif(btrim(p_company_label), ''));
  IF workspace IS NULL OR workspace !~ '^[a-z0-9][a-z0-9_-]{0,31}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_label');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bootstrap_company_labels cl
    WHERE cl.mentee_id = inviter_id
      AND cl.label = workspace
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'label_not_held');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bootstrap_mcp_mentees m
    JOIN public.bootstrap_company_labels cl ON cl.mentee_id = m.id
    WHERE m.email = invitee
      AND cl.label = workspace
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_member');
  END IF;

  raw_token := 'inv_' || encode(extensions.gen_random_bytes(24), 'hex');
  expires := now() + interval '7 days';
  outbox_id := gen_random_uuid();
  mail_id := gen_random_uuid();
  signup_url := 'https://pirin.ai/bootstrap-os/login?invite=' || raw_token;

  SELECT i.id INTO pending_id
  FROM public.bootstrap_mcp_invites i
  WHERE i.invitee_email = invitee
    AND i.company_label = workspace
    AND i.accepted_at IS NULL
  ORDER BY i.created_at DESC
  LIMIT 1;

  IF pending_id IS NOT NULL THEN
    invite_id := pending_id;
    UPDATE public.bootstrap_mcp_invites
    SET token_hash = public.bootstrap_mcp_hash_token(raw_token),
        expires_at = expires,
        invited_by_mentee_id = inviter_id,
        invited_by_email = inviter_email
    WHERE id = invite_id
      AND accepted_at IS NULL;
  ELSE
    invite_id := gen_random_uuid();
    INSERT INTO public.bootstrap_mcp_invites (
      id, invitee_email, company_label, invited_by_mentee_id, invited_by_email, token_hash, expires_at
    ) VALUES (
      invite_id, invitee, workspace, inviter_id, inviter_email, public.bootstrap_mcp_hash_token(raw_token), expires
    );
  END IF;

  card := jsonb_build_object(
    'card', 'accept_invite',
    'shape', 'DraftExternalMessage',
    'from', jsonb_build_object('email', inviter_email),
    'to', jsonb_build_object('email', invitee),
    'companyWorkspace', workspace,
    'action', 'Accept',
    'inviteToken', raw_token,
    'expiresAt', expires,
    'tool', 'accept_invite',
    'note', 'Optional Accept card for MCP clients that render tool results. Login URL is the universal path. Mail (bootstrap@) carries the same token. JWT email must match.'
  );

  auth_card := jsonb_build_object(
    'card', 'invite_signup',
    'shape', 'DraftExternalMessage',
    'from', jsonb_build_object('email', 'bootstrap@pirin.ai'),
    'to', jsonb_build_object('email', invitee),
    'companyWorkspace', workspace,
    'inviterEmail', inviter_email,
    'action', 'Sign in or create account',
    'signupUrl', signup_url,
    'qrPayload', signup_url,
    'inviteToken', raw_token,
    'expiresAt', expires,
    'note', 'Universal path for any agentic client. Web Builder owns /bootstrap-os/login. Sign in as this email if you already have a pirin.ai account; otherwise create the account for this invitee email only. Then accept_invite with the same token. pirin-ai sends From bootstrap@pirin.ai only — Cos yes before prod Resend.'
  );

  outbox_payload := card - 'inviteToken';
  outbox_payload := outbox_payload || jsonb_build_object(
    'inviteToken', null,
    'note', 'In-chat Accept. Raw invite token is not stored on this channel.'
  );

  mail_payload := jsonb_build_object(
    'channel', 'email',
    'mailFrom', 'bootstrap@pirin.ai',
    'from', jsonb_build_object('email', inviter_email),
    'to', jsonb_build_object('email', invitee),
    'companyWorkspace', workspace,
    'signupUrl', signup_url,
    'qrPayload', signup_url,
    'inviteToken', raw_token,
    'expiresAt', expires,
    'note', 'Mailer handoff. pirin-ai Resend From bootstrap@pirin.ai only. Token is on this channel so the poller can send ?invite=. in_chat never stores the token. Cos yes before prod send.'
  );

  INSERT INTO public.bootstrap_mcp_invite_outbox (id, invite_id, channel, payload)
  VALUES (outbox_id, invite_id, 'in_chat', outbox_payload);

  INSERT INTO public.bootstrap_mcp_invite_outbox (id, invite_id, channel, payload)
  VALUES (mail_id, invite_id, 'email', mail_payload);

  RETURN jsonb_build_object(
    'ok', true,
    'card', card,
    'authCard', auth_card,
    'queued', jsonb_build_object('channel', 'in_chat', 'id', outbox_id),
    'queuedMail', jsonb_build_object(
      'channel', 'email',
      'id', mail_id,
      'from', 'bootstrap@pirin.ai'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_mcp_invite_member(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_mcp_invite_member(text, text) TO authenticated;
