#!/bin/sh
# Day-0 checks for the Bootstrap OS template: blank state, schema, install
# refuse/copy, first-hour constitution links, and README adoption order.
# POSIX sh + python3 only. Exit 1 on any failure.

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

pass=0
fail=0

ok() {
  pass=$((pass + 1))
  printf 'ok - %s\n' "$1"
}

not_ok() {
  fail=$((fail + 1))
  printf 'not ok - %s\n' "$1"
}

TMP=$(mktemp -d)
cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT INT HUP TERM

# --- a) blank state: where-are-we.py exits 0 and prints JOURNEY + 1 / 9 ---
a_out="$TMP/where-are-we.out"
a_err="$TMP/where-are-we.err"
a_rc=0
python3 templates/company/state/where-are-we.py \
  templates/company/state/company-state.json \
  >"$a_out" 2>"$a_err" || a_rc=$?

if [ "$a_rc" -eq 0 ] \
  && grep -q 'JOURNEY' "$a_out" \
  && grep -q '1 / 9' "$a_out"; then
  ok "where-are-we.py on blank state (JOURNEY, 1 / 9)"
else
  not_ok "where-are-we.py on blank state (exit $a_rc)"
fi

# --- b) incomplete JSON + schema next to it must fail ---
bad="$TMP/bad-state"
mkdir -p "$bad"
printf '%s\n' '{"version":1}' >"$bad/company-state.json"
cp templates/company/state/company-state.schema.json "$bad/company-state.schema.json"
b_rc=0
python3 templates/company/state/where-are-we.py "$bad/company-state.json" \
  >/dev/null 2>&1 || b_rc=$?
if [ "$b_rc" -ne 0 ]; then
  ok "where-are-we.py rejects JSON missing required fields"
else
  not_ok "where-are-we.py should fail on incomplete state"
fi

# --- c) install refuses the template repo and a lookalike ---
c1_rc=0
./scripts/install-instance.sh "$ROOT" >/dev/null 2>&1 || c1_rc=$?
if [ "$c1_rc" -ne 0 ]; then
  ok "install-instance.sh refuses template ROOT"
else
  not_ok "install-instance.sh must refuse template ROOT"
fi

lookalike="$TMP/lookalike"
mkdir -p "$lookalike/company-os" "$lookalike/templates/instance"
printf '%s\n' '# lookalike constitution' >"$lookalike/company-os/operating-system.md"
c2_rc=0
./scripts/install-instance.sh "$lookalike" >/dev/null 2>&1 || c2_rc=$?
if [ "$c2_rc" -ne 0 ]; then
  ok "install-instance.sh refuses lookalike template"
else
  not_ok "install-instance.sh must refuse lookalike template"
fi

# --- d) install into a blank company repo ---
company="$TMP/company"
mkdir -p "$company"
d_rc=0
./scripts/install-instance.sh "$company" >"$TMP/install.out" 2>"$TMP/install.err" || d_rc=$?
if [ "$d_rc" -eq 0 ]; then
  ok "install-instance.sh into blank company"
else
  not_ok "install-instance.sh into blank company (exit $d_rc)"
fi

assert_exists() {
  rel=$1
  if [ -f "$company/$rel" ]; then
    ok "installed $rel"
  else
    not_ok "missing $rel"
  fi
}

assert_exists docs/company-os/first-hour.md
assert_exists docs/company-os/applied-here.md
assert_exists company/state/company-state.json
assert_exists company/state/company-state.schema.json
assert_exists company/state/where-are-we.py
assert_exists research/icps/TEMPLATE.md
assert_exists traces/decisions/TEMPLATE.md
assert_exists docs/company-os/instance/snapshots/TEMPLATE.md
assert_exists product/READY_FOR_HUMAN_EYES.md
assert_exists AGENTS.md
assert_exists .grok/workflows/README.md
assert_exists .grok/workflows/user-research.rhai
assert_exists .grok/workflows/company-operating-loop.rhai
assert_exists .grok/workflows/ready-for-human-eyes.rhai

if [ -f "$company/AGENTS.md" ] \
  && { grep -q 'Never advance a journey phase without' "$company/AGENTS.md" \
    || grep -q '<!-- bootstrap-os-ai-instructions -->' "$company/AGENTS.md"; }; then
  ok "AGENTS.md has hard-rule text or marker"
