# ISHMT Digital Elevator Registry System - Architecture Blueprint

**Version:** 1.0  
**Date:** June 8, 2026  
**Status:** Awaiting Stakeholder Approval

---

## Document Index

| # | Document | Description |
|---|----------|-------------|
| [01](01-executive-summary.md) | Executive Summary | Strategic overview, objectives, risks, success criteria |
| [02](02-functional-architecture.md) | Functional Architecture | Business domains, workflows, business rules, modules |
| [03](03-technical-architecture.md) | Technical Architecture | Stack, layers, infrastructure, integration patterns |
| [04](04-module-breakdown.md) | Module Breakdown | 18 modules with dependencies, capabilities, entities |
| [05](05-user-access-matrix.md) | User Access Matrix | 8 roles × all modules, scoping rules, workflow permissions |
| [06](06-database-design.md) | Database Design | 30+ tables, enums, indexes, relationships, audit strategy |
| [07](07-entity-relationship-diagram.md) | ER Diagram | Full system ERD, core domain ERD, organization ERD |
| [08](08-workflow-diagrams.md) | Workflow Diagrams | 12 workflows including registration, deregistration, maintenance, inspection, QR, citizen reporting, migration |
| [09](09-security-design.md) | Security Design | RBAC, org scoping, document security, audit model, threat model |
| [10](10-migration-design.md) | Migration Design | Excel import strategy, validation, duplicates, rollback |
| [11](11-roadmap-phase-1.md) | Roadmap Phase 1 | Foundation & core registry (6–8 months) |
| [12](12-roadmap-phase-2.md) | Roadmap Phase 2 | Operations maturity & integration (4–6 months) |
| [13](13-roadmap-phase-3.md) | Roadmap Phase 3 | National ecosystem & intelligence (6–8 months) |

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Application-first, elevator-on-approval | Core business rule; prevents unauthorized registry entries |
| Modular monolith | Government ops simplicity; ACID workflows; extractable later |
| Directorate-managed installer/OMI | Prevents unauthorized company impersonation |
| QKB validation for maintenance | Ensures only legitimate businesses provide maintenance |
| PENDING_CONFIRMATION for imports | Legacy data requires human validation before activation |
| Append-only audit log | Government accountability and regulatory compliance |
| Document storage abstraction | Cloud-agnostic; works on-premise with MinIO |
| Custom workflow engine | Albanian legal workflows are specific; no BPM overhead |

## Approval Checklist

Before implementation begins, stakeholders should review and approve:

- [ ] Core business rule: applications before elevators
- [ ] User types and access matrix
- [ ] Registration workflow (multi-party)
- [ ] Deregistration, correction, and update workflows
- [ ] Database schema and entity relationships
- [ ] Security model and audit requirements
- [ ] Excel migration strategy
- [ ] Phase 1 scope and timeline
- [ ] Technology stack confirmation
- [ ] Integration roadmap (Phase 2/3)

## Next Steps After Approval

1. Initialize Next.js project with approved stack
2. Implement Prisma schema from database design
3. Set up Docker Compose development environment
4. Begin Sprint 1: Infrastructure & Identity
5. Schedule weekly architecture review sessions during Phase 1
