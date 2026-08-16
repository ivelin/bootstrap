let meta = #{
    name: "user-research",
    description: "Synthetic ICP filter: N peers (default 3), parallel score+dialogue, binary verdict, founder gate",
    when_to_use: "Rank ICP candidates before real tests; diversity sample; iterate until agree_ready or kill",
    phases: [
        #{ title: "Context", detail: "Thesis + tried set + founder notes" },
        #{ title: "Propose", detail: "N diverse ICP peers (keep strong_fit + new axes)" },
        #{ title: "Scorecards", detail: "Reward/risk scores (parallel)" },
        #{ title: "Synthetic", detail: "Forced choice + one condition change (parallel)" },
        #{ title: "Challenge", detail: "Adversarial rank + ready flag" },
        #{ title: "Report", detail: "ROUND report + FOUNDER_FEEDBACK template" },
        #{ title: "Founder gate", detail: "iterate | agree_ready | kill" },
    ],
};

// args: mode=round|status, round_label, founder_notes, max_rounds(1-5), slate_n(3-10, default 3)

let RULES = "";
RULES += "PUBLIC-SAFE: no real names, emails, phones, street addresses, personal zips.\n";
RULES += "SYNTHETIC is a filter; may rank or kill; not PMF. Real jobs still required later.\n";
RULES += "Weigh stated / synthetic / observed. House rule: observed wins a clash. A spoken yes cannot promote.\n";
RULES += "Seed from legal adjacent traces (public forums, substitute/competitor reviews, founder prior-domain notes).\n";
RULES += "  No PII. Not a former employer's private list. Do not import another company's market.\n";
RULES += "  If none, write none yet. A thesis-only persona is weaker.\n";
RULES += "Same forced choice for all groups, in decision order, then change ONE condition\n";
RULES += "  (price, time, or current alternative).\n";
RULES += "Do not ask a 1–5 or a naked dollar WTP — a choice or a sentence, then map. Mapping may still produce a dollar. Never ask a Likert.\n";
RULES += "If sim answers are too uniform (too-tight variance) or the same prompt drifted vs a human handful,\n";
RULES += "  that synthetic pass is unusable.\n";
RULES += "A new category / no prior survey in this category cannot be rescued by fine-tuning on some other survey.\n";
RULES += "  Most Day-0 ideas are this case.\n";
RULES += "THESIS: read from instance thesis.md if present. Do not invent a product thesis.\n";
RULES += "VERDICT binary only: strong_fit = real-test shortlist | weak_fit = out this round.\n";
RULES += "  Uncertain → weak_fit. Promote stays hold until observed exists.\n";
RULES += "  Forbidden: promote_lean, demote-as-verdict, poor_fit, unclear.\n";
RULES += "AUDIENCE: teenage solo founders using Company OS. Write plain English a sharp 16-year-old\n";
RULES += "  can skim. No dense jargon piles. Prefer everyday words over score jargon.\n";
RULES += "RATIONALE (verdict_key_factors) style — required for the table column:\n";
RULES += "  - One short sentence, max ~20 words. One idea: why this verdict.\n";
RULES += "  - Pattern: \"Keep — …\" if strong_fit, or \"Out — …\" if weak_fit.\n";
RULES += "  - Say what a founder would feel/do, not score names (avoid: channel_fit, TTS, WTP,\n";
RULES += "    LTV, SaaS gravity, pay_or_act as unexplained jargon).\n";
RULES += "  - OK plain words: email, phone, partner, budget, hard to reach, few jobs a year,\n";
RULES += "    other apps already win, people won't pay, takes too long to learn.\n";
RULES += "  - Good: \"Keep — one person can decide fast; still unproven if they'll pay.\"\n";
RULES += "  - Good: \"Out — too much like big software; too hard to get a first customer.\"\n";
RULES += "pay_or_act_score (if used) is a mapped 0–1 from the forced choice — NOT a naked dollar or Likert asked of the sim.\n";

let DIVERSITY = "";
DIVERSITY += "DIVERSITY SAMPLING (anti-infinite similar weak_fits):\n";
DIVERSITY += "1) EXCLUDE: never re-propose ids already tried as slate members unless KEEP list.\n";
DIVERSITY += "2) KEEP strong_fit peers as re-scored equals (not automatic winners).\n";
DIVERSITY += "3) Each NEW challenger MUST set diversity_axis + diversity_value (primary stress only):\n";
DIVERSITY += "   axes (MECE): buyer_seat | cadence | channel | monetization | vertical | ops_context\n";
DIVERSITY += "   GENERIC example values (do not invent a market; pick from thesis or these):\n";
DIVERSITY += "     buyer_seat: single_dm | dual_approver | team_buyer | coordinator | end_user | budget_owner\n";
DIVERSITY += "     cadence: recurring | episodic | seasonal | emergency | continuous\n";
DIVERSITY += "     channel: email_first | phone_first | in_app | hybrid | in_person\n";
DIVERSITY += "     monetization: individual_user | team_budget | operator_payer | partner | usage\n";
DIVERSITY += "     vertical: from_thesis | unspecified | adjacent_substitute\n";
DIVERSITY += "     ops_context: urban | rural | remote | multi_site | first_time | ongoing\n";
DIVERSITY += "4) Across NEW seats: diversity_value cells must be UNIQUE (no two NEW share same value).\n";
DIVERSITY += "5) Prefer unfilled cells from landscape gaps; do not clone prior weak_fits with new names.\n";
DIVERSITY += "6) Max 1 operator_payer; max 1 emergency cadence; max 1 phone_first channel.\n";