else
  not_ok "AGENTS.md missing hard-rule text and marker"
fi

w_rc=0
python3 "$company/company/state/where-are-we.py" >/dev/null 2>&1 || w_rc=$?
if [ "$w_rc" -eq 0 ]; then
  ok "installed where-are-we.py exits 0"
else
  not_ok "installed where-are-we.py (exit $w_rc)"
fi

# --- e) first-hour constitution links are GitHub blob URLs, not siblings ---
fh=company-os/first-hour.md
if [ -f "$fh" ] && grep -q 'https://github.com/ivelin/bootstrap' "$fh"; then
  ok "first-hour.md links to github.com/ivelin/bootstrap"
else
  not_ok "first-hour.md must contain https://github.com/ivelin/bootstrap"
fi

if grep -q '](operating-system.md)' "$fh" \
  || grep -q '](live-runtime.md)' "$fh" \
  || grep -q '](ai-instructions.md)' "$fh"; then
  not_ok "first-hour.md has sibling-only constitution links"
else
  ok "first-hour.md has no sibling-only constitution links"
fi

# --- f) README adoption order + hosted MCP honesty ---
if grep -q 'How to use this (pick one)' README.md; then
  ok "README has How to use this (pick one)"
else
  not_ok "README missing How to use this (pick one)"
fi

if grep -q '### 1. Point an AI at this pack' README.md; then
  ok "README has ### 1. Point an AI at this pack"
else
  not_ok "README missing ### 1. Point an AI at this pack"
fi

# "Point an AI" must appear before the install-script invocation.
if awk '
  /Point an AI/ { seen = 1 }
  /\.\/scripts\/install-instance\.sh/ {
    if (seen) exit 0
    exit 1
  }
  END { if (!seen) exit 1 }
' README.md; then
  ok "README: Point an AI appears before ./scripts/install-instance.sh"
else
  not_ok "README: Point an AI must appear before ./scripts/install-instance.sh"
fi

if grep -qi 'not mentee-ready' README.md \
  && grep -q 'plugin/' README.md \
  && grep -q 'Path 1 stays' README.md \
  && grep -q 'vercel.app' README.md \
  && ! grep -q 'https://mcp.pirin.ai' README.md; then
  ok "README hosted MCP honesty (preview vercel.app, not mentee-ready, not pirin.ai)"
else
  not_ok "README must stay honest: preview vercel.app host, not mentee-ready boards, not pirin.ai"
fi

# --- g) evidence-label refinements (stated / synthetic / observed) ---
if grep -q 'none yet' company-os/first-hour.md \
  && grep -q 'stated' company-os/first-hour.md; then
  ok "first-hour.md has none yet and stated"
else
  not_ok "first-hour.md must contain none yet and stated"
fi

if grep -q 'Stated evidence' templates/research/icps/TEMPLATE.md \
  && grep -q 'Observed evidence' templates/research/icps/TEMPLATE.md; then
  ok "icps TEMPLATE has Stated evidence and Observed evidence"
else
  not_ok "icps TEMPLATE must contain Stated evidence and Observed evidence"
fi

if grep -q 'When they disagree, observed wins' company-os/operating-system.md \
  || grep -q 'observed wins' company-os/operating-system.md; then
  ok "operating-system.md has observed wins"
else
  not_ok "operating-system.md must contain observed wins"
fi

if grep -q 'stated, synthetic, and observed' company-os/ai-instructions.md; then
  ok "ai-instructions.md has stated, synthetic, and observed"
else
  not_ok "ai-instructions.md must contain stated, synthetic, and observed"
fi

if grep -q 'stated | synthetic | observed' templates/traces/decisions/TEMPLATE.md; then
  ok "decisions TEMPLATE has stated | synthetic | observed"
else
  not_ok "decisions TEMPLATE must contain stated | synthetic | observed"
fi

