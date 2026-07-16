#!/usr/bin/env bash
# Alias: restauron backup lokal në Neon (e njëjta gjendje si Mac-i yt).
#   DATABASE_URL="postgresql://..." ./scripts/deploy/restore-local-backup-to-remote.sh [backup.sql]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP="${1:-$ROOT/backup/ishmtt-20260629-1919.sql}"

exec "$ROOT/scripts/deploy/setup-remote-db.sh" --from-backup "$BACKUP"
