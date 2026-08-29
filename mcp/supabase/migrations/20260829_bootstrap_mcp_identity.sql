-- Bootstrap OS hosted MCP identity (labels only).
-- Target: existing pirin.ai project supabase-pirin-ai (vsqekesftzstsjvcowgm).
-- No company-state, no boards, no ~/.bootstrap-os, no mentee roster.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.bootstrap_mcp_mentees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  auth_user_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bootstrap_mcp_mentees_email_lower CHECK (email = lower(email)),
  CONSTRAINT bootstrap_mcp_mentees_email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.bootstrap_company_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id uuid NOT NULL REFERENCES public.bootstrap_mcp_mentees (id) ON DELETE CASCADE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bootstrap_company_labels_slug CHECK (label ~ '^[a-z0-9][a-z0-9_-]{0,31}$'),
  CONSTRAINT bootstrap_company_labels_unique UNIQUE (mentee_id, label)
);

CREATE TABLE IF NOT EXISTS public.bootstrap_mcp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id uuid NOT NULL REFERENCES public.bootstrap_mcp_mentees (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT bootstrap_mcp_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS bootstrap_company_labels_mentee_idx
  ON public.bootstrap_company_labels (mentee_id);
CREATE INDEX IF NOT EXISTS bootstrap_mcp_tokens_mentee_idx
  ON public.bootstrap_mcp_tokens (mentee_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.bootstrap_mcp_mentees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bootstrap_company_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bootstrap_mcp_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bootstrap_mcp_mentees FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bootstrap_company_labels FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bootstrap_mcp_tokens FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.bootstrap_mcp_mentees FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.bootstrap_company_labels FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.bootstrap_mcp_tokens FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.bootstrap_mcp_mentees TO authenticated;
GRANT SELECT ON TABLE public.bootstrap_company_labels TO authenticated;
-- Tokens are never readable via PostgREST. Mint returns the secret once.

DROP POLICY IF EXISTS mentees_select_own ON public.bootstrap_mcp_mentees;
CREATE POLICY mentees_select_own
  ON public.bootstrap_mcp_mentees
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = auth_user_id);

DROP POLICY IF EXISTS labels_select_own ON public.bootstrap_company_labels;
CREATE POLICY labels_select_own
  ON public.bootstrap_company_labels
  FOR SELECT
  TO authenticated
  USING (
    mentee_id IN (
      SELECT id FROM public.bootstrap_mcp_mentees
      WHERE auth_user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated. Seed and RPCs are SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.bootstrap_mcp_hash_token(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_mcp_whoami(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mentee public.bootstrap_mcp_mentees%ROWTYPE;
  token_row public.bootstrap_mcp_tokens%ROWTYPE;
  labels jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'labels', '[]'::jsonb,
      'reason', 'missing_or_short_token'
    );
  END IF;

  SELECT * INTO token_row
  FROM public.bootstrap_mcp_tokens
  WHERE token_hash = public.bootstrap_mcp_hash_token(p_token)
    AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'labels', '[]'::jsonb,
      'reason', 'invalid_or_revoked_token'
    );
  END IF;

  SELECT * INTO mentee FROM public.bootstrap_mcp_mentees WHERE id = token_row.mentee_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'labels', '[]'::jsonb,
      'reason', 'mentee_missing'
    );
  END IF;

  UPDATE public.bootstrap_mcp_tokens
  SET last_used_at = now()
  WHERE id = token_row.id;

  SELECT coalesce(jsonb_agg(l.label ORDER BY l.label), '[]'::jsonb)
  INTO labels
  FROM public.bootstrap_company_labels l
  WHERE l.mentee_id = mentee.id;

  RETURN jsonb_build_object(
    'authenticated', true,
    'email', mentee.email,
    'labels', labels,
    'note', 'Labels only. Not boards. Not company-state. Not ~/.bootstrap-os.'
  );
END;
$$;

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

  INSERT INTO public.bootstrap_mcp_mentees (email, auth_user_id)
  VALUES (user_email, uid)
  ON CONFLICT (email) DO UPDATE
    SET auth_user_id = COALESCE(public.bootstrap_mcp_mentees.auth_user_id, EXCLUDED.auth_user_id)
  RETURNING id INTO mentee_id;

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
    'mcpUrl', 'https://bootstrap-os-mcp.vercel.app/mcp',
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
    RETURN jsonb_build_object('authenticated', true, 'email', user_email, 'labels', '[]'::jsonb);
  END IF;

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

REVOKE ALL ON FUNCTION public.bootstrap_mcp_hash_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_mcp_whoami(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_mcp_mint_token() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_mcp_my_labels() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.bootstrap_mcp_whoami(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_mcp_mint_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_mcp_my_labels() TO authenticated;

INSERT INTO public.bootstrap_mcp_mentees (email)
VALUES ('ivelin@pirin.ai')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.bootstrap_company_labels (mentee_id, label)
SELECT m.id, x.label
FROM public.bootstrap_mcp_mentees m
CROSS JOIN (VALUES ('pirin'), ('zk0'), ('totbox')) AS x(label)
WHERE m.email = 'ivelin@pirin.ai'
ON CONFLICT (mentee_id, label) DO NOTHING;