# --- h) evidence-method locks (no naked 1-5/dollar WTP; variance/drift; new category) ---
if grep -q '1–5' company-os/first-hour.md \
  && grep -q 'then map' company-os/first-hour.md \
  && grep -q 'too uniform' company-os/first-hour.md \
  && grep -q 'New-category' company-os/first-hour.md; then
  ok "first-hour.md has no 1-5/naked-dollar, then map, too uniform, New-category"
else
  not_ok "first-hour.md must lock no 1-5/naked-dollar, then map, too uniform, New-category"
fi

if grep -q '1–5' company-os/operating-system.md \
  && grep -q 'then map' company-os/operating-system.md \
  && grep -q 'too-tight variance' company-os/operating-system.md \
  && grep -q 'unusable' company-os/operating-system.md \
  && grep -q 'new category' company-os/operating-system.md; then
  ok "operating-system.md has no 1-5/naked-dollar, too-tight variance, unusable, new category"
else
  not_ok "operating-system.md must lock no 1-5/naked-dollar, too-tight variance, unusable, new category"
fi

if grep -q 'then map' templates/research/icps/TEMPLATE.md \
  && grep -q 'too-tight variance' templates/research/icps/TEMPLATE.md \
  && grep -q 'unusable' templates/research/icps/TEMPLATE.md \
  && grep -q 'New category' templates/research/icps/TEMPLATE.md; then
  ok "icps TEMPLATE has then map, too-tight variance, unusable, New category"
else
  not_ok "icps TEMPLATE must lock then map, too-tight variance, unusable, New category"
fi

if grep -q 'Likert' company-os/ai-instructions.md \
  && grep -q 'then map' company-os/ai-instructions.md \
  && grep -q 'discard that pass' company-os/ai-instructions.md \
  && grep -q 'new category' company-os/ai-instructions.md; then
  ok "ai-instructions.md has Likert, then map, discard that pass, new category"
else
  not_ok "ai-instructions.md must lock Likert, then map, discard that pass, new category"
fi

if grep -q '1–5' company-os/live-runtime.md \
  && grep -q 'then map' company-os/live-runtime.md \
  && grep -q 'Too-tight variance' company-os/live-runtime.md \
  && grep -q 'unusable' company-os/live-runtime.md \
  && grep -q 'New category' company-os/live-runtime.md; then
  ok "live-runtime.md has no 1-5/naked-dollar, then map, Too-tight variance, unusable, New category"
else
  not_ok "live-runtime.md must lock no 1-5/naked-dollar, then map, Too-tight variance, unusable, New category"
fi


# --- i) optional Grok Build workflows (portable, de-productized) ---
wf=.grok/workflows
if [ -f "$wf/user-research.rhai" ]; then
  ok "user-research.rhai exists"
else
  not_ok "user-research.rhai missing"
fi
if [ -f "$wf/user-research.rhai" ] \
  && grep -q 'none yet' "$wf/user-research.rhai" \
  && { grep -q 'forced choice' "$wf/user-research.rhai" || grep -q 'forced_choice' "$wf/user-research.rhai"; } \
  && { grep -q '1–5' "$wf/user-research.rhai" || grep -q 'Likert' "$wf/user-research.rhai"; } \
  && { grep -q 'too-tight' "$wf/user-research.rhai" || grep -q 'too tight' "$wf/user-research.rhai"; } \
  && grep -q 'new category' "$wf/user-research.rhai"; then
  ok "user-research.rhai has none yet, forced choice, 1-5/Likert, too-tight, new category"
else
  not_ok "user-research.rhai missing required research-method phrases"
fi
if [ -f "$wf/user-research.rhai" ] \
  && ! grep -q 'Totbox' "$wf/user-research.rhai" \
  && ! grep -q 'hvac_cleaning' "$wf/user-research.rhai"; then
  ok "user-research.rhai has no baked product ids"
else
  not_ok "user-research.rhai must not contain baked product ids"
fi

if [ -f "$wf/user-research.rhai" ] && ! grep -q 'npm run company-os' "$wf/user-research.rhai"; then
  ok "user-research.rhai has no old cli invocation"
else
  not_ok "user-research.rhai must not contain old cli invocation"
fi
if [ -f "$wf/company-operating-loop.rhai" ] && grep -q 'where-are-we.py' "$wf/company-operating-loop.rhai" && ! grep -q 'npm run company-os' "$wf/company-operating-loop.rhai"; then
  ok "company-operating-loop.rhai uses where-are-we.py and has no old cli"
