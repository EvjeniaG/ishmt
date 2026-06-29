# Phase 4 - Documents, Certificate Metadata, QR Skeleton & Attachments

**Status:** Complete - pending approval  
**Depends on:** Phase 3 corrections (approved)

---

## Phase 3 Corrections (completed)

| # | Requirement | Implementation |
|---|-------------|----------------|
| 1 | Configurable registry/certificate numbers | `NumberFormatService`, `sys_config` keys, `ELV_MODERN` + `ISHMT_LEGACY` + `CR_PREFIX` |
| 2 | All application types in workflow | `application-workflow.ts` with safe blocking for unimplemented approvals |
| 3 | Certifier field preparation | `omiNumber`, `examinationType`, `examinationDate`, `conformityResult`, `certificateReference`, `certifierTechnicalNotes` |
| 4 | Full approval side-effects | Elevator + technical data/version + responsible entities + status/ownership history + audit per entity |
| 5 | Return flow | `returnToRole`, `requiredCorrection`, workflow metadata, dedicated audit |
| 6 | Deferred | QR image, certificate PDF, MinIO upload, Excel import |

---

## Phase 4 Deliverables

### Number Formats (configurable via `sys_config`)

| Key | Active default | Example output |
|-----|----------------|----------------|
| `registry_number_format` | `ELV_MODERN` | `ELV-2026-TIA-000001` |
| | `ISHMT_LEGACY` | `000001 TR` |
| `certificate_number_format` | `CR_PREFIX` | `CR00001` |

Tirana municipality seeded with `legacyRegistryCode: TR`.

### Workflow Engine
- `src/lib/workflows/application-workflow.ts` - all 5 application types
- `APPROVAL_NOT_IMPLEMENTED_TYPES` blocks approve safely for non-`NEW_REGISTRATION`

### Services
- `NumberFormatService` - registry + certificate sequencing
- `CertificateService` - registration certificate metadata (no PDF)
- `QrService` - QR skeleton + public profile reader
- `DocumentService` - metadata registration + entity links (pending storage path)

### UI
| Route | Purpose |
|-------|---------|
| `/q/[code]` | Public QR profile skeleton (Albanian) |
| Application detail | Document attachments panel (metadata registration) |

### Permissions
- `documents.view`, `documents.upload`, `documents.download`

### On NEW_REGISTRATION Approval
1. Elevator with configurable registry number
2. Technical data + version 1 (includes certifier metadata)
3. Responsible entities
4. Status history + ownership history
5. Certificate metadata (`CR00001` format)
6. QR code skeleton record
7. Audit log per created entity

### Still Deferred
- Certificate PDF generation
- QR image generation
- MinIO/S3 binary upload
- Excel import

---

## Verification

```bash
npm run db:push
npm run db:seed
npm run test
npm run typecheck
npm run build
```

### Manual checks
1. Approve application → verify registry number, certificate number, QR code in response
2. Visit `/q/{code}` for public profile
3. Register document metadata on application detail page
4. Return application with required correction fields populated
