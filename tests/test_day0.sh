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

if grep -q 'Nothing to connect to today' README.md; then
  ok "README hosted MCP honesty (Nothing to connect to today)"
else
  not_ok "README missing Nothing to connect to today"
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

# --- h) paper-backed evidence rules (no 1-5/dollar; variance/drift; new category) ---
if grep -q '1–5' company-os/first-hour.md \
  && grep -q 'then map' company-os/first-hour.md \
  && grep -q 'too uniform' company-os/first-hour.md \
  && grep -q 'New-category' company-os/first-hour.md; then
  ok "first-hour.md has no 1-5/dollar, then map, too uniform, New-category"
else
  not_ok "first-hour.md must lock no 1-5/dollar, then map, too uniform, New-category"
fi

if grep -q '1–5' company-os/operating-system.md \
  && grep -q 'then map' company-os/operating-system.md \
  && grep -q 'too-tight variance' company-os/operating-system.md \
  && grep -q 'unusable' company-os/operating-system.md \
  && grep -q 'new category' company-os/operating-system.md; then
  ok "operating-system.md has no 1-5/dollar, too-tight variance, unusable, new category"
else
  not_ok "operating-system.md must lock no 1-5/dollar, too-tight variance, unusable, new category"
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
  ok "live-runtime.md has no 1-5/dollar, then map, Too-tight variance, unusable, New category"
else
  not_ok "live-runtime.md must lock no 1-5/dollar, then map, Too-tight variance, unusable, New category"
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

printf '\n%d passed, %d failed\n' "$pass" "$fail"
if [ "$fail" -ne 0 ]; then
  exit 1
fi
exit 0
