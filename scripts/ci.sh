#!/bin/sh
# Local CI for this template: Day-0 tests only. No extra deps.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
sh tests/test_day0.sh
echo "CI OK"
