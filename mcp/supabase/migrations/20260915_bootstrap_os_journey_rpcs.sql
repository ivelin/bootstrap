-- Hosted get/put/comment. Membership = public.bootstrap_company_labels.
-- Cos applies on supabase-pirin-ai. PR agents: PGlite only.

CREATE OR REPLACE FUNCTION public.bootstrap_os_held_label(p_company text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, bootstrap_os AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bootstrap_mcp_mentees m
    JOIN public.bootstrap_company_labels l ON l.mentee_id = m.id
    WHERE l.label = lower(p_company)
      AND (
        m.email = NULLIF(lower(auth.jwt() ->> 'email'), '')
        OR m.auth_user_id::text = NULLIF(auth.jwt() ->> 'sub', '')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_os_ensure_company(p_company text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, bootstrap_os AS $$
DECLARE
  slug text := lower(p_company);
  cid uuid;
  email text := NULLIF(lower(auth.jwt() ->> 'email'), '');
BEGIN
  IF NOT public.bootstrap_os_held_label(slug) THEN
    RAISE EXCEPTION 'company not visible';
  END IF;
  SELECT id INTO cid FROM bootstrap_os.companies WHERE bootstrap_os.companies.slug = slug;
  IF cid IS NULL THEN
    INSERT INTO bootstrap_os.companies (slug, label) VALUES (slug, slug) RETURNING id INTO cid;
    INSERT INTO bootstrap_os.ideas (company_id, slug, name, journey_phase, loop_stage, current_gate, scoreboard)
    VALUES (cid, 'default', slug, 1, 1, 'hold',
      jsonb_build_object('schema_version', 1, 'readyForHumanEyes', jsonb_build_object('status', 'unknown'),
        'autonomyPosture', 'strict', 'openQuestions', '[]'::jsonb, 'constraint_this_week', ''));
  END IF;
  IF email IS NOT NULL THEN
    INSERT INTO bootstrap_os.company_acl (company_id, principal, principal_kind, role)
    VALUES (cid, email, 'email', 'founder_authorized')
    ON CONFLICT (company_id, principal, principal_kind) DO NOTHING;
  END IF;
  RETURN cid;
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_os_get_journey(p_company text, p_idea text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, bootstrap_os AS $$
DECLARE cid uuid; company_row bootstrap_os.companies%ROWTYPE; ideas jsonb;
BEGIN
  cid := public.bootstrap_os_ensure_company(p_company);
  SELECT * INTO company_row FROM bootstrap_os.companies WHERE id = cid;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'slug', i.slug, 'name', i.name,
    'clocks', jsonb_build_object('journeyPhase', i.journey_phase, 'loopStage', i.loop_stage, 'currentGate', i.current_gate),
    'constraintThisWeek', coalesce(i.scoreboard->>'constraint_this_week', ''),
    'scoreboard', i.scoreboard,
    'snapshot', concat(company_row.label, ' / ', i.name, ' is at journey phase ', i.journey_phase::text,
      ', loop stage ', i.loop_stage::text, ', gate ', i.current_gate::text, '. Bottleneck this week: ',
      coalesce(nullif(i.scoreboard->>'constraint_this_week', ''), 'none yet'), '.')
  ) ORDER BY i.slug), '[]'::jsonb)
  INTO ideas FROM bootstrap_os.ideas i
  WHERE i.company_id = cid AND (p_idea IS NULL OR i.slug = lower(p_idea));
  RETURN jsonb_build_object('ok', true, 'company', jsonb_build_object('slug', company_row.slug, 'label', company_row.label),
    'ideas', ideas, 'note', 'Shared 0-1 board. Views are generated. Do not invent a stage.');
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_os_put_journey(
  p_company text, p_idea text, p_why text, p_founder_yes boolean,
  p_journey_phase int DEFAULT NULL, p_loop_stage int DEFAULT NULL,
  p_current_gate text DEFAULT NULL, p_constraint text DEFAULT NULL,
  p_founder_written_decision text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, bootstrap_os AS $$
DECLARE cid uuid; idea_row bootstrap_os.ideas%ROWTYPE; email text := NULLIF(lower(auth.jwt() ->> 'email'), '');
BEGIN
  IF p_founder_yes IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'founder yes required in the agent chat');
  END IF;
  cid := public.bootstrap_os_ensure_company(p_company);
  SELECT * INTO idea_row FROM bootstrap_os.ideas
  WHERE company_id = cid AND slug = lower(coalesce(nullif(p_idea, ''), 'default'));
  IF idea_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exactly one idea required to write');
  END IF;
  IF p_journey_phase IS NOT NULL THEN idea_row.journey_phase := p_journey_phase; END IF;
  IF p_loop_stage IS NOT NULL THEN idea_row.loop_stage := p_loop_stage; END IF;
  IF p_current_gate IS NOT NULL THEN idea_row.current_gate := p_current_gate::bootstrap_os.gate_decision; END IF;
  IF p_constraint IS NOT NULL THEN
    idea_row.scoreboard := jsonb_set(idea_row.scoreboard, '{constraint_this_week}', to_jsonb(left(p_constraint, 280)));
  END IF;
  UPDATE bootstrap_os.ideas SET journey_phase = idea_row.journey_phase, loop_stage = idea_row.loop_stage,
    current_gate = idea_row.current_gate, scoreboard = idea_row.scoreboard, updated_at = now() WHERE id = idea_row.id;
  INSERT INTO bootstrap_os.gate_events (idea_id, action, why, who)
  VALUES (idea_row.id, idea_row.current_gate, p_why, coalesce(email, 'unknown'));
  RETURN public.bootstrap_os_get_journey(p_company, idea_row.slug);
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_os_post_comment(p_company text, p_idea text, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, bootstrap_os AS $$
DECLARE cid uuid; iid uuid; email text := NULLIF(lower(auth.jwt() ->> 'email'), '');
BEGIN
  cid := public.bootstrap_os_ensure_company(p_company);
  SELECT id INTO iid FROM bootstrap_os.ideas
  WHERE company_id = cid AND slug = lower(coalesce(nullif(p_idea, ''), 'default'));
  IF iid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exactly one idea required to comment');
  END IF;
  INSERT INTO bootstrap_os.comments (idea_id, body, who) VALUES (iid, p_body, coalesce(email, 'unknown'));
  RETURN jsonb_build_object('ok', true, 'clocksUnchanged', true);
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_os_held_label(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_os_ensure_company(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_os_get_journey(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_os_put_journey(text, text, text, boolean, int, int, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_os_post_comment(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_os_get_journey(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_os_put_journey(text, text, text, boolean, int, int, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_os_post_comment(text, text, text) TO authenticated;