else
  not_ok "company-operating-loop.rhai must exist, mention where-are-we.py, omit old cli"
fi
if [ -f "$wf/ready-for-human-eyes.rhai" ] && ! grep -q 'npm run company-os' "$wf/ready-for-human-eyes.rhai"; then
  ok "ready-for-human-eyes.rhai exists and has no old cli"
else
  not_ok "ready-for-human-eyes.rhai must exist and omit old cli"
fi


# --- j) honesty pass (house rules labeled; sources vintage; no paper-backed overclaim) ---
if grep -q 'House rule' company-os/operating-system.md \
  && grep -q 'epistemology' company-os/operating-system.md; then
  ok "operating-system.md labels house/epistemology"
else
  not_ok "operating-system.md must label house/epistemology"
fi
if grep -q 'Bisbee' company-os/operating-system.md \
  && grep -q 'Brand' company-os/operating-system.md \
  && grep -q '§3.3' company-os/operating-system.md; then
  ok "operating-system.md has Bisbee + Brand §3.3 sources note"
else
  not_ok "operating-system.md must cite Bisbee and Brand §3.3 as load-bearing"
fi
if grep -q '# --- h) evidence-method locks' tests/test_day0.sh; then
  ok "test_day0.sh section h is evidence-method locks"
else
  not_ok "test_day0.sh section h must be evidence-method locks"
fi
if grep -q '2.8.2' company-os/operating-system.md \
  && grep -q '2.8.2' README.md; then
  ok "changelog still records 2.8.2"
else
  not_ok "OS and README must still record 2.8.2"
fi


# --- k) demo-only role-play house rule ---
if grep -q 'demographic one-liner' company-os/operating-system.md \
  && grep -q 'Demo-only role-play' company-os/operating-system.md \
  && grep -q 'demographic one-liner' company-os/first-hour.md \
  && grep -q 'demographic one-liner' company-os/ai-instructions.md \
  && grep -q 'demographic one-liner' company-os/live-runtime.md; then
  ok "demo-only role-play house rule in OS, first-hour, ai-instructions, live-runtime"
else
  not_ok "demo-only role-play house rule missing"
fi
if grep -q 'demographic one-liner' .grok/workflows/user-research.rhai \
  && grep -q 'Demo-only role-play' .grok/workflows/user-research.rhai; then
  ok "user-research.rhai has demo-only role-play house rule"
else
  not_ok "user-research.rhai must have demo-only role-play house rule"
fi
if ! grep -qi 'Aaru\|Simile\|Verasight\|Electric Twin' company-os/operating-system.md \
  company-os/first-hour.md company-os/ai-instructions.md company-os/live-runtime.md; then
  ok "no vendor names in constitution files"
else
  not_ok "constitution must not name Aaru/Simile/Verasight/Electric Twin"
fi
if grep -q '2.8.3' company-os/operating-system.md && grep -q '2.8.3' README.md; then
  ok "changelog still records 2.8.3"
else
  not_ok "OS and README must still record 2.8.3"
fi

# --- l) founder-day pack is additive; stability contract ---
if grep -q 'Additive by default' company-os/operating-system.md \
  && grep -q 'Jobs do not replace cards' company-os/operating-system.md \
  && grep -q 'Founder-day pack' company-os/operating-system.md \
  && grep -q 'Skill-capture' company-os/operating-system.md \
  && grep -q 'Day tools are inputs' company-os/live-runtime.md \
  && grep -q 'Jobs are not employees' company-os/ai-instructions.md \
  && grep -q 'founder-day pack' company-os/first-hour.md; then
  ok "stability contract + additive founder-day / skill-capture / jobs"
else
  not_ok "v2.8.4 must stay additive: stability contract, cards stay, packs optional"
fi
if grep -q 'Additive, rarely breaking' README.md; then
  ok "README template policy is additive / rarely breaking"
else
  not_ok "README template policy must say additive, rarely breaking"
fi
if grep -q 'Overnight drafts after proof' company-os/operating-system.md; then
  ok "growth pack overnight drafts stay after proof"
