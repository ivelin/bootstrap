-- Outsider invite: verify RPC + email outbox channel.
-- DO NOT apply from a PR cloud agent. Local/CI use mcp/test/pglite/identity-schema.sql.
-- Cos applies on rebuild/prod after merge. Never supabase-pirin-ai from a PR agent.
-- Shipped 20260910_bootstrap_mcp_invite_accept.sql,
-- 20260910_bootstrap_mcp_invite_qualify_label.sql, and
-- 20260911_bootstrap_mcp_invite_pgcrypto_search_path.sql are left in place.
--
-- Cos lock 2026-09-10 (Ivelin: mail + signup):
--   MCP enqueues in_chat + email. pirin-ai Resend sends From bootstrap@pirin.ai
--   after Cos yes. Web Builder signup: /bootstrap-os/login?invite=<token>.
--   verify_invite is fail-closed + opaque. service_role / MCP edge only —
--   never browser + open RLS.

ALTER TABLE public.bootstrap_mcp_invite_outbox
  DROP CONSTRAINT IF EXISTS bootstrap_mcp_invite_outbox_channel;

ALTER TABLE public.bootstrap_mcp_invite_outbox
  ADD CONSTRAINT bootstrap_mcp_invite_outbox_channel
  CHECK (channel IN ('in_chat', 'email'));

ALTER TABLE public.bootstrap_mcp_invite_outbox
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS bootstrap_mcp_invite_outbox_email_pending_idx
  ON public.bootstrap_mcp_invite_outbox (created_at)
  WHERE channel = 'email' AND delivered_at IS NULL;

-- CREATE OR REPLACE invite_member: same grants / search_path as pgcrypto fix.
-- Enqueue email row (mailer handoff). in_chat still strips the raw token.
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
  company_label text;
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

  company_label := lower(nullif(btrim(p_company_label), ''));
  IF company_label IS NULL OR company_label !~ '^[a-z0-9][a-z0-9_-]{0,31}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_label');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bootstrap_company_labels cl
    WHERE cl.mentee_id = inviter_id
      AND cl.label = company_label
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'label_not_held');
  END IF;

  raw_token := 'inv_' || encode(extensions.gen_random_bytes(24), 'hex');
  expires := now() + interval '7 days';
  invite_id := gen_random_uuid();
  outbox_id := gen_random_uuid();
  mail_id := gen_random_uuid();
  signup_url := 'https://pirin.ai/bootstrap-os/login?invite=' || raw_token;

  INSERT INTO public.bootstrap_mcp_invites (
    id, invitee_email, company_label, invited_by_mentee_id, invited_by_email, token_hash, expires_at
  ) VALUES (
    invite_id, invitee, company_label, inviter_id, inviter_email, public.bootstrap_mcp_hash_token(raw_token), expires
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
    'note', 'In-chat Accept. Shows who invited / to whom / company workspace. Not /bootstrap-os/login as the product path. Outsider mail (bootstrap@) is the support path when the invitee has no JWT yet.'
  );

  auth_card := jsonb_build_object(
    'card', 'invite_signup',
    'shape', 'DraftExternalMessage',
    'from', jsonb_build_object('email', 'bootstrap@pirin.ai'),
    'to', jsonb_build_object('email', invitee),
    'companyWorkspace', company_label,
    'inviterEmail', inviter_email,
    'action', 'Create account',
    'signupUrl', signup_url,
    'qrPayload', signup_url,
    'inviteToken', raw_token,
    'expiresAt', expires,
    'note', 'Support path when the invitee has no JWT yet. Web Builder owns /bootstrap-os/login. After JWT as that email, accept_invite with the same token. pirin-ai sends From bootstrap@pirin.ai only — Cos yes before prod Resend.'
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
    'companyWorkspace', company_label,
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

-- Fail-closed verify for Web Builder signup. Opaque fail — no enumerate.
-- Token only. Optional JWT email check is accept_invite, not this RPC.
CREATE OR REPLACE FUNCTION public.bootstrap_mcp_verify_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite public.bootstrap_mcp_invites%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT * INTO invite
  FROM public.bootstrap_mcp_invites
  WHERE token_hash = public.bootstrap_mcp_hash_token(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  IF invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  IF invite.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'invitee_email', invite.invitee_email,
    'company_label', invite.company_label,
    'inviter_email', invite.invited_by_email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_mcp_invite_member(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_mcp_invite_member(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.bootstrap_mcp_verify_invite(text) FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.bootstrap_mcp_verify_invite(text) TO service_role;
  END IF;
END
$$;
