# Technical Architecture

## 1. Architecture Style

**Modular Monolith** deployed as a single Next.js application with clear domain boundaries, designed for future service extraction without premature microservices complexity.

Rationale for government context:
- Simpler deployment and operations for ISHMT IT capacity
- ACID transactions across workflow steps
- Single audit log stream
- Lower infrastructure cost
- Extractable modules when integration load demands it (Phase 3)

## 2. High-Level Technical Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Web Portal │  │ Public QR   │  │  Admin UI   │  │ Mobile Web  │   │
│  │  (Next.js)  │  │  Profile    │  │  Dashboard  │  │ (responsive)│   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION SERVER                           │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        MIDDLEWARE LAYER                           │   │
│  │  Auth Middleware │ RBAC Guard │ Rate Limiter │ Audit Interceptor │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │   Server    │ │  API Routes │ │  Workflow   │ │  Background │       │
│  │   Actions   │ │  (REST)     │ │   Engine    │ │   Jobs      │       │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘       │
│         │               │               │               │               │
│  ┌──────┴───────────────┴───────────────┴───────────────┴──────────┐   │
│  │                      DOMAIN SERVICES LAYER                        │   │
│  │  ApplicationService │ ElevatorService │ CertificateService       │   │
│  │  DocumentService    │ InspectionService │ MaintenanceService     │   │
│  │  NotificationService│ MigrationService  │ ReportingService       │   │
│  │  OrganizationService│ CitizenReportService │ AuditService        │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│  ┌──────────────────────────────┴───────────────────────────────────┐   │
│  │                      DATA ACCESS LAYER (Prisma)                   │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
   │ PostgreSQL  │        │  Document   │        │    Redis    │
   │   (Primary) │        │   Storage   │        │  (Phase 2)  │
   │             │        │  (S3/Local) │        │ Cache/Queue │
   └─────────────┘        └─────────────┘        └─────────────┘
```

## 3. Application Layers

### 3.1 Presentation Layer (Next.js App Router)

```
src/
├── app/
│   ├── (public)/           # Unauthenticated routes
│   │   ├── q/[code]/       # Public QR profile
│   │   ├── report/         # Citizen reporting
│   │   └── auth/           # Login/register
│   ├── (portal)/           # Authenticated user portal
│   │   ├── dashboard/
│   │   ├── applications/
│   │   ├── elevators/
│   │   ├── maintenance/
│   │   ├── inspections/
│   │   └── documents/
│   ├── (ishmt)/            # ISHMT staff portal
│   │   ├── review/
│   │   ├── inspect/
│   │   ├── reports/
│   │   └── admin/
│   ├── (directorate)/      # Directorate portal
│   │   └── companies/
│   └── api/                # API routes (webhooks, exports, integrations)
├── components/
├── lib/
│   ├── services/           # Domain services
│   ├── workflows/          # State machine definitions
│   ├── auth/               # NextAuth config + RBAC
│   ├── storage/            # Document storage abstraction
│   └── audit/              # Audit interceptor
└── prisma/
    └── schema.prisma
```

### 3.2 API Design Principles

| Principle | Implementation |
|-----------|----------------|
| Server Actions for mutations | Form submissions, workflow transitions |
| API Routes for integrations | Webhooks, file downloads, external system callbacks |
| No direct DB access from components | All data through domain services |
| Idempotent workflow transitions | Transition tokens prevent double-submit |
| Pagination | Cursor-based for large lists (elevators, audit logs) |

### 3.3 Workflow Engine

Custom lightweight state machine (not external BPM engine in Phase 1):

```typescript
// Conceptual - not implementation code
WorkflowDefinition {
  type: ApplicationType
  states: State[]
  transitions: Transition[]
  guards: GuardFunction[]      // Role + data validation
  sideEffects: SideEffect[]    // Notifications, elevator creation
}
```

Each transition:
1. Validates current state
2. Checks actor permissions (RBAC + organization scope)
3. Validates required data completeness
4. Executes in database transaction
5. Triggers side effects (async where possible)
6. Writes audit log entry

### 3.4 Document Storage Abstraction

```typescript
// Interface - implementation behind adapter pattern
interface DocumentStorage {
  upload(file: Buffer, metadata: DocumentMetadata): Promise<StorageRef>
  download(ref: StorageRef): Promise<Buffer>
  delete(ref: StorageRef): Promise<void>
  getSignedUrl(ref: StorageRef, expiry: Duration): Promise<string>
}

