-- Fictional fixture boards for template / PGlite tests.
-- Never apply this DO block to production. Production already has live boards.
-- gateStatus "open" → hold.

CREATE OR REPLACE FUNCTION public.bootstrap_os_import_ensure(p_slug text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, bootstrap_os AS $$
DECLARE cid uuid;
BEGIN
  SELECT c.id INTO cid FROM bootstrap_os.companies c WHERE c.slug = p_slug;
  IF cid IS NULL THEN
    INSERT INTO bootstrap_os.companies (slug, label) VALUES (p_slug, p_slug) RETURNING id INTO cid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bootstrap_os.ideas i WHERE i.company_id = cid AND i.slug = 'default') THEN
    INSERT INTO bootstrap_os.ideas (company_id, slug, name, journey_phase, loop_stage, current_gate, scoreboard)
    VALUES (cid, 'default', p_slug, 1, 1, 'hold', jsonb_build_object('schema_version', 1));
  END IF;
  INSERT INTO bootstrap_os.company_acl (company_id, principal, principal_kind, role)
  VALUES (cid, 'founder@example.test', 'email', 'founder_authorized')
  ON CONFLICT (company_id, principal, principal_kind) DO NOTHING;
  RETURN cid;
END;
$$;

DO $$
DECLARE
  cid uuid;
  iid uuid;
BEGIN
  cid := public.bootstrap_os_import_ensure('charlie');
  UPDATE bootstrap_os.ideas SET
    journey_phase = 6, loop_stage = 6, current_gate = 'hold',
    scoreboard = jsonb_build_object(
      'schema_version', 1,
      'hypothesis', 'Fictional example: independent operators will pay for a weekly decision log that keeps one idea honest.',
      'readyForHumanEyes', jsonb_build_object('status', 'green'),
      'autonomyPosture', 'strict',
      'openQuestions', jsonb_build_array(
        'Which beachhead survives an evidence-labeled reward/risk pass?',
        'What observed behavior, not a spoken yes, would promote this idea?',
        'Is Ready for human eyes still green before any external try-this ask?',
        'What experiment makes community contribution tangible (not only stars/views)?'
      ),
      'lastAction', 'weekly_snapshot_fixture',
      'constraint_this_week', 'Example fixture. Tests look green; that is not proof anyone paid or stayed.'
    ),
    updated_at = now()
  WHERE company_id = cid AND slug = 'default'
  RETURNING id INTO iid;
  INSERT INTO bootstrap_os.gate_events (idea_id, action, at, why, who) VALUES
    (iid, 'hold', '2026-08-06T21:27:49Z', 'hold_fixture_full_board — example decision trace, not a live instance', 'founder@example.test'),
    (iid, 'hold', '2026-08-06T22:00:00Z', 'Hold journey at 6; iterate numbers; stamp weekly ritual', 'founder@example.test'),
    (iid, 'hold', '2026-08-17T00:00:00Z', 'Hold journey at 6; observed payment still missing', 'founder@example.test');
  PERFORM bootstrap_os.emit_audit(cid, iid, 'founder@example.test', 'import', jsonb_build_object('op', 'import', 'source', 'fixture://charlie/company-state.json'));

  cid := public.bootstrap_os_import_ensure('bravo');
  UPDATE bootstrap_os.ideas SET
    journey_phase = 6, loop_stage = 4, current_gate = 'hold',
    scoreboard = jsonb_build_object(
      'schema_version', 1,
      'readyForHumanEyes', jsonb_build_object('status', 'unknown'),
      'autonomyPosture', 'strict',
      'openQuestions', jsonb_build_array(
        'What numbers must a real job hit before we build more?',
        'When is the next real customer job, with a short honest write-up after?',
        'When is the next weekly “where do we stand?” check-in?',
        'Is Ready for human eyes green before any mentor “try this product” ask?'
      ),
      'lastAction', 'ready_for_human_eyes:unknown',
      'constraint_this_week', 'Engineering tests look good. That is not proof people will pay or that real jobs get easier.'
    ),
    updated_at = now()
  WHERE company_id = cid AND slug = 'default'
  RETURNING id INTO iid;
  PERFORM bootstrap_os.emit_audit(cid, iid, 'founder@example.test', 'import', jsonb_build_object('op', 'import', 'source', 'fixture://bravo/company-state.json'));

  cid := public.bootstrap_os_import_ensure('alpha');
  UPDATE bootstrap_os.ideas SET
    journey_phase = 1, loop_stage = 1, current_gate = 'hold',
    scoreboard = jsonb_build_object(
      'schema_version', 1,
      'readyForHumanEyes', jsonb_build_object('status', 'unknown'),
      'autonomyPosture', 'strict',
      'openQuestions', jsonb_build_array(
        'What experiment makes community contribution tangible (not only stars/views)?'
      ),
      'lastAction', 'hold_fixture_empty_board',
      'constraint_this_week', 'Community engagement that produces tangible project progress — not only stars, views, or cool-topic interest.'
    ),
    updated_at = now()
  WHERE company_id = cid AND slug = 'default'
  RETURNING id INTO iid;
  INSERT INTO bootstrap_os.gate_events (idea_id, action, at, why, who) VALUES
    (iid, 'hold', '2026-08-06T21:27:49Z', 'Hold the empty board; iterate engagement. Real contribution not passed.', 'founder@example.test');
  PERFORM bootstrap_os.emit_audit(cid, iid, 'founder@example.test', 'import', jsonb_build_object('op', 'import', 'source', 'fixture://alpha/hold-note.md'));
END $$;