else
  not_ok "growth pack must gate overnight drafts after proof"
fi
if grep -q 'Insight quality before posting cadence' company-os/operating-system.md \
  && grep -q 'content calendar' company-os/operating-system.md \
  && ! grep -qi 'nikitabier\|LoganTGott\|meme coin' company-os/operating-system.md \
    company-os/live-runtime.md company-os/ai-instructions.md; then
  ok "insight-quality rule is portable (no account/vendor folklore)"
else
  not_ok "growth pack must have portable insight-quality rule, no X-account folklore"
fi
if grep -q '2.8.5' company-os/operating-system.md && grep -q '2.8.5' README.md; then
  ok "changelog still records 2.8.5"
else
  not_ok "OS and README must still record 2.8.5"
fi

# --- m) several ideas allowed ---
if grep -q 'Several ideas are allowed' company-os/operating-system.md \
  && grep -q 'Do not hide a second idea' company-os/operating-system.md \
  && grep -q 'Rank and kill per board' company-os/operating-system.md \
  && grep -q 'more than one idea' company-os/first-hour.md; then
  ok "several-ideas house rule in OS and first-hour"
else
  not_ok "several-ideas house rule missing"
fi

# --- n) marketing volume cannot promote (OS 2.8.6) ---
# Full rule lives once in the OS section. Other files pin + link; do not reprint the essay.
if grep -q '2.8.6' company-os/operating-system.md \
  && grep -q 'v2.8.6' README.md \
  && grep -q '### House rule: marketing volume cannot promote' company-os/operating-system.md \
  && grep -q 'does not mean get a crowd looking' company-os/operating-system.md \
  && grep -q 'Text eight people' company-os/operating-system.md \
  && grep -q 'waitlist of 400' company-os/operating-system.md \
  && grep -q 'first three jobs by hand' company-os/operating-system.md; then
  ok "OS 2.8.6 constitution section has full rule, vocabulary, and examples"
else
  not_ok "operating-system.md must hold the full 2.8.6 house-rule section"
fi
if grep -q "Eyeballs aren't buyers" company-os/first-hour.md \
  && grep -q 'house-rule-marketing-volume-cannot-promote' company-os/first-hour.md \
  && grep -q 'https://github.com/ivelin/bootstrap' company-os/first-hour.md; then
  ok "first-hour keeps room line and links to OS section"
else
  not_ok "first-hour.md must keep the room line and link to the OS section"
fi
if grep -q 'marketing volume cannot promote' company-os/ai-instructions.md \
  && grep -q 'house-rule-marketing-volume-cannot-promote' company-os/ai-instructions.md \
  && grep -q 'house-rule-marketing-volume-cannot-promote' company-os/live-runtime.md \
  && grep -q 'house-rule-marketing-volume-cannot-promote' company-os/ready-for-human-eyes.md \
  && grep -q 'house-rule-marketing-volume-cannot-promote' README.md; then
  ok "pointers link to the OS house-rule section"
else
  not_ok "ai-instructions, live-runtime, ready-for-human-eyes, and README must link the OS section"
fi
if ! grep -q 'Text eight people' company-os/first-hour.md \
    company-os/ai-instructions.md company-os/live-runtime.md \
    company-os/ready-for-human-eyes.md README.md \
  && ! grep -q 'waitlist of 400' company-os/first-hour.md \
    company-os/ai-instructions.md company-os/live-runtime.md \
    company-os/ready-for-human-eyes.md README.md \
  && ! grep -q 'does not mean get a crowd looking' company-os/first-hour.md \
    company-os/ai-instructions.md company-os/live-runtime.md \
    company-os/ready-for-human-eyes.md README.md; then
  ok "essay and example table are not copied outside the OS section"
else
  not_ok "do not reprint the 2.8.6 essay or example rows outside operating-system.md"
fi
if ! grep -qi 'Arcads\|Product Hunt' company-os/operating-system.md \
  company-os/first-hour.md company-os/ai-instructions.md company-os/live-runtime.md \
  company-os/ready-for-human-eyes.md README.md; then
  ok "no vendor / required-launch-site names in constitution"
else
  not_ok "constitution must not name Arcads or Product Hunt"
