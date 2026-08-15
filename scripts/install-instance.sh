#!/bin/sh
# Copy Bootstrap OS blank instance files into a company repo and merge
# company-os/ai-instructions.md into that repo's AGENTS.md.
#
# Usage:
#   ./scripts/install-instance.sh /path/to/your-company
#   ./scripts/install-instance.sh --force /path/to/your-company
#
# Does not push, commit, or write into this template's company-os/ constitution
# beyond reading it. Refuses to install into the template repo itself.

set -eu

usage() {
  cat <<'EOF'
Usage: install-instance.sh [--force] TARGET_DIR

Copy blank Bootstrap OS instance files into TARGET_DIR and merge the
hard-rules block from company-os/ai-instructions.md into TARGET_DIR/AGENTS.md.

  --force   overwrite existing copied files (does not delete extra files)

Then open TARGET_DIR/docs/company-os/first-hour.md
EOF
}

die() {
  printf '%s\n' "$*" >&2
  exit 2
}

FORCE=0
TARGET=""

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      die "Unknown option: $1"
      ;;
    *)
      if [ -n "$TARGET" ]; then
        die "Unexpected extra argument: $1"
      fi
      TARGET=$1
      shift
      ;;
  esac
done

[ -n "$TARGET" ] || { usage >&2; exit 2; }

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

[ -f "$ROOT/templates/applied-here.md" ] || die "Cannot find templates/ next to this script."
[ -f "$ROOT/company-os/ai-instructions.md" ] || die "Cannot find company-os/ai-instructions.md."

mkdir -p "$TARGET"
TARGET=$(CDPATH= cd -- "$TARGET" && pwd)

if [ -f "$TARGET/company-os/operating-system.md" ] && [ -d "$TARGET/templates/instance" ]; then
  die "Refusing to install into the Bootstrap OS template repo ($TARGET). Pass your company repo."
fi

if [ "$TARGET" = "$ROOT" ]; then
  die "Refusing to install into the Bootstrap OS template repo itself."
fi

copy_one() {
  src=$1
  dest=$2
  if [ -e "$dest" ] && [ "$FORCE" -eq 0 ]; then
    printf '  skip   %s (exists)\n' "$dest"
    return 0
  fi
  mkdir -p "$(dirname -- "$dest")"
  cp -- "$src" "$dest"
  printf '  copy   %s\n' "$dest"
}

printf 'Installing blank instance into %s\n' "$TARGET"

# src relative to ROOT → dest relative to TARGET
# Keep this list in sync with templates/README.md
copy_one "$ROOT/templates/applied-here.md"                    "$TARGET/docs/company-os/applied-here.md"
copy_one "$ROOT/templates/instance/README.md"                 "$TARGET/docs/company-os/instance/README.md"
copy_one "$ROOT/templates/instance/thesis.md"                 "$TARGET/docs/company-os/instance/thesis.md"
copy_one "$ROOT/templates/instance/scores.md"                 "$TARGET/docs/company-os/instance/scores.md"
copy_one "$ROOT/templates/instance/snapshots/TEMPLATE.md"     "$TARGET/docs/company-os/instance/snapshots/TEMPLATE.md"
copy_one "$ROOT/templates/company/README.md"                  "$TARGET/company/README.md"
copy_one "$ROOT/templates/company/state/company-state.json"   "$TARGET/company/state/company-state.json"
copy_one "$ROOT/templates/company/state/company-state.schema.json" "$TARGET/company/state/company-state.schema.json"
copy_one "$ROOT/templates/company/state/where-are-we.py"      "$TARGET/company/state/where-are-we.py"
copy_one "$ROOT/templates/traces/decisions/TEMPLATE.md"       "$TARGET/traces/decisions/TEMPLATE.md"
copy_one "$ROOT/templates/research/icps/TEMPLATE.md"          "$TARGET/research/icps/TEMPLATE.md"
copy_one "$ROOT/templates/product/READY_FOR_HUMAN_EYES.md"    "$TARGET/product/READY_FOR_HUMAN_EYES.md"
copy_one "$ROOT/company-os/first-hour.md"                     "$TARGET/docs/company-os/first-hour.md"

if [ -f "$TARGET/company/state/where-are-we.py" ]; then
  chmod +x "$TARGET/company/state/where-are-we.py" || true
fi

# First fenced block in ai-instructions.md is the paste-into-AGENTS.md text.
paste_block=$(awk '
  /^```/ { n++; next }
  n == 1 { print }
  n >= 2 { exit }
' "$ROOT/company-os/ai-instructions.md")

[ -n "$paste_block" ] || die "Could not extract the paste block from company-os/ai-instructions.md"

agents="$TARGET/AGENTS.md"
marker="<!-- bootstrap-os-ai-instructions -->"

if [ -f "$agents" ] && grep -q "Never advance a journey phase without" "$agents" 2>/dev/null; then
  printf '  skip   %s (Bootstrap OS hard rules already present)\n' "$agents"
elif [ ! -f "$agents" ]; then
  cat > "$agents" <<EOF
# Agent instructions

Hard company-control rules from Bootstrap OS. Full constitution:
https://github.com/ivelin/bootstrap (company-os/operating-system.md + live-runtime.md).

$marker

$paste_block

Current focus: (fill after the first hour — thesis + test-priority groups)
EOF
  printf '  write  %s (new file, paste block from company-os/ai-instructions.md)\n' "$agents"
else
  cat >> "$agents" <<EOF

---

## Bootstrap OS — hard rules

Paste source: company-os/ai-instructions.md (do not silently weaken these rules).

$marker

$paste_block

Current focus: (fill after the first hour — thesis + test-priority groups)
EOF
  printf '  merge  %s (appended paste block from company-os/ai-instructions.md)\n' "$agents"
fi

cat <<EOF

Day 0 files are in place.

Next (about an hour) — open:
  $TARGET/docs/company-os/first-hour.md

That page is: fill thesis, ≥3 ICP scorecards, first "Where are we?"
Do not copy another founder's market, ICP list, or roadmap.

Manual paste path (if you skip this script next time):
  copy the fenced block in company-os/ai-instructions.md into the instance AGENTS.md
EOF