// Adapters
LocalFilesystemStorage    // Development
S3CompatibleStorage       // Production (MinIO or cloud S3)
```

Documents stored with:
- UUID-based paths (no predictable URLs)
- SHA-256 checksum for integrity
- MIME type validation
- Max file size enforcement (configurable, default 25MB)
- Virus scan hook (Phase 2)

## 4. Database Architecture

### 4.1 PostgreSQL Configuration

| Setting | Value |
|---------|-------|
| Version | 16+ |
| Encoding | UTF-8 |
| Timezone | UTC (application layer handles Europe/Tirane display) |
| Connection pooling | PgBouncer (production) |
| Backups | Daily full + WAL archiving |
| Replication | Read replica (Phase 2) for reporting queries |

### 4.2 Schema Organization

Single schema `public` with table prefixes by domain:

| Prefix | Domain |
|--------|--------|
| `auth_` | Users, sessions, roles |
| `org_` | Organizations, memberships |
| `app_` | Applications, application data |
| `elv_` | Elevators, technical data, status |
| `cert_` | Certificates |
| `doc_` | Documents, attachments |
| `maint_` | Maintenance records, contracts |
| `insp_` | Inspections, results |
| `qr_` | QR codes |
| `cit_` | Citizen reports |
| `audit_` | Audit logs |
| `mig_` | Migration batches, staging |
| `sys_` | Configuration, notifications |

### 4.3 Indexing Strategy

- All foreign keys indexed
- Composite indexes on frequently filtered columns (status + municipality, expiry dates)
- Partial indexes on active records (`WHERE deleted_at IS NULL`)
- GIN index on JSONB audit snapshots for search (Phase 2)
- Full-text search on elevator registry number and address (Phase 2)

## 5. Authentication Architecture

### Phase 1: NextAuth.js

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │────▶│  NextAuth.js │────▶│  PostgreSQL  │
│          │◀────│  (Credentials│◀────│  (users,    │
│          │     │   + JWT)     │     │   sessions)  │
└──────────┘     └──────────────┘     └──────────────┘
```

- Credentials provider with bcrypt password hashing
- JWT sessions with 8-hour expiry
- Refresh via session extension on activity
- Role and organization claims embedded in session token
- Middleware route protection by role

### Phase 2: e-Albania Integration

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Client  │────▶│  NextAuth.js │────▶│  e-Albania   │────▶│ National │
│          │◀────│  (OIDC)      │◀────│  IdP         │◀────│ ID Check │
└──────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

- OIDC provider adapter for e-Albania
- Account linking (e-Albania NID → system user)
- Fallback credentials for non-e-Albania users (foreign companies)

## 6. Authorization Architecture

```
Request → Auth Middleware → RBAC Guard → Organization Scope Guard → Handler
```

### RBAC Guard
Checks `user.role` against `requiredPermissions` for the route/action.

### Organization Scope Guard
Ensures user can only access data belonging to their organization(s):
- Owner sees their elevators
- Installer sees applications where they are assigned
- ISHMT sees all

Implemented as Prisma middleware extension that injects `where` clauses.

## 7. Integration Architecture (Future-Ready)

### 7.1 Integration Adapter Pattern