fi
if grep -q 'Say it once. Link. No filler.' company-os/operating-system.md \
  && grep -q 'Dense leftover text is good' company-os/operating-system.md \
  && grep -q 'Additive by default' company-os/operating-system.md; then
  ok "stability contract has say-it-once writing rule"
else
  not_ok "operating-system.md stability contract must include Say it once. Link. No filler."
fi
if ! grep -q 'Dense leftover text is good' company-os/first-hour.md \
    company-os/ai-instructions.md company-os/live-runtime.md \
    company-os/ready-for-human-eyes.md README.md mcp/README.md mcp/QA.md; then
  ok "say-it-once writing rule is not copied outside the OS stability contract"
else
  not_ok "do not reprint the say-it-once writing rule outside operating-system.md"
fi

# --- o) starter legal templates (hyperlink only; not a house rule) ---
# Constitution holds the section + both canonical URLs. Do not require caveats elsewhere.
if grep -q '### Starter legal templates' company-os/operating-system.md \
  && grep -q 'https://github.com/General-Legal/legal-templates' company-os/operating-system.md \
  && grep -q 'https://general.legal/library' company-os/operating-system.md; then
  ok "OS starter legal templates section has both canonical URLs"
else
  not_ok "operating-system.md must have starter legal templates + both canonical URLs"
fi
if grep -q 'starter-legal-templates' README.md \
  && grep -q 'starter-legal-templates' company-os/ai-instructions.md; then
  ok "README and ai-instructions point at the OS starter-legal-templates section"
else
  not_ok "README and ai-instructions must hyperlink the OS starter-legal-templates section"
fi
if ! find . -name '*.docx' ! -path './.git/*' | grep -q .; then
  ok "no .docx legal templates copied into this repo"
else
  not_ok "do not copy legal .docx files into this repo"
fi

# --- p) cap-table modeler (hyperlink only; not a house rule) ---
# Constitution holds the section + home URLs + companion + CLI/skill path.
# Do not require caveats elsewhere. Do not claim 1984 MCP is live.
os=company-os/operating-system.md
if grep -q '### Cap-table modeler' "$os" \
  && grep -q 'https://startup-finance.1984.vc/' "$os" \
  && grep -q 'https://github.com/1984vc/cap-table' "$os"; then
  ok "OS cap-table modeler section has both home URLs"
else
  not_ok "operating-system.md must have cap-table modeler + both home URLs"
fi
if grep -q 'https://www.ycombinator.com/safe/calculator' "$os" \
  && grep -q 'what % does this one SAFE sell' "$os"; then
  ok "YC SAFE calculator companion is present (not a second modeler)"
else
  not_ok "operating-system.md must have the YC SAFE calculator companion"
fi
if grep -q 'https://www.ycombinator.com/documents/' "$os"; then
  ok "YC SAFE instruments stay at the existing YC documents pointer"
else
  not_ok "keep https://www.ycombinator.com/documents/ at the existing instruments pointer"
fi
if grep -q 'npx skills add 1984vc/cap-table' "$os" \
  && grep -q 'npx @1984vc/cap-table' "$os" \
  && grep -q 'CLI/skill only' "$os"; then
  ok "agent path is CLI/skill only"
else
  not_ok "operating-system.md must pin npx skills add 1984vc/cap-table then npx @1984vc/cap-table"
fi
if ! grep -q 'startup-finance.1984.vc/mcp' "$os" README.md company-os/ai-instructions.md \
  && ! grep -qi '1984 MCP is live' "$os" README.md company-os/ai-instructions.md; then
  ok "do not claim 1984 MCP is live"
else
  not_ok "do not claim 1984 MCP is live or link startup-finance.1984.vc/mcp"
fi
if grep -q 'cap-table-modeler' README.md \
  && grep -q 'cap-table-modeler' company-os/ai-instructions.md; then
  ok "README and ai-instructions point at the OS cap-table-modeler section"
else
  not_ok "README and ai-instructions must hyperlink the OS cap-table-modeler section"
