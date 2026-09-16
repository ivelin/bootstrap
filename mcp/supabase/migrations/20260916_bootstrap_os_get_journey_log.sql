-- Decision log on get_journey. Fix slug ambiguity. emit_audit on put/comment.
-- Cos applies on supabase-pirin-ai.

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
    RETURN NULL;
  END IF;
  INSERT INTO bootstrap_os.audit_events (company_id, idea_id, who, client, what_changed)
  VALUES (p_company_id, p_idea_id, p_who, p_client, p_what_changed)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION bootstrap_os.emit_audit(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_os_ensure_company(p_company text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, bootstrap_os AS $$
DECLARE
  v_slug text := lower(p_company);
  cid uuid;
  email text := NULLIF(lower(auth.jwt() ->> 'email'), '');
BEGIN
  IF NOT public.bootstrap_os_held_label(v_slug) THEN
    RAISE EXCEPTION 'company not visible';
  END IF;
  SELECT c.id INTO cid FROM bootstrap_os.companies c WHERE c.slug = v_slug;
  IF cid IS NULL THEN
    INSERT INTO bootstrap_os.companies (slug, label) VALUES (v_slug, v_slug) RETURNING id INTO cid;
    INSERT INTO bootstrap_os.ideas (company_id, slug, name, journey_phase, loop_stage, current_gate, scoreboard)
    VALUES (cid, 'default', v_slug, 1, 1, 'hold',
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
DECLARE cid uuid; company_row bootstrap_os.companies%ROWTYPE; ideas jsonb; audit jsonb;
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
      coalesce(nullif(i.scoreboard->>'constraint_this_week', ''), 'none yet'), '.'),
    'lastTransitions', coalesce((
      SELECT jsonb_agg(jsonb_build_object('at', e.at, 'who', e.who, 'action', e.action, 'why', e.why) ORDER BY e.at)
      FROM bootstrap_os.gate_events e WHERE e.idea_id = i.id
    ), '[]'::jsonb),
    'comments', coalesce((
      SELECT jsonb_agg(jsonb_build_object('at', c.at, 'who', c.who, 'body', c.body) ORDER BY c.at)
      FROM bootstrap_os.comments c WHERE c.idea_id = i.id
    ), '[]'::jsonb)
  ) ORDER BY i.slug), '[]'::jsonb)
  INTO ideas FROM bootstrap_os.ideas i
  WHERE i.company_id = cid AND (p_idea IS NULL OR i.slug = lower(p_idea));
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'at', a.at, 'who', a.who, 'client', a.client, 'whatChanged', a.what_changed
  ) ORDER BY a.at), '[]'::jsonb)
  INTO audit FROM bootstrap_os.audit_events a WHERE a.company_id = cid;
  RETURN jsonb_build_object(
    'ok', true,
    'company', jsonb_build_object('slug', company_row.slug, 'label', company_row.label),
    'ideas', ideas,
    'audit', audit,
    'note', 'Shared 0-1 board. Decision log is lastTransitions, comments, and audit. Do not invent entries. Do not paste GitHub as the board.'
  );
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
    idea_row.scoreboard := jsonb_set(coalesce(idea_row.scoreboard, '{}'::jsonb), '{constraint_this_week}', to_jsonb(left(p_constraint, 280)));
  END IF;
  UPDATE bootstrap_os.ideas SET journey_phase = idea_row.journey_phase, loop_stage = idea_row.loop_stage,
    current_gate = idea_row.current_gate, scoreboard = idea_row.scoreboard, updated_at = now() WHERE id = idea_row.id;
  INSERT INTO bootstrap_os.gate_events (idea_id, action, why, who)
  VALUES (idea_row.id, idea_row.current_gate, p_why, coalesce(email, 'unknown'));
  PERFORM bootstrap_os.emit_audit(cid, idea_row.id, coalesce(email, 'unknown'), 'mcp',
    jsonb_build_object('op', 'put_journey', 'why', p_why, 'gate', idea_row.current_gate));
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
  PERFORM bootstrap_os.emit_audit(cid, iid, coalesce(email, 'unknown'), 'mcp',
    jsonb_build_object('op', 'post_comment'));
  RETURN jsonb_build_object('ok', true, 'clocksUnchanged', true);
END;
$$;
