# Migration Design - Excel Import Strategy

## 1. Migration Context

ISHMT currently maintains elevator registries in Excel spreadsheets. These files contain years of accumulated data with varying formats, inconsistent field naming, and varying data quality. The migration module must safely import this legacy data while:

- Preserving data integrity
- Detecting and resolving duplicates
- Allowing human review before committing
- Supporting rollback if import errors are discovered
- Marking imported records as `PENDING_CONFIRMATION` until ISHMT validates them

## 2. Migration Architecture

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Upload    │───▶│   Validate   │───▶│    Stage     │───▶│   Review     │
│   Excel     │    │   & Map      │    │   Records    │    │   & Resolve  │
└─────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                    │
                    ┌──────────────┐    ┌──────────────┐            │
                    │   Confirm    │◀───│   Import     │◀───────────┘
                    │  (Inspector) │    │   to Registry│
                    └──────────────┘    └──────┬───────┘
                                               │
                                        ┌──────▼───────┐
                                        │   Rollback   │
                                        │  (if needed) │
                                        └──────────────┘
```

## 3. Expected Excel Column Mapping

### 3.1 Standard Column Mapping (Configurable)

| Excel Column (Albanian) | Excel Column (English) | Database Field | Required |
|--------------------------|------------------------|----------------|----------|
| Nr. Regjistri | Registry Number | elv_elevators.registry_number | No (auto-generated if missing) |
| Adresa | Address | elv_elevators.building_address | Yes |
| Bashkia | Municipality | elv_elevators.building_municipality | Yes |
| Emri i Ndërtesës | Building Name | elv_elevators.building_name | No |
| Lloji | Type | elv_technical_data.elevator_type | Yes |
| Prodhuesi | Manufacturer | elv_technical_data.manufacturer | Yes |
| Modeli | Model | elv_technical_data.model | No |
| Nr. Serial | Serial Number | elv_technical_data.serial_number | Yes |
| Viti i Prodhimit | Manufacturing Year | elv_technical_data.manufacturing_year | No |
| Kapaciteti (kg) | Capacity (kg) | elv_technical_data.capacity_kg | No |
| Kapaciteti (persona) | Capacity (persons) | elv_technical_data.capacity_persons | No |
| Shpejtësia | Speed | elv_technical_data.speed_ms | No |
| Kate të Shërbyer | Floors Served | elv_technical_data.floors_served | Yes |
| Kompania e Instalimit | Installation Company | org_organizations (INSTALLER) | No |
| Kompania e Certifikimit | Certification Company | org_organizations (CERTIFIER) | No |
| Kompania e Mirëmbajtjes | Maintenance Company | org_organizations (MAINTENANCE) | No |
| Pronari | Owner | org_organizations (OWNER) | No |
| Data e Regjistrimit | Registration Date | elv_elevators.registration_date | No |
| Statusi | Status | elv_elevators.status | No (defaults to PENDING_CONFIRMATION) |
| Shënime | Notes | metadata JSONB | No |

### 3.2 Column Mapping Configuration

Stored as JSONB in `mig_batches.mapping_config`:

```json
{
  "version": "1.0",
  "mappings": [
    {
      "excel_column": "Adresa",
      "excel_column_aliases": ["Address", "ADRESA", "adresa"],
      "target_table": "elv_elevators",
      "target_field": "building_address",
      "required": true,
      "transform": null
    },
    {
      "excel_column": "Lloji",
      "excel_column_aliases": ["Type", "LLOJI", "Lloji i ashensorit"],
      "target_table": "elv_technical_data",
      "target_field": "elevator_type",
      "required": true,
      "transform": "enum_map",
      "transform_config": {
        "Passenger": "PASSENGER",
        "Ngarkesë": "FREIGHT",
        "Shërbim": "SERVICE",
        "Eskalator": "ESCALATOR"
      }
    }
  ],
  "unmapped_columns": "store_in_metadata"
}
```

## 4. Validation Rules

### 4.1 Field-Level Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| building_address | Not empty, min 5 chars | "Adresa është e detyrueshme" |
| building_municipality | Must match known municipality list | "Bashkia nuk njihet" |
| elevator_type | Must map to valid enum | "Lloji i ashensorit nuk është valid" |
| manufacturer | Not empty | "Prodhuesi është i detyrueshëm" |
| serial_number | Not empty, alphanumeric | "Numri serial është i detyrueshëm" |
| floors_served | Positive integer, 1-100 | "Numri i kateve nuk është valid" |
| manufacturing_year | 1900-current year | "Viti i prodhimit nuk është valid" |
| capacity_kg | Positive integer if provided | "Kapaciteti nuk është valid" |
| speed_ms | Positive decimal if provided | "Shpejtësia nuk është valid" |
| registration_date | Valid date, not future | "Data e regjistrimit nuk është valid" |

### 4.2 Cross-Field Validation

| Rule | Description |
|------|-------------|
| Municipality consistency | If municipality code exists in registry number, it must match building_municipality |
| Date logic | registration_date must be >= manufacturing_year |
| Company reference | If company name provided, attempt fuzzy match against org_organizations; flag if no match |

### 4.3 Municipality Reference Data

Pre-loaded table of Albanian municipalities (61 municipalities):

```
sys_municipalities (id, name, name_en, code, region)
```

Used for validation and registry number generation.

## 5. Duplicate Detection Strategy

### 5.1 Matching Rules (Configurable Priority)

| Priority | Match Criteria | Score Weight |
|----------|---------------|--------------|
| 1 (Exact) | Same serial_number | 100 |
| 2 (High) | Same address + same municipality + same floors_served | 85 |
| 3 (Medium) | Same address + same municipality (fuzzy address match > 90%) | 70 |
| 4 (Low) | Same building_name + same municipality + similar serial | 50 |

**Threshold:** Score >= 70 flags as potential duplicate.

### 5.2 Duplicate Resolution Options

| Action | Description |
|--------|-------------|
| IMPORT | Create new elevator (admin confirms not a duplicate) |
| SKIP | Do not import this row |
| MERGE | Update existing elevator with new data from Excel (field-level selection) |

### 5.3 Fuzzy Matching Implementation

```
For each staged row:
  1. Check exact serial_number match against elv_elevators
  2. If no exact match, compute similarity scores:
     - Address: Levenshtein distance normalized
     - Municipality: exact match
     - Building name: Levenshtein distance normalized
  3. Store highest-scoring match as duplicate_of_id with duplicate_score
  4. Present to admin in review UI with side-by-side comparison