fi
if ! grep -q 'cap-table-modeler' company-os/first-hour.md \
  && ! grep -q 'startup-finance.1984.vc' company-os/first-hour.md \
  && ! grep -q '1984vc/cap-table' company-os/first-hour.md; then
  ok "first-hour.md stays out of the cap-table pointer"
else
  not_ok "first-hour.md must stay out (Day 0 is thesis/ICP)"
fi
if ! find . -path './.git' -prune -o -path '*/node_modules/*' -prune -o \
    -type d -name 'cap-table' -print | grep -q .; then
  ok "no 1984vc cap-table repo copied into this tree"
else
  not_ok "do not copy the 1984vc cap-table repo into this tree"
fi
cap_sec=$(sed -n '/^### Cap-table modeler$/,/^## Sources/p' "$os")
if ! printf '%s\n' "$cap_sec" | grep -Ei 'AngelList|Foundily|FoundStep|OpenCap|Eqvista|captable\.io' \
  && ! printf '%s\n' "$cap_sec" | grep -E '[^A-Za-z]Cake[^A-Za-z]|^Cake' \
  && ! printf '%s\n' "$cap_sec" | grep -E '\[[^]]*(Carta|Pulley)[^]]*\]\(' ; then
  ok "forbidden products are not listed as modelers"
else
  not_ok "do not list Carta, Pulley, AngelList, Foundily, FoundStep, OpenCap, Eqvista, Cake, or captable.io as modelers"
fi

# --- q) a security program cannot promote (OS 2.8.7) ---
# Constitution + first-hour / ai-instructions pointers. Do not require the essay elsewhere.
if grep -q '^\*\*Version:\*\* 2.8.7' company-os/operating-system.md \
  && grep -q '### House rule: a security program cannot promote' company-os/operating-system.md \
  && grep -q 'v2.8.7' README.md \
  && grep -q 'house-rule-a-security-program-cannot-promote' README.md \
  && grep -q "I don't need a security department before anyone uses this" company-os/first-hour.md \
  && grep -q 'house-rule-a-security-program-cannot-promote' company-os/first-hour.md \
  && grep -q 'a security or compliance program cannot promote' company-os/ai-instructions.md \
  && grep -q 'house-rule-a-security-program-cannot-promote' company-os/ai-instructions.md; then
  ok "OS 2.8.7 section exists; first-hour and ai-instructions link to it"
else
  not_ok "2.8.7 must live in the OS section with first-hour and ai-instructions pointers"
fi

# --- r) preview plugin 0.1.1: team Import from Repo + hyperlink-only skills ---
if [ -f plugin/plugin.json ] && [ -f plugin/mcp.json ] \
  && [ -f plugin/.cursor-plugin/plugin.json ] \
  && [ -f .cursor-plugin/marketplace.json ] \
  && [ -f mcp/vercel.json ] && [ -f mcp/api/mcp.ts ] && [ -f mcp/api/health.ts ] \
  && [ -f plugin/skills/path-1-default/SKILL.md ] \
  && [ -f plugin/skills/house-rule-pins/SKILL.md ] \
  && [ -f plugin/skills/first-hour/SKILL.md ] \
  && [ -f plugin/skills/query-os-first/SKILL.md ] \
  && [ -f plugin/COVERAGE.md ]; then
  ok "plugin manifests, team marketplace listing, thin skills, and coverage story exist"
else
  not_ok "plugin/ must have plugin.json, mcp.json, query-os-first, COVERAGE.md, and repo-root marketplace.json"