let mode = "round";
let round_label = "1";
let founder_notes = "";
let max_rounds = 4;
let slate_n = 3;

if args != () {
    if args.mode != () { mode = args.mode; }
    if args.round_label != () { round_label = args.round_label; }
    if args.founder_notes != () { founder_notes = args.founder_notes; }
    if args.max_rounds != () {
        let mr = args.max_rounds;
        if mr >= 1 && mr <= 5 { max_rounds = mr; }
    }
    if args.slate_n != () {
        let sn = args.slate_n;
        if sn >= 3 && sn <= 10 { slate_n = sn; }
    }
}
if mode != "round" && mode != "status" {
    pause("verification", "args.mode must be round | status");
}

let context_schema = #{
    "type": "object",
    "required": ["thesis_summary", "existing_icp_notes", "prior_feedback", "product_constraints", "tried_ids"],
    "properties": #{
        "thesis_summary": #{ "type": "string" },
        "existing_icp_notes": #{ "type": "string" },
        "prior_feedback": #{ "type": "string" },
        "product_constraints": #{ "type": "string" },
        "tried_ids": #{ "type": "string" },
    },
};

let propose_schema = #{
    "type": "object",
    "required": ["icps", "rationale", "diversity_map"],
    "properties": #{
        "rationale": #{ "type": "string" },
        "diversity_map": #{ "type": "string" },
        "icps": #{
            "type": "array", "minItems": 3, "maxItems": 10,
            "items": #{
                "type": "object",
                "required": [
                    "id", "name", "who", "pain", "job_to_be_done", "why_candidate",
                    "seat_role", "diversity_axis", "diversity_value", "prior_status"
                ],
                "properties": #{
                    "id": #{ "type": "string" },
                    "name": #{ "type": "string" },
                    "who": #{ "type": "string" },
                    "pain": #{ "type": "string" },
                    "job_to_be_done": #{ "type": "string" },
                    "why_candidate": #{ "type": "string" },
                    "seat_role": #{ "type": "string" },
                    "diversity_axis": #{ "type": "string" },
                    "diversity_value": #{ "type": "string" },
                    "prior_status": #{ "type": "string" },
                },
            },
        },
    },
};

let scorecard_schema = #{
    "type": "object",
    "required": [
        "icp_id", "icp_name", "reward_notes", "risk_notes",
        "willingness_stated", "willingness_synthetic",
        "pain_score", "pay_or_act_score", "reach_score",
        "risk_score", "time_to_signal_score", "kill_criteria"
    ],
    "properties": #{
        "icp_id": #{ "type": "string" },
        "icp_name": #{ "type": "string" },
        "reward_notes": #{ "type": "string" },
        "risk_notes": #{ "type": "string" },
        "willingness_stated": #{ "type": "string" },
        "willingness_synthetic": #{ "type": "string" },
        "pain_score": #{ "type": "number" },
        "pay_or_act_score": #{ "type": "number" },
        "reach_score": #{ "type": "number" },
        "risk_score": #{ "type": "number" },
        "time_to_signal_score": #{ "type": "number" },
        "kill_criteria": #{ "type": "string" },
    },
};

let synthetic_schema = #{
    "type": "object",
    "required": [
        "icp_id", "persona_sketch", "dialogue_summaries",
        "synthetic_verdict", "verdict_key_factors", "evidence_notes",
        "seed", "forced_choice", "condition_changed",
        "stated_evidence", "synthetic_evidence", "calibration", "new_category"
    ],
    "properties": #{
        "icp_id": #{ "type": "string" },
        "persona_sketch": #{ "type": "string" },
        "dialogue_summaries": #{ "type": "string" },
        "synthetic_verdict": #{ "type": "string" },
        "verdict_key_factors": #{ "type": "string" },
        "evidence_notes": #{ "type": "string" },
        "seed": #{ "type": "string" },
        "forced_choice": #{ "type": "string" },
        "condition_changed": #{ "type": "string" },
        "stated_evidence": #{ "type": "string" },
        "synthetic_evidence": #{ "type": "string" },
        "calibration": #{ "type": "string" },
        "new_category": #{ "type": "string" },
    },
};

let challenge_schema = #{
    "type": "object",
    "required": [
        "ranking_sound", "overclaimed", "missing_challengers",
        "recommended_rank_order", "ready_for_real_world_ai", "conditions", "diversity_ok"
    ],
    "properties": #{
        "ranking_sound": #{ "type": "boolean" },
        "overclaimed": #{ "type": "string" },
        "missing_challengers": #{ "type": "string" },
        "recommended_rank_order": #{ "type": "string" },
        "ready_for_real_world_ai": #{ "type": "boolean" },
        "conditions": #{ "type": "string" },
        "diversity_ok": #{ "type": "boolean" },
    },
};

let report_schema = #{
    "type": "object",
    "required": [
        "ok", "report_path", "feedback_path", "top3_summary",
        "primary_recommendation", "ai_ready_for_real_world", "message"
    ],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "report_path": #{ "type": "string" },
        "feedback_path": #{ "type": "string" },
        "top3_summary": #{ "type": "string" },
        "primary_recommendation": #{ "type": "string" },
        "ai_ready_for_real_world": #{ "type": "boolean" },
        "message": #{ "type": "string" },
    },
};

let feedback_schema = #{
    "type": "object",
    "required": ["decision", "notes", "file_found"],
    "properties": #{
        "decision": #{ "type": "string" },
        "notes": #{ "type": "string" },
        "file_found": #{ "type": "boolean" },
    },
};

