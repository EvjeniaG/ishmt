#!/usr/bin/env bash
# Ngarkon databazën e plotë demo në PostgreSQL remote (Neon).
#
# Mod 1 - seed i plotë demo (rekomandohet për deploy):
#   DATABASE_URL="postgresql://..." ./scripts/deploy/setup-remote-db.sh
#
# Mod 2 - kopje e saktë e databazës lokale (backup SQL):
#   DATABASE_URL="postgresql://..." ./scripts/deploy/setup-remote-db.sh --from-backup backup/ishmtt-20260629-1919.sql
#
# Mod 2 përfshin edhe të dhëna legacy në DB; në app vendos ISHMT_DEMO_DATA=true për të fshehur Excel-in.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BACKUP_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from-backup)
      BACKUP_FILE="${2:-}"
      if [[ -z "$BACKUP_FILE" ]]; then
        echo "Përdorimi: --from-backup path/to/backup.sql"
        exit 1
      fi
      shift 2
      ;;
    *)
      echo "Argument i panjohur: $1"
      exit 1
      ;;
  esac
done

if [[ -z "${DATABASE_URL:-}" ]] && [[ -f "$ROOT/.env" ]]; then
  DATABASE_URL="$(node -e "require('dotenv').config({ path: process.argv[1] }); process.stdout.write(process.env.DATABASE_URL ?? '');" "$ROOT/.env")"
  export DATABASE_URL
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Vendos DATABASE_URL (Neon connection string me -pooler) ose shtoje në .env."
  exit 1
fi

print_credentials() {
  cat <<'EOF'

============================================================
DATASET DEMO - KREDENCIALET (fjalëkalim: Ishmt2026)
============================================================
Personi përgjegjës i ashensorit     | I90404004D
Instalues - Ashensorë Pro           | K11111111A
Instalues - Lift Master             | L10000001A
Instalues - Euro Ashensorë          | L10000002B
Certifikues - OMI Certifikim        | K22222222B
Certifikues - Inspekt OMI           | M20000001A
Certifikues - Quality Lift          | M20000002B
Mirëmbajtje - Servis Ashensorë      | K33333333C
Mirëmbajtje - Servis Lift 24        | N30000001A
Admin ISHMT                         | I90101001A
Kryeinspektor                       | I90505005E
Drejtor Teknik                      | I90606006F
Përgjegjës Sektor Mekanik           | I90707007G
Inspektor - Dritan Gjoka            | I90909009I
Inspektor - Elona Marku             | I90909010J
Drejtoria e Politikave              | I90303003C
============================================================
Përmbajtja demo:
  • 5 aplikime regjistrimi (të dhëna bazë)
  • 2 ashensorë të regjistruar (KN-2025-884512, SCH-2024-553120)
  • Pipeline: raportime, mirëmbajtje, inspektime
  • 1 aplikim për miratim nga kryeinspektori
============================================================
EOF
}

if [[ -n "$BACKUP_FILE" ]]; then
  if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Backup nuk u gjet: $BACKUP_FILE"
    exit 1
  fi
  echo "→ Restore backup: $BACKUP_FILE"
  if ! command -v psql >/dev/null 2>&1; then
    echo "Instalo psql (PostgreSQL client) për restore."
    exit 1
  fi
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"
  echo "✓ Backup u restaurua."
  print_credentials
  echo "Shënim: vendos ISHMT_DEMO_DATA=true në Vercel nëse backup përmban legacy Excel."
  exit 0
fi

echo "→ prisma db push (skema)"
npx prisma db push

echo "→ seed bazë (geo, role, leje, template)"
npx prisma db seed

echo "→ seed demo i plotë (16 përdorues, aplikime, ashensorë, pipeline, kryeinspektor)"
tsx prisma/seed-demo.ts

echo "✓ Databaza demo e plotë është gati."
print_credentials
