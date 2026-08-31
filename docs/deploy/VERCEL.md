# Deploy në Vercel (nga zero)

Udhëzues hap-pas-hapi për **IQMT Digital Elevator Registry** - Neon PostgreSQL, Supabase Storage (S3), **gjenerim automatik PDF certifikate** pas miratimit.

---

## Çfarë funksionon pas deploy

| Funksion | Si |
|----------|-----|
| **Ngarkim certifikate** (aplikim) | Personi përgjegjës / certifikuesi ngarkon PDF në formularin e aplikimit |
| **Gjenerim PDF CR** (pas miratimit) | Kur kryeinspektori miraton regjistrim të ri → sistemi gjeneron certifikatën e regjistrimit + letër përcjellëse + imazh QR |
| **Riprovim** | Në faqen e aplikimit: «Riprovo gjenerimin» nëse dështon |
| **Cron** | Çdo 15 min riprovon aplikime me PDF/QR në pritje ose të dështuara |

---

## Hapi 1 - Llogari & repo

1. **GitHub**: kodi duhet të jetë në `https://github.com/EvjeniaG/ishmt` (branch `main`).
2. **Vercel**: [vercel.com](https://vercel.com) → Sign up me GitHub.
3. **Neon**: [neon.tech](https://neon.tech) → projekt PostgreSQL i ri.
4. **Supabase**: [supabase.com](https://supabase.com) → projekt i ri (vetëm për **Storage S3**, jo Auth).

---

## Hapi 2 - Supabase Storage (dokumentet & PDF)

1. Supabase → **Storage** → krijo bucket **`ishmtt-documents`** (private).
2. **Configuration → S3** → Enable → **Generate access key**.
3. Ruaj **saktësisht** nga faqja S3:
   - Endpoint: `https://<PROJECT_REF>.storage.supabase.co/storage/v1/s3`
   - **Region** (kopjoje te `STORAGE_REGION` — jo supozime)
   - Access Key ID
   - Secret Access Key
4. Bucket-i **`ishmtt-documents`** duhet të ekzistojë te **Storage → Buckets** (private). Pa bucket, upload jep `NoSuchBucket`.

Pa storage, PDF certifikatat **nuk ruhen** (gjenerimi dështon në upload).

---

## Hapi 3 - Neon DATABASE_URL

1. Neon → Connection string → **Pooled** (`-pooler` në host).
2. Formati:  
   `postgresql://USER:PASS@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`

---

## Hapi 4 - Projekt i ri në Vercel

1. **Add New → Project** → importo `EvjeniaG/ishmt`.
2. Framework: **Next.js** (auto).
3. Build Command: `npm run build` (default).
4. **Mos** vendos env vars ende - shtoji pas krijimit të projektit.

---

## Hapi 5 - Variablat e mjedisit (Vercel → Settings → Environment Variables)

Kopjo nga `.env.vercel.example`. **Production** për të gjitha:

| Variabël | Vlera |
|----------|--------|
| `DATABASE_URL` | Neon pooled string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://<projekti>.vercel.app` (pas deploy-it të parë) |
| `NEXT_PUBLIC_APP_URL` | i njëjti URL |
| `NEXT_PUBLIC_QR_BASE_URL` | `https://<projekti>.vercel.app/q` |
| `NEXT_PUBLIC_APP_NAME` | `IQMT Digital Elevator Registry` |
| `STORAGE_PROVIDER` | `s3` |
| `STORAGE_ENDPOINT` | Supabase S3 endpoint |
| `STORAGE_ACCESS_KEY` | Supabase access key |
| `STORAGE_SECRET_KEY` | Supabase secret |
| `STORAGE_BUCKET` | `ishmtt-documents` |
| `STORAGE_REGION` | **Region nga Supabase S3 config** (jo domosdoshmërisht `us-east-1`) |
| `STORAGE_USE_SSL` | `true` |
| `CRON_SECRET` | string i gjatë random (min 32 karaktere) |
| `NODE_ENV` | `production` |
| `SEED_DEV_USERS` | `false` |
| `ISHMT_DEMO_DATA` | `true` |
| `ISHMT_DEMO_TOOLS` | `true` |

**Pas deploy-it të parë**, përditëso `NEXTAUTH_URL` dhe `NEXT_PUBLIC_*` me URL-në reale dhe **Redeploy**.

---

## Hapi 6 - Deploy i parë

1. Vercel → **Deploy** (ose push në `main`).
2. Prit build-in (`prisma generate` + `next build`).
3. Hap URL-në e projektit - faqja login duhet të ngarkohet.

---

## Hapi 7 - Ngarko databazën demo (nga Mac/lokal)

Në terminal, nga folderi i projektit:

```bash
cd /Users/evjenia/Desktop/ishmtt

DATABASE_URL="postgresql://..." ./scripts/deploy/setup-remote-db.sh
```

Kjo bën: `prisma db push` → seed → demo i plotë (përdorues, ashensorë, aplikime).

**Fjalëkalimi demo**: `Ishmt2026` (shiko output të script-it për NID-të).

---

## Hapi 8 - Cron (PDF & njoftime)

Projekti ka `vercel.json`:

- **05:00 UTC** - të gjitha job-et (përmbledhje ditore, compliance, etj.)
- **Çdo 15 min** - `ASSET_GENERATION_RETRY` (certifikata PDF + QR)

Vercel dërgon automatikisht `Authorization: Bearer <CRON_SECRET>` kur `CRON_SECRET` është vendosur.

**Test manual** (pas deploy):

```bash
curl -X POST "https://<projekti>.vercel.app/api/cron/jobs" \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"jobs":["ASSET_GENERATION_RETRY"]}'
```

---

## Hapi 9 - Verifiko PDF certifikatën

1. Hyr si **Kryeinspektor** (`I90505005E` / `Ishmt2026`).
2. Shko te **Miratimet & vendimet** → mirato një aplikim regjistrimi.
3. Në dosje duhet të shfaqet **Gjenerimi i dokumenteve → Përfunduar**.
4. Hap ashensorin → tab **Certifikata** → shkarko PDF.

Nëse statusi është **Dështoi** → **Riprovo gjenerimin** (shpesh mungon storage ose fontet PDF).

---

## Probleme të zakonshme

| Simptom | Zgjidhje |
|---------|----------|
| `CLIENT_FETCH_ERROR` / NextAuth | Kontrollo `NEXTAUTH_URL` = URL e saktë e prod |
| PDF «Fontet nuk u gjetën» | `next.config.ts` përfshin pdfkit data - redeploy |
| PDF upload dështon | Supabase bucket + keys + `STORAGE_*` |
| Cron 401 | `CRON_SECRET` i njëjtë në Vercel |
| DB bosh pas deploy | Ekzekuto `setup-remote-db.sh` me Neon URL |

---

## Përditësim i ardhshëm

```bash
git add .
git commit -m "..."
git push origin main
```

Vercel ridëployon automatikisht.

---

## Skedarë kyç në repo

- `vercel.json` - cron
- `.env.vercel.example` - lista env
- `scripts/deploy/setup-remote-db.sh` - DB demo
- `next.config.ts` - pdfkit për serverless
- `src/lib/services/post-approval-asset-service.ts` - gjenerim PDF CR
