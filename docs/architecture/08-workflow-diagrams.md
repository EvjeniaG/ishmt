# Workflow Diagrams

## 1. Application Lifecycle Diagram

The application is the gateway to all elevator registry changes.

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Owner creates application

    DRAFT --> PENDING_INSTALLER : Owner assigns installer
    DRAFT --> CANCELLED : Owner cancels

    PENDING_INSTALLER --> PENDING_CERTIFIER : Installer completes technical data\nand assigns certifier
    PENDING_INSTALLER --> RETURNED : ISHMT returns (rare at this stage)

    PENDING_CERTIFIER --> PENDING_OWNER_SUBMISSION : Certifier uploads certificate
    PENDING_CERTIFIER --> RETURNED : Certifier cannot complete

    PENDING_OWNER_SUBMISSION --> SUBMITTED : Owner reviews and submits to ISHMT
    PENDING_OWNER_SUBMISSION --> RETURNED : Owner sends back to installer/certifier

    SUBMITTED --> UNDER_REVIEW : Inspector picks up for review
    SUBMITTED --> EXPIRED : Auto-expire after configured days

    UNDER_REVIEW --> APPROVED : Inspector approves
    UNDER_REVIEW --> REJECTED : Inspector rejects
    UNDER_REVIEW --> RETURNED : Inspector returns for correction

    RETURNED --> PENDING_INSTALLER : Returned to installer
    RETURNED --> PENDING_CERTIFIER : Returned to certifier
    RETURNED --> PENDING_OWNER_SUBMISSION : Returned to owner

    APPROVED --> [*] : Side effects executed
    REJECTED --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

### Application Type Variations

| Type | Workflow Differences |
|------|---------------------|
| NEW_REGISTRATION | Full workflow above; creates elevator on approval |
| DEREGISTRATION | Owner creates → submits → ISHMT reviews → approval changes elevator status |
| DATA_CORRECTION | Owner creates with field corrections → submits → ISHMT reviews → approval applies corrections |
| DATA_UPDATE | Owner creates with field updates → may require supporting documents → ISHMT reviews → approval applies updates |

## 2. Elevator Lifecycle Diagram

```mermaid
stateDiagram-v2
    [*] --> PENDING_CONFIRMATION : Excel migration import
    [*] --> ACTIVE : Approved NEW_REGISTRATION application

    PENDING_CONFIRMATION --> ACTIVE : ISHMT inspector confirms migrated data
    PENDING_CONFIRMATION --> DEREGISTERED : Data invalid / duplicate

    ACTIVE --> SUSPENDED : ISHMT suspension\n(failed inspection, safety issue, non-compliance)
    ACTIVE --> DEREGISTERED : Approved deregistration application

    SUSPENDED --> ACTIVE : Issue resolved\n(re-inspection passed, compliance restored)
    SUSPENDED --> DEREGISTERED : Approved deregistration application

    DEREGISTERED --> [*] : QR deactivated, final state
```

### Elevator Lifecycle Events

```mermaid
flowchart TD
    A[Application Approved] --> B[Generate Registry Number]
    B --> C[Create Elevator Record]
    C --> D[Copy Technical Data from Application]
    D --> E[Assign Responsible Entities]
    E --> F[Generate Registration Certificate]
    F --> G[Generate QR Code]
    G --> H[Set Status: ACTIVE]
    H --> I[Set Activation Date]
    I --> J[Send Notifications to All Parties]
    J --> K[Schedule Initial Inspection]

    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style K fill:#fff9c4
```

## 3. Registration Workflow (Complete)