```

## 6. Import Execution

### 6.1 Transaction Strategy

```
BEGIN TRANSACTION
  FOR EACH staging_row WHERE import_action = 'IMPORT':
    1. Create or match owner organization (if provided)
    2. Create or match installer organization (if provided, must exist in Directorate registry)
    3. Create or match certifier organization (if provided, must exist in Directorate registry)
    4. Create or match maintenance organization (if provided)
    5. Create migration placeholder application (type: NEW_REGISTRATION, status: APPROVED)
    6. Create elevator (status: PENDING_CONFIRMATION, migration_batch_id set)
    7. Create technical data
    8. Create responsible entities
    9. Update staging_row.elevator_id
    10. Write audit log entry
  END FOR
  Update mig_batches status = COMPLETED
COMMIT TRANSACTION

ON ERROR:
  ROLLBACK entire transaction
  Update mig_batches status = FAILED
  Store error details in error_log
```

### 6.2 Migration Application Records

For audit integrity, each imported elevator gets a synthetic approved application:

```
app_applications:
  type: NEW_REGISTRATION
  status: APPROVED
  application_number: MIG-{batch_number}-{row_number}
  metadata: { "source": "excel_migration", "batch_id": "...", "original_data": {...} }
```

This maintains the business rule: every elevator has an originating application.

### 6.3 Organization Matching During Import

| Scenario | Action |
|----------|--------|
| Company name matches existing org (fuzzy > 90%) | Link to existing organization |
| Company name not found (INSTALLER/CERTIFIER) | Flag row as warning; import without company link |
| Company name not found (OWNER/MAINTENANCE) | Create new organization with status ACTIVE |
| Multiple fuzzy matches | Flag for admin resolution |

## 7. Rollback Strategy

### 7.1 Rollback Scope

Rollback operates at the **batch level** - all elevators created by a single import batch.

### 7.2 Rollback Execution

```
BEGIN TRANSACTION
  FOR EACH elevator WHERE migration_batch_id = {batch_id}:
    1. Soft-delete elevator (deleted_at = now)
    2. Soft-delete technical data
    3. Soft-delete responsible entities
    4. Soft-delete synthetic application
    5. Write audit log: ROLLBACK
  END FOR
  Update mig_batches status = ROLLED_BACK
  Update mig_batches rolled_back_at = now
