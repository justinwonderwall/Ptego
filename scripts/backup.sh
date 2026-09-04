#!/bin/bash
# Daily data backup: snapshot the db + uploads, commit, and push to GitHub.
# Safe to run while the server is up — better-sqlite3 opens the db read-only
# and WAL mode allows concurrent readers alongside the server's writer.
#
# launchd runs this with a minimal environment (no shell profile loaded),
# so PATH is set explicitly rather than relying on `node`/`git` resolving.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/backup.js

git add backups/

# Scoped to backups/ specifically — commits only changes under that path even
# if something else happens to be staged in the index at the time (as
# happened once: a pending code rename was sitting staged and got swept into
# an early test run of this script before this fix).
if git diff --cached --quiet -- backups/; then
  echo "No data changes since last backup — nothing to commit."
  exit 0
fi

git commit -m "Automated data backup: $(date '+%Y-%m-%d %H:%M')" -- backups/
git push origin main
echo "Backup committed and pushed."
