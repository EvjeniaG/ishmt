# Phase 5 - Document Storage, PDFs, QR Assets & Compliance

**Status:** Complete - pending approval  
**Depends on:** Phase 4 (approved)

---

## Pre-Phase 5 Configuration

- Default `registry_number_format.active` = **`ISHMT_LEGACY`**
- Production registry example: **`000001 TR`**
- Certificate format: **`CR00001`**

---

## Deliverables

### 1. MinIO Document Storage
- `StorageService` - S3-compatible upload/download via `@aws-sdk/client-s3`
- Real file storage in `ishmtt-documents` bucket
- `POST /api/documents/upload` - authenticated multipart upload
- `GET /api/documents/[id]/download` - secure streaming download

### 2. Document Access Logging
- `DocumentAccessLog` on upload (VIEW) and download (DOWNLOAD)
- `AuditService.DOWNLOAD_DOCUMENT` on every download
- Access control via entity ownership + inspector/admin permissions

### 3. Certificate PDF Generation
- `PdfService` - template variable substitution
- `PostApprovalAssetService` - generates PDF on approval
- Seeded ISHMT templates (`DocumentTemplate` CERTIFICATE type)
- Linked to `Certificate.documentId`

### 4. Forwarding Letter PDF
- OFFICIAL_LETTER template seeded
- Generated on approval, linked to application (`purpose: FORWARDING_LETTER`)

### 5. QR Image Generation
- `qrcode` package - PNG buffer generation
- Stored in MinIO, linked via `QrCode.imageDocumentId`
- Public image endpoint: `GET /api/qr/[code]/image`

### 6. Owner QR Print View
- `/portal/elevators/[id]/qr` - printable layout with QR image, registry number, certificate link

### 7. Public QR Profile - Compliance Indicator
- `/q/[code]` - GREEN / YELLOW / RED indicator from `ElevatorComplianceStatus`
- Scan logging (`QrScanLog`, `scanCount`)

### 8. QR Placement Confirmation Photo
- Owner uploads placement photo via secure upload API
- `POST /api/qr/placement` - confirms `placementPhotoDocumentId`
- UI on owner QR print page

---

## Deferred (Phase 6)
- Excel import / migration

---

## Verification

```bash
npm run db:push
npm run db:seed
npm run test
npm run typecheck
npm run build
```

Ensure MinIO is running: `npm run docker:up`

### Manual E2E
1. Approve application → verify `000001 TR` style registry + `CR00001` certificate
2. Download certificate PDF and forwarding letter from linked documents
3. Open `/portal/elevators/{id}/qr` - print view + placement photo upload
4. Scan `/q/{code}` - compliance indicator visible