COMMIT TRANSACTION
```

### 7.3 Rollback Constraints

| Constraint | Rule |
|------------|------|
| Cannot rollback if elevator is CONFIRMED | Status must be PENDING_CONFIRMATION |
| Cannot rollback if elevator has inspections | Must deregister individually |
| Cannot rollback if elevator has certificates | Certificates must be revoked first |
| Rollback is soft-delete | Data preserved for audit |

## 8. Post-Import Confirmation Workflow

```
Imported Elevator (PENDING_CONFIRMATION)
  → ISHMT Inspector reviews digital file
    → Compare with original Excel data
    → Verify location, technical data, responsible entities
      → CONFIRM → Status: ACTIVE
        → Generate QR code
        → Generate registration certificate (if not provided)
        → Set activation_date
      → REJECT → Status: DEREGISTERED
        → Reason: invalid data, duplicate, demolished
```

Bulk confirmation option: Inspector can confirm multiple elevators from same batch after spot-checking.

## 9. Migration UI Flow

### 9.1 Admin Screens

| Screen | Purpose |
|--------|---------|
| Upload | Drag-and-drop Excel file, select/create mapping config |
| Mapping | Column mapping editor with preview of first 5 rows |
| Validation Results | Summary: total, valid, errors, warnings |
| Staging Review | Table with filters: valid, errors, duplicates |
| Duplicate Resolution | Side-by-side comparison view |
| Import Confirmation | Summary before execution with counts |
| Import Progress | Real-time progress bar during import |
| Batch History | List of all batches with status, actions (view, rollback) |
| Post-Import Confirmation | Queue of PENDING_CONFIRMATION elevators by batch |

### 9.2 Error Handling

| Error Type | Handling |
|------------|----------|
| File format error | Reject upload; show format requirements |
| Column mapping failure | Allow manual mapping before validation |
| Validation errors | Show per-row errors; allow admin to fix in staging |
| Duplicate detected | Require admin decision per row |
| Import transaction failure | Full rollback; show error details |
| Partial company match | Warning; import proceeds without company link |

## 10. Data Quality Report

Generated after each batch import:

| Metric | Description |
|--------|-------------|
| Total rows processed | Count from Excel |
| Successfully imported | Count of IMPORT actions |
| Skipped | Count of SKIP actions |
| Merged | Count of MERGE actions |
| Errors | Count of validation failures |
| Duplicates detected | Count of flagged duplicates |
| Companies matched | Count of successful org matches |
| Companies not found | Count of unmatched company names |
| Missing required fields | Breakdown by field |
| Municipality distribution | Count per municipality |

## 11. Migration Phases

| Phase | Scope |
|-------|-------|
| Phase 1a | Import infrastructure (upload, validate, stage, review) |
| Phase 1b | First pilot batch (single municipality, ~100 elevators) |
| Phase 1c | Full national import (all municipalities) |
| Phase 1d | Post-import confirmation campaign |
| Phase 2 | Re-import capability for updated Excel files (merge mode) |

## 12. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss during import | Transaction-based import; no partial commits |
| Duplicate elevators in registry | Multi-level duplicate detection with human review |
| Incorrect company assignments | Fuzzy matching with manual resolution; unmatched companies flagged |
| Import of demolished elevators | Post-import confirmation by inspectors with local knowledge |
| Large file processing | Stream-based Excel parsing; batch processing in chunks of 500 rows |
| Rollback of confirmed elevators | Rollback blocked for confirmed elevators; deregistration workflow instead |