```
┌─────────────────────────────────────────┐
│           Integration Gateway            │
│  ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │ QKB     │ │e-Albania│ │Directorate│ │
│  │ Adapter │ │ Adapter │ │  Adapter  │ │
│  └────┬────┘ └────┬────┘ └─────┬─────┘ │
│       │           │            │        │
│  ┌────┴───────────┴────────────┴────┐  │
│  │     Integration Service Bus       │  │
│  │  (async queue + retry + circuit   │  │
│  │   breaker + audit log)            │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 7.2 Integration Endpoints (Planned)

| System | Direction | Protocol | Phase |
|--------|-----------|----------|-------|
| e-Albania | Inbound (auth) + Outbound (notifications) | OIDC + REST | 2 |
| QKB | Outbound (company validation) | REST/SOAP | 2 |
| Directorate Licensing | Inbound (company sync) | REST + webhook | 2 |
| e-Inspection | Bidirectional | REST | 3 |
| National GIS | Outbound (address validation) | REST | 3 |

### 7.3 QKB Validation Flow (Phase 2)

```
Maintenance Company Registration
  → User enters NIPT (tax ID)
    → System calls QKB Adapter
      → QKB returns: company name, status, legal form, address
        → System stores validation result + timestamp
          → If ACTIVE → company available for assignment
            → If not ACTIVE → registration blocked
```

Phase 1: Manual NIPT entry with admin verification flag.

## 8. Infrastructure Architecture

### 8.1 Docker Compose (Development & Staging)

```yaml
services:
  app:          # Next.js application
  db:           # PostgreSQL 16
  storage:      # MinIO (S3-compatible)
  # redis:      # Phase 2
```

### 8.2 Production Deployment

```
┌─────────────────────────────────────────────────┐
│                  Reverse Proxy (Nginx)             │
│                  TLS termination                   │
│                  Rate limiting                     │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     ┌─────────┐ ┌─────────┐ ┌─────────┐
     │ App     │ │ App     │ │ App     │  (horizontal scaling)
     │Instance1│ │Instance2│ │Instance3│
     └────┬────┘ └────┬────┘ └────┬────┘
          │           │           │
          ▼           ▼           ▼
     ┌─────────────────────────────────┐
     │     PostgreSQL (Primary)        │
     │     + Read Replica (Phase 2)    │
     └─────────────────────────────────┘
          │
          ▼
     ┌─────────────────────────────────┐
     │     Object Storage (S3/MinIO)   │
     └─────────────────────────────────┘
```

### 8.3 Environment Strategy

| Environment | Purpose | Data |
|-------------|---------|------|
| Development | Local Docker | Seed data |
| Staging | Pre-production testing | Anonymized production copy |
| Production | Live system | Real data |

## 9. Observability (Phase 1 Minimum)

| Concern | Tool |
|---------|------|
| Application logs | Structured JSON logging (pino) |
| Error tracking | Sentry (Phase 1) |
| Health checks | `/api/health` endpoint |
| Database monitoring | pg_stat_statements |
| Uptime monitoring | External ping (Phase 2) |

## 10. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Availability | 99.5% (government SLA) |
| Response time | < 2s for page loads, < 500ms for API |
| Concurrent users | 500 (Phase 1), 2000 (Phase 3) |
| Data retention | 10 years minimum (regulatory) |
| Backup RPO | 1 hour |
| Backup RTO | 4 hours |
| Audit log retention | Permanent (append-only) |
| Document storage | Unlimited per elevator (practical limit 1GB/elevator) |

## 11. Technology Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monolith vs Microservices | Modular Monolith | Government ops simplicity, ACID workflows |
| ORM | Prisma | Type safety, migration management, Next.js ecosystem |
| State machine | Custom lightweight | No BPM overhead; full control over Albanian legal workflows |
| File storage | Abstraction + S3 | Cloud-agnostic; works on-premise with MinIO |
| Auth Phase 1 | NextAuth credentials | Fast delivery; e-Albania integration is Phase 2 |
| Queue | In-process (Phase 1) → Redis (Phase 2) | Avoid infrastructure complexity early |
| PDF generation | Server-side (puppeteer or pdfkit) | Certificate generation on approval |
| QR generation | qrcode library | Standard QR with signed URL |