let status_out_schema = #{
    "type": "object",
    "required": ["has_report", "has_feedback", "ready_marker", "summary"],
    "properties": #{
        "has_report": #{ "type": "boolean" },
        "has_feedback": #{ "type": "boolean" },
        "ready_marker": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
    },
};

// Generic placeholders only — fill from THIS instance thesis. Do not invent a market.
let seed_icps = [
    #{
        id: "candidate-a",
        name: "Candidate A (from thesis — do not invent a market)",
        who: "First distinct buyer seat named in the instance thesis, or none yet",
        pain: "The pain the thesis names for this seat — or none yet",
        job_to_be_done: "The job the thesis names — do not invent a product",
        why_candidate: "Day-0 default seat A (buyer_seat)",
        seat_role: "user",
        diversity_axis: "buyer_seat",
        diversity_value: "single_dm",
        prior_status: "new",
    },
    #{
        id: "candidate-b",
        name: "Candidate B (from thesis — do not invent a market)",
        who: "Second group in the thesis, stressing a different cadence, or none yet",
        pain: "A different timing or burst of the same job — or none yet",
        job_to_be_done: "Same job under a different cadence — do not invent a product",
        why_candidate: "Day-0 default seat B (cadence)",
        seat_role: "user",
        diversity_axis: "cadence",
        diversity_value: "episodic",
        prior_status: "new",
    },
    #{
        id: "candidate-c",
        name: "Candidate C (from thesis — do not invent a market)",
        who: "Third group in the thesis, stressing a different channel, or none yet",
        pain: "Same job reached a different way — or none yet",
        job_to_be_done: "Same job on a different channel — do not invent a product",
        why_candidate: "Day-0 default seat C (channel)",
        seat_role: "user",
        diversity_axis: "channel",
        diversity_value: "email_first",
        prior_status: "new",
    },
    #{
        id: "candidate-d",
        name: "Candidate D (from thesis — do not invent a market)",
        who: "A budget-owner or team-payer variant from the thesis, or none yet",
        pain: "Who pays vs who uses — or none yet",
        job_to_be_done: "Same job with a different payer — do not invent a product",
        why_candidate: "Optional seat D (monetization)",
        seat_role: "payer",
        diversity_axis: "monetization",
        diversity_value: "team_budget",
        prior_status: "new",
    },
    #{
        id: "candidate-e",
        name: "Candidate E (from thesis — do not invent a market)",
        who: "A remote or multi-site ops variant from the thesis, or none yet",
        pain: "Distance / coordination cost — or none yet",
        job_to_be_done: "Same job under a different ops context — do not invent a product",
        why_candidate: "Optional seat E (ops_context)",
        seat_role: "user",
        diversity_axis: "ops_context",
        diversity_value: "remote",
        prior_status: "new",
    },
    #{
        id: "candidate-f",
        name: "Candidate F (from thesis — do not invent a market)",
        who: "A coordinator / helper seat from the thesis, or none yet",
        pain: "Doing the job for someone else — or none yet",
        job_to_be_done: "Same job as a coordinator — do not invent a product",
        why_candidate: "Optional seat F (buyer_seat coordinator)",
        seat_role: "user",
        diversity_axis: "buyer_seat",
        diversity_value: "coordinator",
        prior_status: "new",
    },
    #{
        id: "candidate-g",
        name: "Candidate G (from thesis — do not invent a market)",
        who: "A seasonal variant from the thesis, or none yet",
        pain: "Windows that open and close — or none yet",
        job_to_be_done: "Same job on a seasonal cadence — do not invent a product",
        why_candidate: "Optional seat G (cadence seasonal)",
        seat_role: "user",
        diversity_axis: "cadence",
        diversity_value: "seasonal",
        prior_status: "new",
    },
    #{
        id: "candidate-h",
        name: "Candidate H (from thesis — do not invent a market)",
        who: "An in-app or product-native channel variant, or none yet",
        pain: "They already live in another tool — or none yet",
        job_to_be_done: "Same job in-app — do not invent a product",
        why_candidate: "Optional seat H (channel in_app)",
        seat_role: "user",
        diversity_axis: "channel",
        diversity_value: "in_app",
        prior_status: "new",
    },
    #{
        id: "candidate-i",
        name: "Candidate I (from thesis — do not invent a market)",
        who: "An adjacent-substitute vertical from the thesis, or none yet",
        pain: "They already buy a substitute — or none yet",
        job_to_be_done: "Same job vs the substitute — do not invent a product",
        why_candidate: "Optional seat I (vertical adjacent_substitute)",
        seat_role: "user",
        diversity_axis: "vertical",
        diversity_value: "adjacent_substitute",
        prior_status: "new",
    },
    #{
        id: "candidate-j",
        name: "Candidate J (from thesis — do not invent a market)",
        who: "A first-time / never-done-this-before ops variant, or none yet",
        pain: "No prior habit — or none yet",
        job_to_be_done: "Same job as a first-timer — do not invent a product",
        why_candidate: "Optional seat J (ops_context first_time)",
        seat_role: "user",
        diversity_axis: "ops_context",
        diversity_value: "first_time",
        prior_status: "new",
    },
];