```mermaid
sequenceDiagram
    actor Owner
    actor Installer
    actor Certifier as Certifier/OMI
    actor Inspector as ISHMT Inspector
    participant System

    Owner->>System: Create NEW_REGISTRATION application
    System-->>Owner: Application DRAFT (APP-2026-REG-XXXXXX)

    Owner->>System: Select installer company (from Directorate registry)
    System-->>Installer: Notification: assigned to application

    Installer->>System: Fill technical data (type, manufacturer, serial, capacity, etc.)
    Installer->>System: Select certifier/OMI company
    System-->>Certifier: Notification: assigned to application

    Certifier->>System: Upload installation certificate
    Certifier->>System: Upload certification documents
    System-->>Owner: Notification: ready for your review

    Owner->>System: Review complete application
    Owner->>System: Submit to ISHMT
    System-->>Inspector: Notification: new application in queue

    Inspector->>System: Pick up for review
    Inspector->>System: Review all data and documents

    alt Approved
        Inspector->>System: Approve application
        System->>System: Generate registry number
        System->>System: Create elevator record
        System->>System: Generate registration certificate
        System->>System: Generate QR code
        System->>System: Set elevator ACTIVE
        System-->>Owner: Notification: elevator registered
        System-->>Installer: Notification: installation registered
        System-->>Certifier: Notification: certification registered
    else Rejected
        Inspector->>System: Reject with reason
        System-->>Owner: Notification: application rejected
    else Returned
        Inspector->>System: Return to [installer/certifier/owner]
        System-->>Owner: Notification: corrections required
    end
```

## 4. Deregistration Workflow

```mermaid
flowchart TD
    A[Owner identifies elevator for deregistration] --> B[Create DEREGISTRATION application]
    B --> C[Provide deregistration reason\n(demolished, replaced, building demolished, other)]
    C --> D[Upload supporting documents if required]
    D --> E[Submit to ISHMT]

    E --> F{ISHMT Inspector Review}
    F -->|Approve| G[Elevator status → DEREGISTERED]
    G --> H[Set deregistration_date]
    H --> I[Deactivate QR code]
    I --> J[Revoke active certificates]
    J --> K[Close maintenance contracts]
    K --> L[Record in status history]
    L --> M[Notify owner and parties]

    F -->|Reject| N[Application REJECTED with reason]
    N --> O[Notify owner]

    F -->|Return| P[Return to owner for additional info]
    P --> D

    style G fill:#ffcdd2
    style M fill:#c8e6c9
```

## 5. Data Correction Workflow

For fixing **erroneous** data in the registry (data was wrong at time of registration).

```mermaid
flowchart TD
    A[Owner/ISHMT identifies error] --> B[Create DATA_CORRECTION application]
    B --> C[Select elevator to correct]
    C --> D[Specify fields to correct\nwith old value → new value]
    D --> E[Provide justification and evidence documents]
    E --> F[Submit to ISHMT]

    F --> G{ISHMT Inspector Review}
    G -->|Approve| H[Apply field corrections to elevator record]
    H --> I[Record correction in audit trail\nwith before/after snapshots]
    I --> J[Notify owner]

    G -->|Reject| K[Application rejected\noriginal data unchanged]
    G -->|Return| L[Return for additional evidence]
    L --> E

    style H fill:#fff9c4
```

**Correctable fields:** building address, technical specifications, responsible entity assignments (with evidence).

## 6. Data Update Workflow

For **legitimate changes** to registered data (owner transfer, maintenance company change, address change due to municipality reorganization).

```mermaid
flowchart TD
    A[Change event occurs] --> B{Who initiates?}
    B -->|Owner| C[Create DATA_UPDATE application]
    B -->|ISHMT| D[ISHMT creates on behalf of owner]

    C --> E[Select elevator]
    D --> E
    E --> F[Specify update type]
    F --> G{Update Type}

    G -->|Owner Transfer| H[New owner organization details\n+ transfer document]
    G -->|Maintenance Company Change| I[New maintenance company\n(must be QKB validated)\n+ new contract]
    G -->|Address Change| J[New address details\n+ supporting document]
    G -->|Other| K[Specify fields and justification]

    H --> L[Submit to ISHMT]
    I --> L
    J --> L
    K --> L

    L --> M{ISHMT Review}
    M -->|Approve| N[Apply updates to elevator]
    N --> O[Update responsible entities\nwith validity periods]
    O --> P[Record in audit trail]
    P --> Q[Notify all affected parties]

    M -->|Reject| R[Reject with reason]
    M -->|Return| S[Return for more info]

    style N fill:#c8e6c9
```

