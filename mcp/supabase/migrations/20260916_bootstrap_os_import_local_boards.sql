-- One-time copy of local Path 3 clocks. Cos only. No GitHub. zk0 has no company-state.json.
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
  VALUES (cid, 'ivelin@pirin.ai', 'email', 'founder_authorized')
  ON CONFLICT (company_id, principal, principal_kind) DO NOTHING;
  RETURN cid;
END;
$$;

DO $$
DECLARE
  cid uuid;
  iid uuid;
BEGIN
  -- pirin from ~/pirin-ai/company/state/company-state.json
  cid := public.bootstrap_os_import_ensure('pirin');
  UPDATE bootstrap_os.ideas SET
    journey_phase = 6, loop_stage = 6, current_gate = 'hold',
    scoreboard = jsonb_build_object(
      'schema_version', 1,
      'hypothesis', 'Non-technical solo founders will install and run a Bootstrap OS with structured help; a paid intensive plus free Ground Level for FI-equivalent alumni can prove and monetize that value.',
      'readyForHumanEyes', jsonb_build_object('status', 'green'),
      'autonomyPosture', 'strict',
      'openQuestions', jsonb_build_array(
        'Is Bootstrap OS Intensive the primary paid beachhead, or Ground Level → Next Level?',
        'Confirm or override: 3 paid deposits to open a first cohort; 0 paid by 2026-09-16 holds intensive as primary?',
        'Which ICP rank survives an evidence-labeled reward/risk pass?',
        'What experiment makes zk0 community contribution tangible (not only stars/views)?'
      ),
      'lastAction', 'weekly_snapshot_2026-08-17',
      'constraint_this_week', 'Install page shipped self-serve (PR #130). WTP unchanged. Intensive one-number: 3 paid deposits to open; 0 paid by 2026-09-16 holds intensive as primary. Dogfood: Totbox+Pirin. zk0: Hold full board.'
    ),
    updated_at = now()
  WHERE company_id = cid AND slug = 'default'
  RETURNING id INTO iid;
  INSERT INTO bootstrap_os.gate_events (idea_id, action, at, why, who) VALUES
    (iid, 'hold', '2026-08-06T21:27:49Z', 'hold_zk0_full_bootstrap_os_instance — traces/decisions/2026-08-06-hold-zk0-bootstrap-os-instance.md', 'ivelin@pirin.ai'),
    (iid, 'hold', '2026-08-06T22:00:00Z', 'Hold journey at 6; iterate intensive numbers/ICP; stamp weekly ritual — docs/company-os/instance/WEEKLY-SNAPSHOT-2026-08-06.md', 'ivelin@pirin.ai'),
    (iid, 'hold', '2026-08-17T00:00:00Z', 'Hold journey at 6; self-serve install is the door; 3 paid deposits to open a cohort; 0 paid by 2026-09-16 holds intensive as primary — docs/company-os/instance/WEEKLY-SNAPSHOT-2026-08-17.md', 'ivelin@pirin.ai');
  PERFORM bootstrap_os.emit_audit(cid, iid, 'ivelin@pirin.ai', 'import', jsonb_build_object('op', 'import', 'source', 'pirin-ai/company/state/company-state.json'));

  -- totbox from ~/totboxapp/company/state/company-state.json
  cid := public.bootstrap_os_import_ensure('totbox');
  UPDATE bootstrap_os.ideas SET
    journey_phase = 6, loop_stage = 4, current_gate = 'hold',
    scoreboard = jsonb_build_object(
      'schema_version', 1,
      'readyForHumanEyes', jsonb_build_object('status', 'unknown'),
      'autonomyPosture', 'strict',
      'openQuestions', jsonb_build_array(
        'What numbers must a real job hit before we build more?',
        'When is the next real household job, with a short honest write-up after?',
        'When is the next weekly “where do we stand?” check-in?',
        'Is Ready for human eyes green before any mentor “try this product” ask?'
      ),
      'lastAction', 'ready_for_human_eyes:unknown',
      'constraint_this_week', 'Engineering tests look good. That is not proof people will pay or that real jobs get easier. Real household jobs still needed.'
    ),
    updated_at = now()
  WHERE company_id = cid AND slug = 'default'
  RETURNING id INTO iid;
  PERFORM bootstrap_os.emit_audit(cid, iid, 'ivelin@pirin.ai', 'import', jsonb_build_object('op', 'import', 'source', 'totboxapp/company/state/company-state.json'));

  -- zk0: no company-state.json. Hold note only. Do not copy README Beta.
  cid := public.bootstrap_os_import_ensure('zk0');
  UPDATE bootstrap_os.ideas SET
    journey_phase = 1, loop_stage = 1, current_gate = 'hold',
    scoreboard = jsonb_build_object(
      'schema_version', 1,
      'readyForHumanEyes', jsonb_build_object('status', 'unknown'),
      'autonomyPosture', 'strict',
      'openQuestions', jsonb_build_array(
        'What experiment makes zk0 community contribution tangible (not only stars/views)?'
      ),
      'lastAction', 'hold_zk0_full_bootstrap_os_instance',
      'constraint_this_week', 'Community engagement that produces tangible project progress — not only stars, views, or cool-topic interest.'
    ),
    updated_at = now()
  WHERE company_id = cid AND slug = 'default'
  RETURNING id INTO iid;
  INSERT INTO bootstrap_os.gate_events (idea_id, action, at, why, who) VALUES
    (iid, 'hold', '2026-08-06T21:27:49Z', 'Hold full zk0 Bootstrap OS instance; Iterate engagement model. Same OS filter as Totbox/Pirin. Real contribution not passed. traces/decisions/2026-08-06-hold-zk0-bootstrap-os-instance.md', 'ivelin@pirin.ai');
  PERFORM bootstrap_os.emit_audit(cid, iid, 'ivelin@pirin.ai', 'import', jsonb_build_object('op', 'import', 'source', 'pirin-ai/traces/decisions/2026-08-06-hold-zk0-bootstrap-os-instance.md'));
END $$;
