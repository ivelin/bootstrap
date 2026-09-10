-- Qualify invite_member label (PL/pgSQL var vs bootstrap_company_labels.label).
-- DO NOT apply from a PR cloud agent. Local/CI use mcp/test/pglite/identity-schema.sql.
-- Cos applies on rebuild/prod after merge. Never supabase-pirin-ai from a PR agent.
-- Shipped 20260910_bootstrap_mcp_invite_accept.sql is left in place.
--
-- Root cause: DECLARE label text collided with bootstrap_company_labels.label in
--   WHERE mentee_id = inviter_id AND label = label
-- Postgres 42702: column reference "label" is ambiguous.
-- accept_invite was audited: variable is labels; columns are l.label / invite.company_label.

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
  company_label text;
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

  raw_token := 'inv_' || encode(gen_random_bytes(24), 'hex');
  expires := now() + interval '7 days';
  invite_id := gen_random_uuid();
  outbox_id := gen_random_uuid();

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

REVOKE ALL ON FUNCTION public.bootstrap_mcp_invite_member(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_mcp_invite_member(text, text) TO authenticated;