## 7. Maintenance Workflow

```mermaid
stateDiagram-v2
    [*] --> UNASSIGNED : Elevator activated without maintenance company

    UNASSIGNED --> ASSIGNED : Maintenance company assigned\n(via DATA_UPDATE or during registration)
    ASSIGNED --> CONTRACTED : Maintenance contract registered
    CONTRACTED --> COMPLIANT : Maintenance record logged within interval
    COMPLIANT --> COMPLIANT : Periodic maintenance logged
    COMPLIANT --> NON_COMPLIANT : Maintenance overdue beyond grace period
    NON_COMPLIANT --> COMPLIANT : Maintenance record logged
    NON_COMPLIANT --> ESCALATED : ISHMT notified after escalation threshold
    ESCALATED --> COMPLIANT : Maintenance restored
    ESCALATED --> SUSPENDED : ISHMT suspends elevator for non-compliance
```

### Maintenance Record Flow

```mermaid
sequenceDiagram
    actor MaintCompany as Maintenance Company
    actor Owner
    actor Inspector as ISHMT Inspector
    participant System

    MaintCompany->>System: Log maintenance record
    Note over MaintCompany,System: Type, date, technician, findings, documents

    System->>System: Update compliance status
    System->>System: Calculate next due date

    alt Compliant
        System-->>Owner: Notification: maintenance completed
    else Non-compliant
        System-->>Owner: Warning: maintenance overdue
        System-->>MaintCompany: Warning: maintenance overdue
        System-->>Inspector: Alert: non-compliance flagged
    end
```

## 8. Inspection Workflow

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED : Inspector schedules inspection

    SCHEDULED --> CONDUCTED : Inspector conducts on-site inspection
    SCHEDULED --> CANCELLED : Cancelled (reschedule)

    CONDUCTED --> PASSED : Result: PASS
    CONDUCTED --> FAILED : Result: FAIL
    CONDUCTED --> CONDITIONAL : Result: CONDITIONAL

    PASSED --> CERTIFIED : Inspection certificate issued
    CERTIFIED --> [*] : Next inspection date set

    FAILED --> RE_INSPECTION_DUE : Re-inspection deadline set
    RE_INSPECTION_DUE --> SCHEDULED : Re-inspection scheduled
    RE_INSPECTION_DUE --> SUSPENDED : Deadline passed without re-inspection

    CONDITIONAL --> REMEDIATION : Conditions must be met
    REMEDIATION --> SCHEDULED : Re-inspection scheduled
```

### Inspection Sequence

```mermaid
sequenceDiagram
    actor Inspector as ISHMT Inspector
    actor Owner
    participant System

    System->>System: Daily job: identify due inspections
    System-->>Inspector: Notification: inspections due in region

    Inspector->>System: Schedule inspection for elevator
    System-->>Owner: Notification: inspection scheduled on [date]

    Inspector->>System: Conduct inspection, record result
    Inspector->>System: Upload inspection report

    alt PASS
        System->>System: Generate periodic inspection certificate
        System->>System: Set next inspection date
        System-->>Owner: Notification: inspection passed
    else FAIL
        System->>System: Set re-inspection deadline
        System-->>Owner: Notification: inspection failed, remediation required
    else CONDITIONAL
        System->>System: Record conditions
        System-->>Owner: Notification: conditional pass, conditions listed
    end
```

## 9. QR Code Workflow

```mermaid
flowchart TD
    A[Elevator Activated] --> B[Generate unique short code\n12-char alphanumeric]
    B --> C[Generate QR image\nencoding public profile URL]
    C --> D[Store QR record\nis_active = true]
    D --> E[QR available for download by owner]

    E --> F{Public scans QR}
    F --> G[Increment scan_count]
    G --> H[Display public profile]
    H --> I[Show: registry number, status,\nlast inspection date, compliance indicator]
    H --> J[Do NOT show: owner contact,\nfull technical data, documents]

    K[Elevator Deregistered] --> L[Set is_active = false]
    L --> M[Set deactivated_at]
    M --> N[Public profile shows: DEREGISTERED]

    O[Elevator Re-activated\nafter suspension] --> P[Generate new QR code]
    P --> Q[Previous QR deactivated]
