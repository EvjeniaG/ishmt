#!/usr/bin/env bash
# Mac: eksporton databazën lokale (Docker) për restore në VPS.
set -euo pipefail

CONTAINER="${ISHMTT_PG_CONTAINER:-ishmtt-postgres}"
DB_USER="${ISHMTT_PG_USER:-ishmtt}"
DB_NAME="${ISHMTT_PG_DB:-ishmtt_registry}"
OUT_DIR="${1:-./backup}"
STAMP="$(date +%Y%m%d-%H%M)"
OUT_FILE="${OUT_DIR}/ishmtt-${STAMP}.sql"

mkdir -p "$OUT_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Kontejneri '$CONTAINER' nuk po punon."
  echo "Nise lokalisht: docker compose up -d db"
  exit 1
fi

echo "Duke eksportuar $DB_NAME nga $CONTAINER …"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" --no-owner --no-acl "$DB_NAME" > "$OUT_FILE"

echo "✓ Ruajtur: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
