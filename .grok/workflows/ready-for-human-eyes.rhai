let meta = #{
    name: "ready-for-human-eyes",
    description: "Fail-closed ship gate: cold happy path before mentor/user product-test asks (OS v2.8.6). Marketing volume cannot promote.",
    when_to_use: "Before asking anyone external to try a product link, beta, or interactive survey; when founder says ready for beta / please test this",
    phases: [
        #{ title: "Inspect", detail: "Read company state readyForHumanEyes + checklist" },
        #{ title: "Define path", detail: "Who + happy path + URL in plain language" },
        #{ title: "Cold check", detail: "Sandbox browser / synthetic cold user / evidence" },
        #{ title: "Gate", detail: "Set blocked or green; refuse ask-for-feedback if not green" },
    ],
};

// args.mode: "status" | "check" | "ask-for-feedback" (default status)
// args.url: optional product URL
// args.happy_path: optional plain-language path
// args.who: optional one-line ICP / user
// args.override: true only with founder explicit share-anyway (writes decision note)

let mode = "status";
let url = "";
let happy_path = "";
let who = "";
let override = false;

if args != () {
    if args.mode != () { mode = args.mode; }
    if args.url != () { url = args.url; }
    if args.happy_path != () { happy_path = args.happy_path; }
    if args.who != () { who = args.who; }
    if args.override == true { override = true; }
}

if mode != "status" && mode != "check" && mode != "ask-for-feedback" {
    pause("verification", "args.mode must be status | check | ask-for-feedback");
}

phase("Inspect");

let status_schema = #{
    "type": "object",
    "required": ["ready_status", "summary", "may_ask_for_feedback"],
    "properties": #{
        "ready_status": #{ "type": "string" },
        "summary": #{ "type": "string" },
        "may_ask_for_feedback": #{ "type": "boolean" },
        "blockers": #{ "type": "array", "items": #{ "type": "string" } },
        "recommended_next": #{ "type": "string" },
    },
};

let inspect_prompt = "";
inspect_prompt += "You are running the Company OS Ready-for-human-eyes gate (portable ship gate).\n";
inspect_prompt += "Resolve paths (do not invent files):\n";
inspect_prompt += "- STATE: company/state/company-state.json if present, else templates/company/state/company-state.json\n";
inspect_prompt += "- CHECKLIST: docs/company-os/ready-for-human-eyes.md if present, else company-os/ready-for-human-eyes.md\n";
inspect_prompt += "- EVIDENCE: product/READY_FOR_HUMAN_EYES.md if present, else templates/product/READY_FOR_HUMAN_EYES.md\n";
inspect_prompt += "Read with read_file (do not invent state):\n";
inspect_prompt += "1) company-state.json — field readyForHumanEyes\n";
inspect_prompt += "2) the checklist\n";
inspect_prompt += "3) product/READY_FOR_HUMAN_EYES.md if it exists\n";
inspect_prompt += "Report ready_status as unknown|blocked|green from state (default unknown if missing).\n";
inspect_prompt += "may_ask_for_feedback=true ONLY if ready_status is green. Fail-closed.\n";
inspect_prompt += "summary: plain English for a teenage founder. Blockers if any.\n";
inspect_prompt += "recommended_next: one of run_cold_check, fix_blockers, draft_feedback_ask, hold.\n";
inspect_prompt += "Never claim green without evidence path or recorded cold-path note in state.\n";
inspect_prompt += "Green is NOT demand, product-market fit, or willingness to pay.\n";

let insp = agent(inspect_prompt, #{
    label: "rfhe-inspect",
    capability_mode: "read-only",
    output_schema: status_schema,
});

if insp == () || !insp.success || insp.output == () {
    pause("infra", "Inspect agent failed; fix tools and resume.");
}

let ready_status = "unknown";
let may_ask = false;
let sum_s = "";
let rec_s = "hold";
if insp.output.ready_status != () { ready_status = insp.output.ready_status; }
if insp.output.may_ask_for_feedback == true { may_ask = true; }
if insp.output.summary != () { sum_s = insp.output.summary; }
if insp.output.recommended_next != () { rec_s = insp.output.recommended_next; }

log("Ready-for-human-eyes inspect: status=" + ready_status + " may_ask=" + may_ask.to_string());

if mode == "status" {
    let report = "";
    report += "# Ready for human eyes — status\n\n";
    report += sum_s + "\n\n";
    report += "- ready_status: " + ready_status + "\n";
    report += "- may_ask_for_feedback: " + may_ask.to_string() + "\n";
    report += "- recommended_next: " + rec_s + "\n\n";
    report += "Green ≠ demand / PMF / willingness to pay.\n\n";
    report += "To set status: edit company-state.json readyForHumanEyes.status (unknown|blocked|green)\n";
    report += "and write/update product/READY_FOR_HUMAN_EYES.md. Then re-run status.\n\n";
    report += "Checklist: company-os/ready-for-human-eyes.md (or docs/company-os/ copy).\n";
    report += "Workflow check: mode=check with url + happy_path\n";
    let p = write_scratch_file("ready-for-human-eyes-status.md", report);
    complete(#{
        action: "status",
        path: p,
        ready_status: ready_status,
        may_ask_for_feedback: may_ask,
        recommended_next: rec_s,
        summary: sum_s,
    });
}

