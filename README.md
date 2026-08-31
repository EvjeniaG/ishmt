# IQMT Digital Elevator Registry

Sistemi i regjistrit digjital të ashensorëve (IQMT).

## Zhvillim lokal

```bash
npm install
docker compose up -d   # PostgreSQL + MinIO (opsional)
cp .env.example .env
npx prisma db push && npm run db:seed:full-demo
npm run dev
```

## Deploy në Vercel

Udhëzues i plotë: **[docs/deploy/VERCEL.md](docs/deploy/VERCEL.md)**

Përmbledhje:

1. Neon (PostgreSQL) + Supabase Storage (S3)
2. Import repo në Vercel + env vars (`.env.vercel.example`)
3. Deploy → `DATABASE_URL="..." ./scripts/deploy/setup-remote-db.sh`
4. Mirato aplikim si kryeinspektor → PDF certifikate gjenerohet automatikisht

**Demo prod**: fjalëkalim `Ishmt2026` - NID në output të `setup-remote-db.sh`.
