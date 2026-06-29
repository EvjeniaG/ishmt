# Phase 6 - Excel Migration Module (Complete)

## Phase 5 verification (pre-Phase 6)

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Certificate PDF follows ISHMT template layout | ✅ Structured official frame, header, field table, signature blocks (`pdf-service.ts`) |
| 2 | Forwarding letter follows ISHMT structure | ✅ Official letter layout with reference block, body, instructions (`pdf-service.ts`) |
| 3 | Public QR page hides private owner data | ✅ Only registry number, status, municipality, last inspection, compliance indicator |
| 4 | Downloads always log `DocumentAccessLog` + `DOWNLOAD_DOCUMENT` | ✅ `DocumentService.downloadWithAccessLog()` |
| 5 | QR placement photo linked to elevator; owner + ISHMT only | ✅ Dual `DocumentLink` (qr_code + elevator), ACL in `canAccessDocument` |
| 6 | Compliance color logic centralized | ✅ `ComplianceService.getPublicDisplay()` - UI consumes service only |
| 7 | Post-approval asset failure shows status + retry | ✅ `AssetGenerationStatus` on Application, `tryGenerate` / `retry`, UI card |

## Phase 6 deliverables

### Schema
- `MigrationBatch`: `sourceDocumentId`, `selectedSheet`, `qualityReport`
- `MigrationStagingRecord`: `adminCorrectedData`
- `Application`: `assetGenerationStatus`, `assetGenerationError`, `assetGenerationCompletedAt`
- `AssetGenerationStatus` enum

### Services
- `ExcelParser` - workbook/sheet parsing, column suggestions
- `MigrationService` - upload, mapping, staging, validation, duplicates, review queue, import, rollback, inspector confirmation, quality report

### Permissions (36 total)
- `migration.upload` - ADMIN
- `migration.review` - ADMIN
- `migration.import` - ADMIN
- `migration.rollback` - ADMIN
- `migration.confirm` - INSPECTOR, ADMIN

### UI
- `/ishmt/admin/import` - upload + batch list
- `/ishmt/admin/import/[id]` - sheet mapping, staging review, quality report, import/rollback
- `/ishmt/confirm-elevators` - inspector PENDING_CONFIRMATION queue

### Business rules enforced
- Imported elevators: `PENDING_CONFIRMATION` until inspector confirms → `ACTIVE`
- Synthetic approved `NEW_REGISTRATION` application per row (`MIG-{batch}-{row}`)
- Batch-level import transaction with audit `IMPORT`
- Batch rollback soft-deletes elevators + applications, audit `ROLLBACK`
- No maintenance or inspection operations in this phase

### Dependencies
- `xlsx` for Excel parsing

### Tests
- `tests/unit/migration-validation.test.ts`
- Extended `compliance-service.test.ts` for display profile

## Usage flow

1. Admin uploads Excel at `/ishmt/admin/import`
2. Select sheet + map columns → validate & stage
3. Review queue resolves duplicates/errors; admin corrects staging rows
4. Import batch → elevators created as `PENDING_CONFIRMATION`
5. Inspector confirms at `/ishmt/confirm-elevators`
6. Rollback available for completed batches if needed