if mode == "ask-for-feedback" {
    phase("Gate");
    if !may_ask && !override {
        let deny = "";
        deny += "# REFUSED: Ready for human eyes is not green\n\n";
        deny += "Do **not** draft mentor beta / try-my-link messages yet.\n\n";
        deny += "- Current status: **" + ready_status + "**\n";
        deny += "- Summary: " + sum_s + "\n\n";
        deny += "Next steps:\n";
        deny += "1. Run this workflow with `mode=check` and `url` + `happy_path`\n";
        deny += "2. Fix blockers (iframe, auth, JS, private URL)\n";
        deny += "3. Update company-state.json readyForHumanEyes.status to green and write product/READY_FOR_HUMAN_EYES.md\n";
        deny += "4. Re-run ask-for-feedback\n\n";
        deny += "Founder override to share a known-broken path: `override=true` + write a decision trace.\n";
        deny += "Green ≠ demand / PMF / willingness to pay.\n";
        let dp = write_scratch_file("ready-for-human-eyes-refused.md", deny);
        complete(#{
            action: "ask-for-feedback",
            ok: false,
            refused: true,
            path: dp,
            ready_status: ready_status,
            message: "REFUSED until green (or explicit override + decision trace).",
        });
    }

    let draft_prompt = "";
    draft_prompt += "Draft a short mentor/user feedback ask in plain English (email or chat).\n";
    draft_prompt += "Include the happy path steps and URL if known.\n";
    draft_prompt += "State that cold path was verified only if ready_status is green.\n";
    draft_prompt += "If override without green, clearly say this is a known early/broken path and what NOT to judge.\n";
    draft_prompt += "ready_status=" + ready_status + " who=" + who + " url=" + url + " happy_path=" + happy_path + "\n";
    draft_prompt += "No PII. Public-safe. Do not claim PMF, demand, or willingness to pay.\n";
    draft_prompt += "Return only the draft message body.\n";

    let draft = agent(draft_prompt, #{
        label: "rfhe-draft-ask",
        capability_mode: "read-only",
    });

    let body = "(draft incomplete — founder can write ask after green gate)";
    if draft != () && draft.success && draft.output != () {
        body = draft.output;
    }

    let ask_doc = "";
    ask_doc += "# Feedback ask draft\n\n";
    ask_doc += "- ready_status: " + ready_status + "\n";
    ask_doc += "- override: " + override.to_string() + "\n\n";
    ask_doc += body + "\n";
    let ap = write_scratch_file("ready-for-human-eyes-ask-draft.md", ask_doc);
    complete(#{
        action: "ask-for-feedback",
        ok: true,
        path: ap,
        ready_status: ready_status,
        override: override,
        message: "Draft written; founder sends only if still appropriate.",
    });
}

phase("Define path");
phase("Cold check");

let path_prompt = "";
path_prompt += "Company OS Ready-for-human-eyes CHECK (not demand proof). Green ≠ demand / PMF / WTP.\n";
path_prompt += "Founder inputs (use args; if missing, propose sensible defaults from product docs and say what is missing):\n";
path_prompt += "  who: " + who + "\n";
path_prompt += "  happy_path: " + happy_path + "\n";
path_prompt += "  url: " + url + "\n";
path_prompt += "Resolve: checklist at docs/company-os/ready-for-human-eyes.md or company-os/ready-for-human-eyes.md;\n";
path_prompt += "evidence at product/READY_FOR_HUMAN_EYES.md or templates/product/READY_FOR_HUMAN_EYES.md;\n";
path_prompt += "state at company/state/company-state.json or templates/company/state/company-state.json.\n";
path_prompt += "Produce and document a cold-path plan:\n";
path_prompt += "1) Exact steps a first-time user takes\n";
path_prompt += "2) What tools to use (sandbox browser, synthetic NL user, another device)\n";
path_prompt += "3) Fail criteria: JS console errors, iframe sandbox, auth/permission denials, blank UI\n";
path_prompt += "4) If URL is missing or localhost-only, recommend status=blocked with reason\n";
path_prompt += "Then EXECUTE what you can: open URL if tools allow, note blockers in plain English.\n";
path_prompt += "Write or update product/READY_FOR_HUMAN_EYES.md with status blocked|green|unknown, date, steps, blockers.\n";
path_prompt += "Update company-state.json readyForHumanEyes.status to match (and checkedAt / evidencePath / blockers if those fields exist).\n";
path_prompt += "PUBLIC-SAFE only (no PII, secrets).\n";
path_prompt += "Do NOT draft external feedback asks in this mode unless path is already green.\n";
path_prompt += "Say clearly: green is not demand, product-market fit, or willingness to pay.\n";

let check = agent(path_prompt, #{
    label: "rfhe-cold-check",
    capability_mode: "read-write",
});

phase("Gate");

if check == () || !check.success {
    pause("infra", "Cold-check agent failed; fix tools and resume.");
}

let check_body = "";
if check.output != () {
    check_body = check.output;
} else {
    check_body = "Cold-check agent returned no body; review product/READY_FOR_HUMAN_EYES.md and company-state.json readyForHumanEyes.";
}

let check_doc = "";
check_doc += "# Ready for human eyes — cold check\n\n";
check_doc += check_body + "\n\n";
check_doc += "Next: confirm company-state.json readyForHumanEyes.status and product/READY_FOR_HUMAN_EYES.md, then re-run status.\n";
check_doc += "Green ≠ demand / PMF / willingness to pay.\n";
let cp = write_scratch_file("ready-for-human-eyes-check.md", check_doc);
complete(#{
    action: "check",
    path: cp,
    message: "Cold-path check complete. Review evidence file and readyForHumanEyes.status.",
    prior_ready_status: ready_status,
});