fi
if python3 - <<'PY'
import json, pathlib, sys
root = pathlib.Path("plugin")
plugin = json.loads((root / "plugin.json").read_text())
assert plugin["name"] == "bootstrap-os"
assert plugin["version"] == "0.1.1"
assert plugin["$schema"] == "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"
cursor_plugin = json.loads((root / ".cursor-plugin/plugin.json").read_text())
assert cursor_plugin["version"] == "0.1.1"
default_url = cursor_plugin["variables"]["properties"]["BOOTSTRAP_MCP_URL"]["default"]
assert default_url == "https://bootstrap-os-mcp.vercel.app/mcp"
mcp = json.loads((root / "mcp.json").read_text())
assert list(mcp["mcpServers"]) == ["bootstrap-os"]
server = mcp["mcpServers"]["bootstrap-os"]
assert server["type"] == "streamable-http"
assert server["url"] == "https://bootstrap-os-mcp.vercel.app/mcp"
assert "pirin.ai" not in server["url"]
assert "command" not in server
raw = (root / "mcp.json").read_text()
assert "mcp.pirin.ai" not in raw
assert "npx" not in raw
assert "gmail" not in raw.lower()
assert "stripe" not in raw.lower()
assert not (root / "marketplace.json").exists()
market = json.loads(pathlib.Path(".cursor-plugin/marketplace.json").read_text())
assert market["name"] == "bootstrap-os"
assert len(market["plugins"]) == 1
assert market["plugins"][0]["source"] == "plugin"
assert market["plugins"][0]["name"] == "bootstrap-os"
readme = (root / "README.md").read_text()
assert "0.1.1" in readme
assert "Import from Repo" in readme
assert "https://github.com/ivelin/bootstrap" in readme
assert "https://bootstrap-os-mcp.vercel.app/mcp" in readme
assert "~/.cursor/plugins/local/bootstrap-os" in readme
assert "/add-plugin" in readme
assert "we have not submitted" in readme.lower() or "We have not submitted" in readme
assert "query-os-first" in readme
assert "0-1" in readme
assert "## Feedback" in readme
assert "escalation to Ivelin" in readme
assert "not a public suggestion box" in readme
assert "ivelin@pirin.ai" in readme
assert readme.count("ivelin@pirin.ai") == 1
assert "public GitHub issue on ivelin/bootstrap" in readme
assert "Either path is fine" in readme
assert "No mentee names" in readme
assert "GitHub issue is not the escalate path" not in readme
assert "Feedback does not auto-change house rules" in readme
forbidden = [
    "Text eight people",
    "waitlist of 400",
    "does not mean get a crowd looking",
    "Dense leftover text is good",
]
required = {"path-1-default", "house-rule-pins", "first-hour", "query-os-first"}
found = {p.parent.name for p in (root / "skills").glob("*/SKILL.md")}
assert required <= found, found
for skill in (root / "skills").glob("*/SKILL.md"):
    body = skill.read_text()
    assert "https://github.com/ivelin/bootstrap" in body, skill
    assert len(body) < 1600, skill
    for phrase in forbidden:
        assert phrase not in body, (skill, phrase)
pins = (root / "skills/house-rule-pins/SKILL.md").read_text()
assert "house-rule-marketing-volume-cannot-promote" in pins
assert "house-rule-a-security-program-cannot-promote" in pins
standing = (root / "skills/query-os-first/SKILL.md").read_text()
assert "0-1" in standing
assert "spoken yes" in standing
assert "do not invent their stage" in standing
assert "is not GTM" in standing
assert "verbal maybe" in standing
assert "Do not speak as Ivelin" in standing
assert "Do not host mentee" in standing
assert "Path 1 stays the front door" in standing
assert "plugin/README.md#feedback" in standing
assert "ivelin@pirin.ai" not in standing
first = (root / "skills/first-hour/SKILL.md").read_text()
assert "Install-first" in first or "install-first" in first
assert "https://bootstrap-os-mcp.vercel.app/mcp" in first
assert "No auth" in first
assert "No database" in first
readme = (root / "README.md").read_text()
assert "Merge-gate visitor matrix" in readme
assert "do not invent their stage" in readme
coverage = (root / "COVERAGE.md").read_text()
assert "## Locked" in coverage
assert "## Not locked" in coverage
assert "## Visitor matrix" in coverage
assert "do not invent their stage" in coverage
assert "H1" in coverage and "A4" in coverage
assert "https://bootstrap-os-mcp.vercel.app/mcp" in coverage
assert "GET /health" in coverage
assert "Rollback" in coverage
assert "SSO" in coverage
print("plugin lock ok")
PY
then
  ok "plugin skills only hyperlink the published OS; team Import from Repo listed"
else
  not_ok "plugin must stay thin hyperlinks; one vercel.app connector; team marketplace.json at plugin/"
fi

printf '\n%d passed, %d failed\n' "$pass" "$fail"
if [ "$fail" -ne 0 ]; then
  exit 1
fi
exit 0
