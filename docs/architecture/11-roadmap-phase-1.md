# Roadmap - Phase 1: Foundation & Core Registry

**Duration:** 6–8 months  
**Goal:** Replace Excel registries and email workflows with a functional digital registration platform.

---

## Phase 1 Deliverables

### Sprint 1–2: Infrastructure & Identity (Weeks 1–4)

| Deliverable | Details |
|-------------|---------|
| Project scaffolding | Next.js App Router, Prisma, PostgreSQL, Docker Compose |
| Database schema | All Phase 1 tables, enums, indexes, seed data |
| Authentication | NextAuth credentials provider, registration, login, password reset |
| Authorization | RBAC seed data, middleware guards, organization scoping |
| User management | Profile CRUD, organization membership |
| Audit service | Audit interceptor, append-only logging |
| CI/CD pipeline | Lint, type-check, test, Docker build |

**Exit criteria:** Users can register, login, and see role-appropriate empty dashboard.

---

### Sprint 3–4: Organization & Directorate (Weeks 5–8)

| Deliverable | Details |
|-------------|---------|
| Organization module | CRUD with type-specific rules |
| Directorate portal | Installer and OMI company management |
| License management | License CRUD, expiry tracking |
| Company search | Filter by type, status, municipality |
| Organization membership | User-to-org assignment with roles |
| QKB validation (manual) | NIPT entry with admin verification flag |

**Exit criteria:** Directorate can manage installer/OMI registry; maintenance companies can register with manual QKB verification.

---

### Sprint 5–7: Application Workflow (Weeks 9–14)

| Deliverable | Details |
|-------------|---------|
| Workflow engine | State machine for application lifecycle |
| NEW_REGISTRATION flow | Full multi-party workflow |
| Application forms | Owner, installer, certifier data entry screens |
| Assignment management | Installer/certifier selection from active companies |
| Document upload | Application document upload with classification |
| Submission & review | Owner submit, inspector review queue |
| Approval side-effects | Elevator creation, certificate, QR generation |
| DEREGISTRATION flow | Complete deregistration workflow |
| DATA_CORRECTION flow | Field correction with evidence |
| DATA_UPDATE flow | Owner transfer, maintenance change, address update |
| Workflow history | Timeline view per application |
| Notifications | In-app + email for all workflow events |

**Exit criteria:** Complete registration workflow from application to active elevator with certificate and QR.

---

### Sprint 8–9: Elevator Digital File (Weeks 15–18)

| Deliverable | Details |
|-------------|---------|
| Elevator registry | Digital file aggregated view |
| Registry number generation | Municipality-aware sequential numbering |
| Technical data display | Full technical specifications |
| Responsible entities | Current and historical assignments |
| Status management | Active, suspended, deregistered |
| Status history | Timeline of all status changes |
| Search & filter | By municipality, status, owner, company, registry number |
| Certificate module | Upload, generation, expiry tracking |
| QR code module | Generation, public profile page, deactivation |

**Exit criteria:** Approved elevators have complete digital files accessible to authorized parties; public QR profiles work.

---

### Sprint 10–11: Operations (Weeks 19–22)

| Deliverable | Details |
|-------------|---------|
| Maintenance module | Company assignment, contract registration, record logging |
| Basic compliance | Days-since-last-maintenance calculation |
| Inspection module | Scheduling, result recording, report upload |
| Inspection certificates | Auto-generation on PASS |
| Next inspection scheduling | Auto-calculation based on config |
| Citizen reporting | Anonymous and authenticated report submission |
| Report triage | ISHMT inspector queue and resolution |

**Exit criteria:** Maintenance and inspection records can be logged; citizen reports flow through triage.

---

### Sprint 12–13: Migration & Reporting (Weeks 23–26)

| Deliverable | Details |
|-------------|---------|
| Excel upload & parsing | .xlsx/.xls support |
| Column mapping | Configurable mapping with preview |
| Validation engine | Field and cross-field validation |
| Staging & duplicate detection | Review UI with resolution |
| Batch import & rollback | Transaction-based import with rollback |
| PENDING_CONFIRMATION workflow | Inspector confirmation of migrated data |
| Dashboard | Role-specific KPI widgets |
| Basic reports | Operational and regulatory report templates |
| Report export | PDF and Excel export |

**Exit criteria:** Legacy Excel data can be imported, reviewed, and confirmed; dashboards show registry metrics.

---

### Sprint 14: Hardening & Launch (Weeks 27–28)

| Deliverable | Details |
|-------------|---------|
| Security testing | RBAC matrix verification, OWASP scan |
| Performance testing | Load test with 10,000 elevator records |
| UAT | User acceptance testing with ISHMT staff |
| Documentation | User manuals per role (Albanian) |
| Training | ISHMT inspector and admin training sessions |
| Pilot launch | Single municipality go-live |
| Monitoring | Health checks, error tracking, log aggregation |

**Exit criteria:** System passes security and performance tests; pilot municipality operational.

---

## Phase 1 Module Priority Matrix

| Module | Priority | Sprint |
|--------|----------|--------|
| Authentication | P0 | 1–2 |
| Authorization | P0 | 1–2 |
| Organizations | P0 | 3–4 |
| Directorate Admin | P0 | 3–4 |
| Applications | P0 | 5–7 |
| Elevators | P0 | 8–9 |
| Certificates | P0 | 8–9 |
| QR Codes | P0 | 8–9 |
| Documents | P0 | 5–7 |
| Notifications | P1 | 5–7 |
| Maintenance | P1 | 10–11 |
| Inspections | P1 | 10–11 |
| Citizen Reporting | P1 | 10–11 |
| Excel Import | P1 | 12–13 |
| Reporting/Dashboard | P1 | 12–13 |
| Audit Logs | P0 | 1–2 |

## Phase 1 Team Estimate

| Role | Count | Duration |
|------|-------|----------|
| Solution Architect | 1 | Part-time throughout |
| Senior Full-Stack Developer | 2 | Full-time |
| Frontend Developer | 1 | Full-time |
| QA Engineer | 1 | From Sprint 5 |
| DevOps Engineer | 1 | Part-time |
| UI/UX Designer | 1 | Sprint 1–7 |
| ISHMT Business Analyst | 1 | Part-time (requirements validation) |

## Phase 1 Success Metrics

| Metric | Target |
|--------|--------|
| Registration workflow completion rate | > 95% of started applications |
| Average registration time | < 15 business days (vs. current ~30+ days) |
| Legacy data import | > 90% of Excel records imported |
| System uptime | > 99% during pilot |
| User satisfaction (ISHMT staff) | > 4/5 in UAT survey |

## Phase 1 Explicitly Deferred

- e-Albania authentication integration
- QKB API automated validation
- SMS notifications
- MFA for admin users
- Mobile native application
- GIS/address validation
- Digital signature on certificates
- Payment processing
- Advanced analytics
- API gateway for external systems
- Read replica for reporting
- Audit log partitioning
