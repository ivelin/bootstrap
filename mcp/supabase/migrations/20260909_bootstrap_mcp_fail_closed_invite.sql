-- Fail-closed allowlist for already-applied 20260829.
-- DO NOT apply from a PR cloud agent. Local/CI use mcp/test/pglite/identity-schema.sql.
-- A valid pirin.ai JWT is not enough. Row must exist on bootstrap_mcp_mentees.
-- First user is a direct SQL insert (email lowercased). Invite-from-existing-user is a follow-on.

CREATE OR REPLACE FUNCTION public.bootstrap_mcp_mint_token()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  mentee_id uuid;
  raw_token text;
  labels jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT lower(email) INTO user_email FROM auth.users WHERE id = uid;
  IF user_email IS NULL OR user_email = '' THEN
    RAISE EXCEPTION 'email_required' USING ERRCODE = '22023';
  END IF;

  -- Leftover hashed-token path. Must not auto-insert — that is open login.
  SELECT id INTO mentee_id
  FROM public.bootstrap_mcp_mentees
  WHERE auth_user_id = uid OR email = user_email;

  IF mentee_id IS NULL THEN
    RAISE EXCEPTION 'not_invited' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bootstrap_mcp_mentees
  SET auth_user_id = COALESCE(auth_user_id, uid)
  WHERE id = mentee_id
    AND (auth_user_id IS NULL OR auth_user_id = uid);

  raw_token := 'bos_' || encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.bootstrap_mcp_tokens (mentee_id, token_hash)
  VALUES (mentee_id, public.bootstrap_mcp_hash_token(raw_token));

  SELECT coalesce(jsonb_agg(l.label ORDER BY l.label), '[]'::jsonb)
  INTO labels
  FROM public.bootstrap_company_labels l
  WHERE l.mentee_id = mentee_id;

  RETURN jsonb_build_object(
    'token', raw_token,
    'email', user_email,
    'labels', labels,
    'mcpUrl', 'https://mcp.bootstrap.pirin.ai/mcp',
    'note', 'Show the token once. Put it on the MCP connector as Authorization: Bearer <token>. Public OS tools stay open without it.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_mcp_my_labels()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  mentee_id uuid;
  labels jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT lower(email) INTO user_email FROM auth.users WHERE id = uid;
  SELECT id INTO mentee_id
  FROM public.bootstrap_mcp_mentees
  WHERE auth_user_id = uid OR email = user_email;

  IF mentee_id IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'email', user_email,
      'labels', '[]'::jsonb,
      'reason', 'not_invited'
    );
  END IF;

  -- Bind auth_user_id on first match of an email-only SQL invite.
  UPDATE public.bootstrap_mcp_mentees
  SET auth_user_id = uid
  WHERE id = mentee_id
    AND auth_user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.bootstrap_mcp_mentees m2 WHERE m2.auth_user_id = uid
    );

  SELECT coalesce(jsonb_agg(l.label ORDER BY l.label), '[]'::jsonb)
  INTO labels
  FROM public.bootstrap_company_labels l
  WHERE l.mentee_id = mentee_id;

  RETURN jsonb_build_object(
    'authenticated', true,
    'email', user_email,
    'labels', labels,
    'note', 'Labels only. Not boards. Not company-state.'
  );
END;
$$;