fn icp_field(ic, key, fallback) {
    if ic == () { return fallback; }
    if key == "id" && ic.id != () { return ic.id; }
    if key == "name" && ic.name != () { return ic.name; }
    if key == "who" && ic.who != () { return ic.who; }
    if key == "pain" && ic.pain != () { return ic.pain; }
    if key == "job" && ic.job_to_be_done != () { return ic.job_to_be_done; }
    if key == "seat_role" && ic.seat_role != () { return ic.seat_role; }
    if key == "diversity_axis" && ic.diversity_axis != () { return ic.diversity_axis; }
    if key == "diversity_value" && ic.diversity_value != () { return ic.diversity_value; }
    if key == "prior_status" && ic.prior_status != () { return ic.prior_status; }
    fallback
}

fn take_n(list, seed, n) {
    if list == () || list.len() < n { return seed; }
    if list.len() == n { return list; }
    let out = [];
    let i = 0;
    while i < n {
        out.push(list[i]);
        i += 1;
    }
    out
}

if mode == "status" {
    phase("Context");
    let sp = "";
    sp += "Read-only status of user-research for THIS instance. Use tools; do not invent files.\n";
    sp += "Resolve: research/icps/ if present, else templates/research/icps/.\n";
    sp += "State: company/state/company-state.json if present, else templates/company/state/company-state.json.\n";
    sp += "Check: research/icps/README.md, latest ROUND_*_report.md, FOUNDER_FEEDBACK.md,\n";
    sp += "READY_FOR_REAL_WORLD.md, company-state.json.\n";
    sp += "Return has_report, has_feedback, ready_marker, short summary.\n";
    sp += RULES;
    let st = agent(sp, #{
        label: "ur-status",
        capability_mode: "read-only",
        output_schema: status_out_schema,
    });
    if st == () || !st.success || st.output == () {
        pause("infra", "user-research status agent failed");
    }
    let sum = "status ok";
    let hr = false;
    let hf = false;
    let rm = false;
    if st.output.summary != () { sum = st.output.summary; }
    if st.output.has_report == true { hr = true; }
    if st.output.has_feedback == true { hf = true; }
    if st.output.ready_marker == true { rm = true; }
    let report = "# User research status\n\n" + sum + "\n\n";
    report += "- has_report: " + hr.to_string() + "\n";
    report += "- has_feedback: " + hf.to_string() + "\n";
    report += "- ready_marker: " + rm.to_string() + "\n";
    let p = write_scratch_file("user-research-status.md", report);
    complete(#{
        mode: "status", path: p,
        has_report: hr, has_feedback: hf, ready_marker: rm, summary: sum,
    });
}

let round_i = 1;
let last_notes = founder_notes;
let last_primary = "";
let last_top3 = "";
let last_report_path = "";
let ai_ready = false;

