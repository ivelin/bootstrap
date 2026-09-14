# verify-bootstrap evidence

Proof artifacts written by `scripts/verify-bootstrap.mjs` live in this directory, one folder per feature id. Cleanup deletes the HTTP helper pid and `/tmp/verify-bootstrap-run` scratch only. Files here must still exist after cleanup.

Do not treat this folder as company state or as a mentee board.

First skill-creation pass (2026-09-14): drove `hosted-handshake-whoami` on the local helper (pid 2006, port 40831). After cleanup the pid was gone and `hosted-handshake-whoami/proof.json` remained (`ok: true`).
