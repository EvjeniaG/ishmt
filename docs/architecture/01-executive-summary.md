# ISHMT Digital Elevator Registry System
## Executive Summary

**Institution:** State Inspectorate for Market Surveillance (ISHMT)  
**Country:** Republic of Albania  
**System Type:** National workflow-driven government registry platform  
**Status:** Architecture Blueprint - Pre-Implementation

---

## 1. Purpose

The ISHMT Digital Elevator Registry System (DERS) will replace fragmented Excel registries, email-based communication, manual document exchange, and ad-hoc approval workflows with a single authoritative national platform for the complete lifecycle of elevators in Albania.

This is **not** a demo website, landing page, or simple CRUD application. It is a **workflow-driven, audit-grade government registry** where business rules, legal accountability, and multi-party collaboration are first-class concerns.

## 2. Strategic Objectives

| Objective | Outcome |
|-----------|---------|
| Single source of truth | One national registry of all elevators |
| Legal traceability | Immutable audit trail for every state change |
| Process digitization | End-to-end digital workflows replacing manual steps |
| Public transparency | QR-based public elevator profiles |
| Regulatory compliance | Automated tracking of certificates, inspections, maintenance |
| Data migration | Controlled import of legacy Excel data with validation |
| Future integration | e-Albania, QKB, Directorate licensing, e-Inspection readiness |

## 3. Core Design Principle

> **Applications are created first. Elevators are created only after ISHMT approval.**

This rule governs the entire system architecture. No elevator record may exist in the active registry without a completed, approved application workflow. Legacy migrated elevators enter as `PENDING_CONFIRMATION` until validated.

## 4. Central Business Object: Elevator Digital File

Each approved elevator becomes a **Digital File** aggregating:

- Registration metadata (registry number, location, owner)
- Technical specifications
- Responsible entities (owner, installer, certifier/OMI, maintenance company)
- Certificates (installation, periodic, conformity)
- QR code (public profile link)
- Inspection history
- Maintenance history
- Uploaded documents (with classification and retention)
- Status history
- Full audit trail

## 5. Stakeholder Landscape

| Stakeholder | Role in System |
|-------------|----------------|
| Public Citizen | QR lookup, safety reporting, complaints |
| Owner / Building Administrator | Application initiation, submission, updates |
| Installation Company | Technical data entry (pre-authorized by Directorate) |
| Certification Company / OMI | Certification upload (pre-authorized by Directorate) |
| Maintenance Company | Maintenance records (QKB-validated) |
| ISHMT Inspector | Review, inspection, enforcement |
| ISHMT Administrator | System configuration, user management |
| Directorate of Internal Market Policies | Installer/OMI company registry management |

## 6. Technology Stack (Approved)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router) |
| Backend | Next.js API Routes / Server Actions |
| Database | PostgreSQL 16+ |
| ORM | Prisma |
| Authentication | NextAuth.js (Phase 1) → e-Albania OIDC (Phase 2+) |
| Document Storage | Abstraction layer (local/S3-compatible) |
| Infrastructure | Docker, containerized deployment |
| Queue (Phase 2) | Background job processor for notifications, imports |

## 7. Delivery Approach

Delivery is phased across three roadmap stages:

- **Phase 1 - Foundation & Registration:** Core platform, application workflow, elevator creation, certificates, QR, Excel migration, basic reporting
- **Phase 2 - Operations & Integration:** Maintenance/inspection depth, QKB integration, e-Albania auth, advanced reporting, notifications
- **Phase 3 - National Ecosystem:** e-Inspection integration, analytics, API gateway for inter-agency data exchange, mobile inspector app

## 8. Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Legacy data quality | Staged import with validation, duplicate detection, rollback |
| Multi-party workflow complexity | Explicit state machine per workflow type; no implicit transitions |
| Document security | Classification-based access; encrypted storage; audit on every access |
| Company impersonation | Directorate-managed installer/OMI registry; QKB validation for maintenance |
| Regulatory change | Configurable workflow rules; versioned certificate templates |

## 9. Success Criteria

1. 100% of new elevator registrations flow through digital application workflow
2. Zero elevator records created without approved application (except controlled migration)
3. Complete audit trail retrievable for any elevator within 30 seconds
4. Public QR profile accessible without authentication
5. Legacy Excel data imported with < 2% unresolved duplicate rate
6. All document access events logged with user, timestamp, and action

## 10. Architecture Document Index

| # | Document |
|---|----------|
| 01 | Executive Summary (this document) |
| 02 | Functional Architecture |
| 03 | Technical Architecture |
| 04 | Module Breakdown |
| 05 | User Access Matrix |
| 06 | Database Design |
| 07 | Entity Relationship Diagram |
| 08 | Workflow Diagrams |
| 09 | Security Design |
| 10 | Migration Design |
| 11 | Roadmap Phase 1 |
| 12 | Roadmap Phase 2 |
| 13 | Roadmap Phase 3 |

---

**Next Step:** Architecture review and approval by ISHMT stakeholders before any implementation begins.