while true {
    if round_i > max_rounds {
        await_user(
            "user",
            "max_rounds hit. Edit research/icps/FOUNDER_FEEDBACK.md then re-launch with higher max_rounds or agree_ready."
        );
        pause("verification", "Re-launch user-research after founder decision.");
    }

    let this_label = round_label;
    if round_i > 1 {
        this_label = round_label + "-r" + round_i.to_string();
    }
    log("user-research round " + round_i.to_string() + " label=" + this_label + " slate_n=" + slate_n.to_string());

    phase("Context");
    let ctx_p = "";
    ctx_p += "Load user-research context for THIS instance. Tools only; do not invent missing files.\n";
    ctx_p += "Do not invent a product thesis. Do not import another company's market.\n";
    ctx_p += "Resolve paths:\n";
    ctx_p += "- Thesis: docs/company-os/instance/thesis.md if present, else templates/instance/thesis.md\n";
    ctx_p += "- Docs: docs/company-os/ if present, else company-os/\n";
    ctx_p += "- Research: research/icps/ if present, else templates/research/icps/\n";
    ctx_p += "- State: company/state/company-state.json if present, else templates/company/state/company-state.json\n";
    ctx_p += "Read thesis.md (if present). If it is still a blank template, thesis_summary = thesis is blank — do not invent a market.\n";
    ctx_p += "Read company-os/operating-system.md synthetic + reward/risk section if present.\n";
    ctx_p += "Read research/icps/README.md + ALL ROUND_*_report.md + FOUNDER_FEEDBACK.md if present.\n";
    ctx_p += "Discover tried ICP ids by listing research/icps/*.md (and templates/research/icps/*.md if that is the layout).\n";
    ctx_p += "Do not hardcode ids. If none, tried_ids = none yet.\n";
    ctx_p += "Round: " + this_label + " slate_n=" + slate_n.to_string() + "\n";
    if last_notes != "" { ctx_p += "Founder notes:\n" + last_notes + "\n"; }
    ctx_p += "Return short: thesis_summary, existing_icp_notes, prior_feedback,\n";
    ctx_p += "product_constraints, tried_ids (comma list of ids already slated, or none yet).\n";
    ctx_p += RULES;

    let ctx = agent(ctx_p, #{
        label: "ur-context-" + round_i.to_string(),
        capability_mode: "read-only",
        output_schema: context_schema,
    });

    let thesis_s = "";
    let existing_s = "";
    let prior_s = "";
    let constr_s = "";
    let tried_s = "none yet";
    if ctx != () && ctx.success && ctx.output != () {
        if ctx.output.thesis_summary != () { thesis_s = ctx.output.thesis_summary; }
        if ctx.output.existing_icp_notes != () { existing_s = ctx.output.existing_icp_notes; }
        if ctx.output.prior_feedback != () { prior_s = ctx.output.prior_feedback; }
        if ctx.output.product_constraints != () { constr_s = ctx.output.product_constraints; }
        if ctx.output.tried_ids != () { tried_s = ctx.output.tried_ids; }
    } else {
        log("context weak; continuing");
    }

    phase("Propose");
    let prop_p = "";
    prop_p += "Propose exactly " + slate_n.to_string() + " peer ICPs for synthetic validation.\n";
    prop_p += "Do not invent a product thesis. Use only the instance thesis and founder notes.\n";
    prop_p += "Thesis:\n" + thesis_s + "\nExisting:\n" + existing_s + "\n";
    prop_p += "Prior feedback:\n" + prior_s + "\nConstraints:\n" + constr_s + "\n";
    prop_p += "Tried ids (from listing research/icps/*.md — do not recycle as NEW):\n" + tried_s + "\n";
    if last_notes != "" { prop_p += "Founder notes (honor KEEP/DROP):\n" + last_notes + "\n"; }
    prop_p += DIVERSITY;
    prop_p += "Slate construction:\n";
    prop_p += "- Exactly " + slate_n.to_string() + " ICPs.\n";
    prop_p += "- KEEP any prior strong_fit from existing ROUND reports (re-score peers; prior_status=keep).\n";
    prop_p += "- If none, all seats are NEW (prior_status=new).\n";
    prop_p += "- Remaining seats: NEW only. Never re-use tried ids as new.\n";
    prop_p += "- Each ICP: id, name, who, pain, job_to_be_done, why_candidate,\n";
    prop_p += "  seat_role (user|payer|payer_hybrid|channel_control),\n";
    prop_p += "  diversity_axis, diversity_value, prior_status (keep|new).\n";
    prop_p += "- diversity_map: one line per NEW: value → id (prove unique cells).\n";
    prop_p += "- rationale: why this slate covers orthogonal axes vs past weak_fits.\n";
    prop_p += "- No verdict yet. " + RULES;

    let prop = agent(prop_p, #{
        label: "ur-propose-" + round_i.to_string(),
        capability_mode: "read-only",
        output_schema: propose_schema,
    });

    let icps = seed_icps;
    let propose_rationale = "seed slate (propose incomplete — generic placeholders, not a baked market)";
    let diversity_map = "seed diversity map";
    if prop != () && prop.success && prop.output != () && prop.output.icps != () {
        if prop.output.icps.len() >= slate_n {
            icps = take_n(prop.output.icps, seed_icps, slate_n);
            if prop.output.rationale != () { propose_rationale = prop.output.rationale; }
            else { propose_rationale = "agent slate"; }
            if prop.output.diversity_map != () { diversity_map = prop.output.diversity_map; }
        } else {
            log("propose n=" + prop.output.icps.len().to_string() + " < slate_n; seed");
        }
    } else {
        log("propose failed; seed");
    }
    icps = take_n(icps, seed_icps, slate_n);
    log("slate n=" + icps.len().to_string() + " diversity_map=" + diversity_map);

    phase("Scorecards");
    let score_jobs = [];
    let si = 0;
    while si < icps.len() {
        let ic = icps[si];
        let ic_id = icp_field(ic, "id", "icp-" + si.to_string());
        let ic_name = icp_field(ic, "name", "unnamed");
        let sc_p = "";
        sc_p += "Score ONE ICP (solo-founder bootstrap). Do not invent a product.\n";
        sc_p += "id=" + ic_id + " name=" + ic_name + "\n";
        sc_p += "who=" + icp_field(ic, "who", "") + "\n";
        sc_p += "pain=" + icp_field(ic, "pain", "") + "\n";
        sc_p += "job=" + icp_field(ic, "job", "") + "\n";
        sc_p += "seat_role=" + icp_field(ic, "seat_role", "") + "\n";
        sc_p += "axis=" + icp_field(ic, "diversity_axis", "") + " value=" + icp_field(ic, "diversity_value", "") + "\n";
        sc_p += "thesis:\n" + thesis_s + "\n";
        sc_p += "Keep reward_notes + risk_notes + kill_criteria (concrete, plain English).\n";
        sc_p += "willingness_stated: what they SAID (pain, substitute, objection, a yes) — label stated.\n";
        sc_p += "willingness_synthetic: what they CHOSE after one condition change — label synthetic.\n";
        sc_p += "Scores 0–1 if useful: pain, reach, risk (higher=riskier), time_to_signal (higher=faster).\n";
        sc_p += "pay_or_act_score is a mapped 0–1 from the forced choice — NOT a naked dollar or Likert asked of the sim.\n";
        sc_p += "Do not ask a 1–5 or a naked dollar WTP. Set icp_id/icp_name. No verdict.\n";
        sc_p += RULES;
        score_jobs.push(#{
            prompt: sc_p,
            label: "ur-score-" + round_i.to_string() + "-" + si.to_string(),
            capability_mode: "read-only",
            output_schema: scorecard_schema,
        });
        si += 1;
    }

    let score_results = parallel(score_jobs);
    let scorecards = [];
    let sj = 0;
    while sj < score_results.len() {
        let sr = score_results[sj];
        if sr != () && sr.success && sr.output != () {
            scorecards.push(sr.output);
        } else {
            log("score fail idx=" + sj.to_string());
            scorecards.push(#{
                icp_id: "unknown-" + sj.to_string(),
                icp_name: "score-failed",
                reward_notes: "score failed",
                risk_notes: "unscored",
                willingness_stated: "none yet",
                willingness_synthetic: "none yet",
                pain_score: 0.0,
                pay_or_act_score: 0.0,
                reach_score: 0.0,
                risk_score: 1.0,
                time_to_signal_score: 0.0,
                kill_criteria: "no scorecard",
            });
        }
        sj += 1;
    }

    phase("Synthetic");
    let syn_jobs = [];
    let yi = 0;
    while yi < icps.len() {
        let ic2 = icps[yi];
        let id2 = icp_field(ic2, "id", "icp-" + yi.to_string());
        let sc_blob = "";
        if yi < scorecards.len() { sc_blob = json_encode(scorecards[yi]); }

        let sy_p = "";
        sy_p += "Synthetic research for ONE ICP. Willing to falsify. Do not invent a product.\n";
        sy_p += "id=" + id2 + " name=" + icp_field(ic2, "name", "") + "\n";
        sy_p += "who=" + icp_field(ic2, "who", "") + "\n";
        sy_p += "pain=" + icp_field(ic2, "pain", "") + "\n";
        sy_p += "job=" + icp_field(ic2, "job", "") + "\n";
        sy_p += "seat_role=" + icp_field(ic2, "seat_role", "") + "\n";
        sy_p += "axis=" + icp_field(ic2, "diversity_axis", "") + " value=" + icp_field(ic2, "diversity_value", "") + "\n";
        sy_p += "scorecard:\n" + sc_blob + "\n";
        sy_p += "Run a forced choice that looks like the real decision, in the order they would face it.\n";
        sy_p += "Then change ONE condition (price, time, or current alternative).\n";
        sy_p += "Write what they said (stated) and what they chose after the change (synthetic).\n";
        sy_p += "Never ask a 1–5 or a naked dollar WTP — a choice or a sentence, then map. Never ask a Likert.\n";
        sy_p += "Output:\n";
        sy_p += "1) persona_sketch — who they are in plain words (not a real person)\n";
        sy_p += "2) dialogue_summaries — discovery | offer | objection (plain English)\n";
        sy_p += "3) seed — legal adjacent traces used, or none yet\n";
        sy_p += "4) forced_choice — the same choice offered to every group\n";
        sy_p += "5) condition_changed — price | time | current alternative\n";
        sy_p += "6) stated_evidence — their words (pain, substitute, objection, a yes)\n";
        sy_p += "7) synthetic_evidence — who folded / who still chose you after the change\n";
        sy_p += "8) calibration — rank-order match | too-tight | drift | not yet\n";
        sy_p += "9) new_category — yes | no (yes = weaker; prior-survey calibration will not save it)\n";
        sy_p += "10) synthetic_verdict — strong_fit | weak_fit only (uncertain→weak_fit). Promote stays hold.\n";
        sy_p += "11) verdict_key_factors — HUMAN Rationale: one short \"Keep — …\" or \"Out — …\" sentence\n";
        sy_p += "12) evidence_notes — what a real trial must prove or kill (plain English)\n";
        sy_p += "If calibration is too-tight or drift, this pass is unusable — verdict weak_fit.\n";
        sy_p += "Set icp_id=" + id2 + ". " + RULES;

        syn_jobs.push(#{
            prompt: sy_p,
            label: "ur-synth-" + round_i.to_string() + "-" + yi.to_string(),
            capability_mode: "read-only",
            output_schema: synthetic_schema,
        });
        yi += 1;
    }

    let syn_results = parallel(syn_jobs);
    let synthetics = [];
    let yj = 0;
    while yj < syn_results.len() {
        let yr = syn_results[yj];
        if yr != () && yr.success && yr.output != () {
            let o = yr.output;
            let verdict = "weak_fit";
            if o.synthetic_verdict == "strong_fit" { verdict = "strong_fit"; }
            let cal = "not yet";
            if o.calibration != () { cal = o.calibration; }
            if cal == "too-tight" || cal == "drift" {
                verdict = "weak_fit";
            }
            let persona = "";
            let dialogues = "";
            let factors = "";
            let evidence = "";
            let oid = "unknown-" + yj.to_string();
            let seed_s = "none yet";
            let fc = "";
            let cond = "";
            let stated = "";
            let syn_ev = "";
            let newcat = "yes";
            if o.icp_id != () { oid = o.icp_id; }
            if o.persona_sketch != () { persona = o.persona_sketch; }
            if o.dialogue_summaries != () { dialogues = o.dialogue_summaries; }
            if o.verdict_key_factors != () { factors = o.verdict_key_factors; }
            if o.evidence_notes != () { evidence = o.evidence_notes; }
            if o.seed != () { seed_s = o.seed; }
            if o.forced_choice != () { fc = o.forced_choice; }
            if o.condition_changed != () { cond = o.condition_changed; }
            if o.stated_evidence != () { stated = o.stated_evidence; }
            if o.synthetic_evidence != () { syn_ev = o.synthetic_evidence; }
            if o.new_category != () { newcat = o.new_category; }
            synthetics.push(#{
                icp_id: oid,
                persona_sketch: persona,
                dialogue_summaries: dialogues,
                synthetic_verdict: verdict,
                verdict_key_factors: factors,
                evidence_notes: evidence,
                seed: seed_s,
                forced_choice: fc,
                condition_changed: cond,
                stated_evidence: stated,
                synthetic_evidence: syn_ev,
                calibration: cal,
                new_category: newcat,
            });
        } else {
            log("synth fail idx=" + yj.to_string());
            synthetics.push(#{
                icp_id: "unknown-" + yj.to_string(),
                persona_sketch: "n/a",
                dialogue_summaries: "synthetic failed",
                synthetic_verdict: "weak_fit",
                verdict_key_factors: "Out — research agent failed; treat as not ready.",
                evidence_notes: "Need a successful synthetic run before any real test.",
                seed: "none yet",
                forced_choice: "",
                condition_changed: "",
                stated_evidence: "",
                synthetic_evidence: "",
                calibration: "not yet",
                new_category: "yes",
            });
        }
        yj += 1;
    }

    phase("Challenge");
    let pack = #{
        icps: icps,
        scorecards: scorecards,
        synthetics: synthetics,
        propose_rationale: propose_rationale,
        diversity_map: diversity_map,
        thesis: thesis_s,
        founder_notes: last_notes,
        slate_n: slate_n,
    };
    let pack_json = json_encode(pack);

    let ch_p = "";
    ch_p += "Adversarial skeptic. Fail closed. Pack:\n" + pack_json + "\n";
    ch_p += "Return:\n";
    ch_p += "- ranking_sound: order justified by stated + synthetic evidence (not favorite). Observed wins a clash; none yet is fine.\n";
    ch_p += "- diversity_ok: true only if NEW seats use unique diversity_value cells and no tried-id recycle\n";
    ch_p += "- overclaimed / missing_challengers / conditions\n";
    ch_p += "- recommended_rank_order: best→worst; all strong_fit before weak_fit\n";
    ch_p += "- ready_for_real_world_ai: true only if ≥1 strong_fit worth shadow tests;\n";
    ch_p += "  default false if failures, zero strong_fit, diversity broken, too-tight/drift calibration, or beachhead unchallenged\n";
    ch_p += "A new category with none yet stays the weak case. Promote stays hold until observed exists.\n";
    ch_p += RULES + DIVERSITY;

    let chal = agent(ch_p, #{
        label: "ur-challenge-" + round_i.to_string(),
        capability_mode: "read-only",
        output_schema: challenge_schema,
    });

    let ranking_sound = false;
    let diversity_ok = false;
    let overclaimed = "challenge failed";
    let missing_ch = "";
    let rank_order = "unverified";
    let ready_ai = false;
    let conditions = "re-run challenge before real tests";
    if chal != () && chal.success && chal.output != () {
        if chal.output.ranking_sound == true { ranking_sound = true; }
        if chal.output.diversity_ok == true { diversity_ok = true; }
        if chal.output.overclaimed != () { overclaimed = chal.output.overclaimed; }
        if chal.output.missing_challengers != () { missing_ch = chal.output.missing_challengers; }
        if chal.output.recommended_rank_order != () { rank_order = chal.output.recommended_rank_order; }
        if chal.output.ready_for_real_world_ai == true { ready_ai = true; }
        if chal.output.conditions != () { conditions = chal.output.conditions; }
    } else {
        log("challenge failed → ready=false");
        ready_ai = false;
    }
    if !diversity_ok {
        log("diversity_ok=false; ready forced false");
        ready_ai = false;
    }
    ai_ready = ready_ai;

    phase("Report");
    let rep_p = "";
    rep_p += "Write ROUND report + gate template. Write tools. Round=" + this_label + "\n";
    rep_p += "slate_n=" + slate_n.to_string() + " ready=" + ready_ai.to_string() + "\n";
    rep_p += "ranking_sound=" + ranking_sound.to_string() + " diversity_ok=" + diversity_ok.to_string() + "\n";
    rep_p += "rank_order: " + rank_order + "\n";
    rep_p += "overclaimed: " + overclaimed + "\n";
    rep_p += "missing_challengers: " + missing_ch + "\n";
    rep_p += "conditions: " + conditions + "\n";
    rep_p += "diversity_map: " + diversity_map + "\n";
    rep_p += "pack:\n" + pack_json + "\n\n";
    rep_p += "Resolve RESEARCH: research/icps/ if present, else templates/research/icps/ (prefer instance).\n";
    rep_p += "WRITE:\n";
    rep_p += "1) research/icps/ROUND_" + this_label + "_report.md\n";
    rep_p += "   a) Header: SYNTHETIC ONLY, round, slate_n, ready, ranking_sound, diversity_ok\n";
    rep_p += "   b) Exec: ≤2 short plain-English paras (teen-founder readable) + FIRST table:\n";
    rep_p += "      Rank | ICP | seat_role | Synthetic verdict | Rationale\n";
    rep_p += "      All " + slate_n.to_string() + " rows. Verdict strong_fit|weak_fit only.\n";
    rep_p += "      Rationale MUST be humanized: one short \"Keep — …\" or \"Out — …\" sentence\n";
    rep_p += "      from verdict_key_factors (rewrite denser pack text into plain English).\n";
    rep_p += "   c) Diversity map table: diversity_value | ICP id | prior_status\n";
    rep_p += "   d) Method: same forced choice; one condition change; stated vs synthetic; seed or none yet\n";
    rep_p += "   e) Scorecard table (all N) — willingness notes labeled stated vs synthetic;\n";
    rep_p += "      pay_or_act_score is mapped 0–1, NOT a dollar or Likert\n";
    rep_p += "   f) Top 3 why in plain English; shortlist = strong_fit only; kill criteria\n";
    rep_p += "   g) Skeptic; next real tests if any strong_fit (plain English). Promote stays hold.\n";
    rep_p += "   h) Label SYNTHETIC ONLY\n";
    rep_p += "2) FOUNDER_FEEDBACK.md template (decision blank)\n";
    rep_p += "3) README.md latest pointer + same rank columns (+ optional Brief)\n";
    rep_p += "4) Optional briefs for strong_fit only\n";
    rep_p += "5) Do NOT write READY_FOR_REAL_WORLD.md\n";
    rep_p += "ai_ready_for_real_world must be " + ready_ai.to_string() + ".\n";
    rep_p += RULES;

    let rep = agent(rep_p, #{
        label: "ur-report-" + round_i.to_string(),
        capability_mode: "read-write",
        output_schema: report_schema,
    });

    let report_path = "research/icps/ROUND_" + this_label + "_report.md";
    let feedback_path = "research/icps/FOUNDER_FEEDBACK.md";
    let top3 = "";
    let primary = "";
    let rep_msg = "report done";
    if rep != () && rep.success && rep.output != () {
        if rep.output.report_path != () { report_path = rep.output.report_path; }
        if rep.output.feedback_path != () { feedback_path = rep.output.feedback_path; }
        if rep.output.top3_summary != () { top3 = rep.output.top3_summary; }
        if rep.output.primary_recommendation != () { primary = rep.output.primary_recommendation; }
        if rep.output.message != () { rep_msg = rep.output.message; }
        if rep.output.ai_ready_for_real_world == false { ai_ready = false; }
    } else {
        log("report agent failed");
    }
    last_report_path = report_path;
    last_top3 = top3;
    last_primary = primary;

    let scratch = "# Round " + this_label + " slate_n=" + slate_n.to_string() + "\n\n" + rep_msg + "\n\n";
    scratch += "- report: " + report_path + "\n";
    scratch += "- feedback: " + feedback_path + "\n";
    scratch += "- top3: " + top3 + "\n";
    scratch += "- primary: " + primary + "\n";
    scratch += "- ready: " + ai_ready.to_string() + " diversity_ok: " + diversity_ok.to_string() + "\n";
    scratch += "- rank: " + rank_order + "\n";
    let spath = write_scratch_file("user-research-round-" + this_label + ".md", scratch);

    phase("Founder gate");
    let gate_msg = "";
    gate_msg += "ROUND " + this_label + " complete (slate_n=" + slate_n.to_string() + ").\n";
    gate_msg += "Report: " + report_path + "\nScratch: " + spath + "\n";
    gate_msg += "AI ready: " + ai_ready.to_string() + " diversity_ok: " + diversity_ok.to_string() + "\n";
    gate_msg += "Primary: " + primary + "\nTop3: " + top3 + "\n\n";
    gate_msg += "Edit research/icps/FOUNDER_FEEDBACK.md:\n";
    gate_msg += "  decision: iterate | agree_ready | kill\n";
    gate_msg += "  notes: redirects (keep/drop must respect diversity cells)\n";
    gate_msg += "Then resume. agree_ready = OK for shadow real tests, not PMF. Promote stays hold until observed exists.\n";
    await_user("user", gate_msg);

    let fb_p = "";
    fb_p += "Read research/icps/FOUNDER_FEEDBACK.md. decision: iterate|agree_ready|kill.\n";
    fb_p += "Blank/missing → iterate, file_found=false. Copy notes.\n";
    let fb = agent(fb_p, #{
        label: "ur-feedback-" + round_i.to_string(),
        capability_mode: "read-only",
        output_schema: feedback_schema,
    });

    let decision = "iterate";
    let fb_notes = "";
    if fb != () && fb.success && fb.output != () {
        if fb.output.decision != () { decision = fb.output.decision; }
        if fb.output.notes != () { fb_notes = fb.output.notes; }
    }
    if decision != "iterate" && decision != "agree_ready" && decision != "kill" {
        log("bad decision → iterate");
        decision = "iterate";
    }
    if fb_notes != "" { last_notes = fb_notes; }
    log("decision=" + decision);

    if decision == "kill" {
        let kp = write_scratch_file(
            "user-research-killed.md",
            "# killed\nreport: " + last_report_path + "\nnotes: " + last_notes + "\n"
        );
        complete(#{
            mode: "round", outcome: "kill", path: kp,
            last_report: last_report_path, primary: last_primary, top3: last_top3,
            rounds_completed: round_i, message: "Founder kill",
        });
    }

    if decision == "agree_ready" {
        let ready_p = "";
        ready_p += "Founder agree_ready. Write research/icps/READY_FOR_REAL_WORLD.md:\n";
        ready_p += "- founder accepts strong_fit ICPs for shadow real tests\n";
        ready_p += "- primary: " + last_primary + "\n- top3: " + last_top3 + "\n";
        ready_p += "- report: " + last_report_path + "\n- AI ready was: " + ai_ready.to_string() + "\n";
        ready_p += "- not PMF; 3–5 instrumented shadow jobs + kill criteria\n";
        ready_p += "- promote stays hold until observed exists\n";
        ready_p += "Update README. " + RULES;
        ready_p += "Return report schema; ok=true.\n";

        let ready_w = agent(ready_p, #{
            label: "ur-ready-" + round_i.to_string(),
            capability_mode: "read-write",
            output_schema: report_schema,
        });
        let ready_msg = "agree_ready marker written";
        if ready_w != () && ready_w.success && ready_w.output != () && ready_w.output.message != () {
            ready_msg = ready_w.output.message;
        }
        let dp = write_scratch_file(
            "user-research-ready.md",
            "# agree_ready\n" + ready_msg + "\nreport: " + last_report_path + "\n"
        );
        complete(#{
            mode: "round", outcome: "agree_ready", path: dp,
            last_report: last_report_path, primary: last_primary, top3: last_top3,
            rounds_completed: round_i, ai_ready_for_real_world: ai_ready,
            ready_marker: "research/icps/READY_FOR_REAL_WORLD.md", message: ready_msg,
        });
    }

    log("iterate → next round");
    round_i += 1;
}

pause("verification", "user-research loop exited unexpectedly");