```

## 10. Citizen Reporting Workflow

```mermaid
flowchart TD
    A{Citizen access point}
    A -->|Anonymous| B[Public report form]
    A -->|Authenticated| C[Logged-in report form]

    B --> D[Select report type]
    C --> D

    D --> E{Report Type}
    E -->|No QR| F[Provide location/address\nOptional: photo]
    E -->|Safety Issue| G[Provide location + description\nPriority: HIGH/URGENT\nOptional: photo, elevator ID]
    E -->|Complaint| H[Provide description\nOptional: elevator ID, photo]

    F --> I[Submit report]
    G --> I
    H --> I

    I --> J[System assigns report number]
    J --> K[Status: SUBMITTED]

    K --> L[ISHMT Inspector triages]
    L --> M{Decision}
    M -->|Valid| N[Assign to inspector\nStatus: ASSIGNED]
    M -->|Invalid| O[Dismiss\nStatus: DISMISSED]

    N --> P[Inspector investigates]
    P --> Q{Findings}
    Q -->|Elevator identified| R[Link to elevator record\nMay trigger extraordinary inspection]
    Q -->|No elevator found| S[Field investigation required]
    Q -->|Safety confirmed| T[Trigger suspension workflow]

    R --> U[Resolve report\nStatus: RESOLVED]
    S --> U
    T --> U

    U --> V{Reporter authenticated?}
    V -->|Yes| W[Notify reporter of resolution]
    V -->|No| X[No notification possible]
```

## 11. Excel Migration Workflow

```mermaid
flowchart TD
    A[Admin uploads Excel file] --> B[Create migration batch\nStatus: UPLOADED]
    B --> C[Parse Excel rows]
    C --> D[Apply column mapping config]
    D --> E[Validate each row\nStatus: VALIDATING]

    E --> F{Validation}
    F -->|Errors| G[Mark row with errors\nIncrement error_count]
    F -->|Valid| H[Stage in mig_staging_records\nStatus: STAGED]

    H --> I[Run duplicate detection]
    I --> J{Duplicate check}
    J -->|Duplicate found| K[Flag with duplicate_score\nand duplicate_of reference]
    J -->|Unique| L[Mark as ready for import]

    K --> M[Admin reviews staging area]
    L --> M

    M --> N{Admin decision per row}
    N -->|Import| O[Mark: IMPORT]
    N -->|Skip| P[Mark: SKIP]
    N -->|Merge| Q[Mark: MERGE with existing]

    O --> R[Admin executes batch import\nStatus: IMPORTING]
    P --> R
    Q --> R

    R --> S[For each IMPORT row:\nCreate elevator PENDING_CONFIRMATION\nCreate technical data\nLink to batch]
    S --> T[Status: COMPLETED]

    T --> U{Post-import}
    U -->|Issues found| V[Admin executes rollback\nStatus: ROLLED_BACK]
    V --> W[Soft-delete all elevators\nfrom this batch]
    U -->|OK| X[ISHMT inspectors confirm\nmigrated elevators]
    X --> Y[PENDING_CONFIRMATION → ACTIVE]
```

## 12. QKB Validation Workflow (Phase 2)

```mermaid
sequenceDiagram
    actor User as Maintenance Company User
    participant System
    participant QKB as QKB API

    User->>System: Register maintenance company with NIPT
    System->>System: Create org with status PENDING_VALIDATION

    System->>QKB: Validate NIPT
    QKB-->>System: Company data (name, status, legal form, address)

    alt Company Active in QKB
        System->>System: Update org with QKB data
        System->>System: Set qkb_validated = true
        System->>System: Set status = ACTIVE
        System-->>User: Company validated and active
    else Company Not Found / Inactive
        System->>System: Set status = PENDING_VALIDATION
        System-->>User: Validation failed, contact admin
        System-->>System: Admin notification for manual review
    end
```

**Phase 1 fallback:** Manual NIPT entry with admin verification flag.
